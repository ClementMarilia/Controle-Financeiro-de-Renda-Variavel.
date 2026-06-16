import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

async function getUserGroup(userId: string) {
  return prisma.groupMember.findFirst({ where: { userId, status: 'active' } });
}

export async function getSharedExpenses(req: AuthRequest, res: Response): Promise<void> {
  try {
    const membership = await getUserGroup(req.userId!);
    if (!membership) { res.json([]); return; }

    const { month } = req.query as Record<string, string>;
    const where: any = { groupId: membership.groupId };
    if (month) {
      const [year, m] = month.split('-');
      const start = new Date(parseInt(year), parseInt(m) - 1, 1);
      const end = new Date(parseInt(year), parseInt(m), 1);
      where.date = { gte: start, lt: end };
    }

    const expenses = await prisma.sharedExpense.findMany({
      where,
      include: {
        paidBy: { select: { id: true, name: true } },
        participants: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { date: 'desc' },
    });
    res.json(expenses);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar despesas compartilhadas' });
  }
}

export async function createSharedExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    const membership = await getUserGroup(req.userId!);
    if (!membership) { res.status(403).json({ error: 'Sem acesso ao grupo' }); return; }

    const { description, totalAmount, sharedAmount, splitMethod, date, participantIds, participantAmounts } = req.body;

    const shared = sharedAmount || totalAmount;
    const participants = participantIds as string[];
    const numParticipants = participants.length;

    const expense = await prisma.sharedExpense.create({
      data: {
        groupId: membership.groupId,
        paidByUserId: req.userId!,
        totalAmount,
        sharedAmount: shared,
        splitMethod: splitMethod || 'equal',
        date: new Date(date),
        description,
        participants: {
          create: participants.map((userId: string) => {
            let amountDue: number;
            if (splitMethod === 'equal') {
              amountDue = Number(shared) / numParticipants;
            } else if (splitMethod === 'fixed_amount' && participantAmounts) {
              amountDue = participantAmounts[userId] || 0;
            } else {
              amountDue = Number(shared) / numParticipants;
            }
            const amountPaid = userId === req.userId ? Number(totalAmount) : 0;
            const balance = amountPaid - amountDue;
            return { userId, amountDue, amountPaid, balance };
          }),
        },
      },
      include: {
        paidBy: { select: { id: true, name: true } },
        participants: { include: { user: { select: { id: true, name: true } } } },
      },
    });
    res.status(201).json(expense);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar despesa compartilhada' });
  }
}

export async function updateSharedExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const membership = await getUserGroup(req.userId!);
    if (!membership) { res.status(403).json({ error: 'Sem acesso ao grupo' }); return; }

    const expense = await prisma.sharedExpense.findFirst({
      where: { id, groupId: membership.groupId },
    });
    if (!expense) { res.status(404).json({ error: 'Despesa não encontrada' }); return; }

    const updated = await prisma.sharedExpense.update({
      where: { id },
      data: { description: req.body.description, status: req.body.status },
      include: {
        paidBy: { select: { id: true, name: true } },
        participants: { include: { user: { select: { id: true, name: true } } } },
      },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar despesa' });
  }
}

export async function deleteSharedExpense(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const membership = await getUserGroup(req.userId!);
    if (!membership) { res.status(403).json({ error: 'Sem acesso ao grupo' }); return; }

    const expense = await prisma.sharedExpense.findFirst({
      where: { id, groupId: membership.groupId },
    });
    if (!expense) { res.status(404).json({ error: 'Despesa não encontrada' }); return; }

    await prisma.sharedExpense.delete({ where: { id } });
    res.json({ message: 'Despesa excluída com sucesso' });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir despesa' });
  }
}

export async function getSettlementSuggestions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const membership = await getUserGroup(req.userId!);
    if (!membership) { res.json([]); return; }

    const { month } = req.query as Record<string, string>;
    const where: any = { groupId: membership.groupId };
    if (month) {
      const [year, m] = month.split('-');
      const start = new Date(parseInt(year), parseInt(m) - 1, 1);
      const end = new Date(parseInt(year), parseInt(m), 1);
      where.date = { gte: start, lt: end };
    }

    const expenses = await prisma.sharedExpense.findMany({
      where,
      include: { participants: { include: { user: { select: { id: true, name: true } } } } },
    });

    // Calculate net balance per user
    const balances: Map<string, { userId: string; name: string; balance: number }> = new Map();
    for (const expense of expenses) {
      for (const p of expense.participants) {
        const existing = balances.get(p.userId) || { userId: p.userId, name: p.user.name, balance: 0 };
        existing.balance += Number(p.balance);
        balances.set(p.userId, existing);
      }
    }

    // Minimum transactions settlement algorithm
    const people = Array.from(balances.values());
    const creditors = people.filter((p) => p.balance > 0.01).sort((a, b) => b.balance - a.balance);
    const debtors = people.filter((p) => p.balance < -0.01).sort((a, b) => a.balance - b.balance);

    const suggestions: Array<{ fromUserId: string; fromName: string; toUserId: string; toName: string; amount: number }> = [];

    let ci = 0, di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const creditor = creditors[ci];
      const debtor = debtors[di];
      const amount = Math.min(creditor.balance, Math.abs(debtor.balance));
      suggestions.push({
        fromUserId: debtor.userId,
        fromName: debtor.name,
        toUserId: creditor.userId,
        toName: creditor.name,
        amount: Math.round(amount * 100) / 100,
      });
      creditor.balance -= amount;
      debtor.balance += amount;
      if (Math.abs(creditor.balance) < 0.01) ci++;
      if (Math.abs(debtor.balance) < 0.01) di++;
    }

    res.json({ suggestions, balances: Array.from(balances.values()) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao calcular acertos' });
  }
}
