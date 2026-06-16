import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getPrivateTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { month, categoryId, type, page = '1', limit = '50' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { ownerUserId: req.userId, visibility: 'private' };
    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (month) {
      const [year, m] = month.split('-');
      const start = new Date(parseInt(year), parseInt(m) - 1, 1);
      const end = new Date(parseInt(year), parseInt(m), 1);
      where.date = { gte: start, lt: end };
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true, account: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.transaction.count({ where }),
    ]);
    res.json({ transactions, total, page: parseInt(page), limit: parseInt(limit) });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar lançamentos' });
  }
}

export async function getSharedTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const membership = await prisma.groupMember.findFirst({ where: { userId: req.userId, status: 'active' } });
    if (!membership) { res.json({ transactions: [], total: 0 }); return; }

    const { month } = req.query as Record<string, string>;
    const where: any = { groupId: membership.groupId, visibility: 'shared' };
    if (month) {
      const [year, m] = month.split('-');
      const start = new Date(parseInt(year), parseInt(m) - 1, 1);
      const end = new Date(parseInt(year), parseInt(m), 1);
      where.date = { gte: start, lt: end };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        account: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
    res.json({ transactions, total: transactions.length });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar lançamentos compartilhados' });
  }
}

export async function createTransaction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      accountId, date, type, categoryId, description, amount,
      currency, visibility, isShared, sharedAmount, personalAmount,
      notes, groupId,
    } = req.body;

    const account = await prisma.account.findFirst({
      where: { id: accountId, ownerUserId: req.userId },
    });
    if (!account) {
      res.status(403).json({ error: 'Conta não encontrada ou sem permissão' });
      return;
    }

    let resolvedGroupId = groupId;
    if (isShared && !resolvedGroupId) {
      const membership = await prisma.groupMember.findFirst({ where: { userId: req.userId, status: 'active' } });
      resolvedGroupId = membership?.groupId;
    }

    const transaction = await prisma.transaction.create({
      data: {
        ownerUserId: req.userId!,
        accountId,
        date: new Date(date),
        type,
        categoryId,
        description,
        amount,
        currency: currency || 'EUR',
        visibility: visibility || 'private',
        isShared: isShared || false,
        paidByUserId: req.userId,
        sharedAmount: sharedAmount || null,
        personalAmount: personalAmount || null,
        notes,
        groupId: resolvedGroupId || null,
      },
      include: { category: true, account: { select: { id: true, name: true } } },
    });
    res.status(201).json(transaction);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar lançamento' });
  }
}

export async function updateTransaction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const tx = await prisma.transaction.findFirst({ where: { id, ownerUserId: req.userId } });
    if (!tx) { res.status(404).json({ error: 'Lançamento não encontrado' }); return; }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
      },
      include: { category: true, account: { select: { id: true, name: true } } },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar lançamento' });
  }
}

export async function deleteTransaction(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const tx = await prisma.transaction.findFirst({ where: { id, ownerUserId: req.userId } });
    if (!tx) { res.status(404).json({ error: 'Lançamento não encontrado' }); return; }

    await prisma.transaction.delete({ where: { id } });
    res.json({ message: 'Lançamento excluído com sucesso' });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir lançamento' });
  }
}
