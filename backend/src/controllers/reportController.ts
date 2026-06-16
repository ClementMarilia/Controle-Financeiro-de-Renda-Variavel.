import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

function getMonthRange(month: string) {
  const [year, m] = month.split('-');
  return {
    start: new Date(parseInt(year), parseInt(m) - 1, 1),
    end: new Date(parseInt(year), parseInt(m), 1),
  };
}

export async function getPrivateMonthlyReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const month = (req.query.month as string) || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const { start, end } = getMonthRange(month);

    const [incomeAgg, expenseAgg, transactions, accounts] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ownerUserId: req.userId, visibility: 'private', type: 'income', date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ownerUserId: req.userId, visibility: 'private', type: 'expense', date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: { ownerUserId: req.userId, visibility: 'private', date: { gte: start, lt: end } },
        include: { category: true, account: { select: { id: true, name: true } } },
        orderBy: { amount: 'desc' },
      }),
      prisma.account.findMany({
        where: { ownerUserId: req.userId, visibility: 'private', isActive: true },
      }),
    ]);

    const income = Number(incomeAgg._sum.amount || 0);
    const expenses = Number(expenseAgg._sum.amount || 0);
    const result = income - expenses;

    const categoryBreakdown = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc: Record<string, { name: string; amount: number }>, t) => {
        const key = t.categoryId || 'sem-categoria';
        const name = t.category?.name || 'Sem categoria';
        if (!acc[key]) acc[key] = { name, amount: 0 };
        acc[key].amount += Number(t.amount);
        return acc;
      }, {});

    res.json({
      month,
      income,
      expenses,
      result,
      savingsPercentage: income > 0 ? (result / income) * 100 : 0,
      status: result > 0 ? 'surplus' : result < 0 ? 'deficit' : 'balanced',
      topExpenses: transactions.filter((t) => t.type === 'expense').slice(0, 10),
      categoryBreakdown: Object.values(categoryBreakdown).sort((a, b) => b.amount - a.amount),
      accountsCount: accounts.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
}

export async function getSharedMonthlyReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const membership = await prisma.groupMember.findFirst({ where: { userId: req.userId, status: 'active' } });
    if (!membership) { res.json({ total: 0, expenses: [] }); return; }

    const month = (req.query.month as string) || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const { start, end } = getMonthRange(month);

    const expenses = await prisma.sharedExpense.findMany({
      where: { groupId: membership.groupId, date: { gte: start, lt: end } },
      include: {
        paidBy: { select: { id: true, name: true } },
        participants: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { date: 'desc' },
    });

    const total = expenses.reduce((sum, e) => sum + Number(e.sharedAmount), 0);

    const personSummary = new Map<string, { userId: string; name: string; paid: number; due: number; balance: number }>();
    for (const e of expenses) {
      for (const p of e.participants) {
        const existing = personSummary.get(p.userId) || { userId: p.userId, name: p.user.name, paid: 0, due: 0, balance: 0 };
        existing.paid += Number(p.amountPaid);
        existing.due += Number(p.amountDue);
        existing.balance += Number(p.balance);
        personSummary.set(p.userId, existing);
      }
    }

    res.json({
      month,
      total,
      expensesCount: expenses.length,
      expenses,
      personSummary: Array.from(personSummary.values()),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao gerar relatório compartilhado' });
  }
}

export async function getPrivateYearlyReport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const year = parseInt((req.query.year as string) || String(new Date().getFullYear()));
    const months = [];
    for (let m = 0; m < 12; m++) {
      const start = new Date(year, m, 1);
      const end = new Date(year, m + 1, 1);
      const [inc, exp] = await Promise.all([
        prisma.transaction.aggregate({
          where: { ownerUserId: req.userId, visibility: 'private', type: 'income', date: { gte: start, lt: end } },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: { ownerUserId: req.userId, visibility: 'private', type: 'expense', date: { gte: start, lt: end } },
          _sum: { amount: true },
        }),
      ]);
      months.push({
        month: `${year}-${String(m + 1).padStart(2, '0')}`,
        income: Number(inc._sum.amount || 0),
        expenses: Number(exp._sum.amount || 0),
        result: Number(inc._sum.amount || 0) - Number(exp._sum.amount || 0),
      });
    }
    res.json({ year, months });
  } catch {
    res.status(500).json({ error: 'Erro ao gerar relatório anual' });
  }
}
