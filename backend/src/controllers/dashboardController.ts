import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

function getMonthRange(month?: string) {
  const now = new Date();
  const year = month ? parseInt(month.split('-')[0]) : now.getFullYear();
  const m = month ? parseInt(month.split('-')[1]) - 1 : now.getMonth();
  return {
    start: new Date(year, m, 1),
    end: new Date(year, m + 1, 1),
  };
}

export async function getPrivateDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { month } = req.query as Record<string, string>;
    const { start, end } = getMonthRange(month);

    const [incomeAgg, expenseAgg, accounts, recentTransactions] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ownerUserId: req.userId, visibility: 'private', type: 'income', date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ownerUserId: req.userId, visibility: 'private', type: 'expense', date: { gte: start, lt: end } },
        _sum: { amount: true },
      }),
      prisma.account.findMany({
        where: { ownerUserId: req.userId, visibility: 'private', isActive: true },
      }),
      prisma.transaction.findMany({
        where: { ownerUserId: req.userId, visibility: 'private', date: { gte: start, lt: end } },
        include: { category: true, account: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
        take: 10,
      }),
    ]);

    const income = Number(incomeAgg._sum.amount || 0);
    const expenses = Number(expenseAgg._sum.amount || 0);
    const result = income - expenses;

    // Budget 50/20/10/10/10
    const budgetGroups = [
      { key: 'necessidades', label: 'Necessidades', percentage: 0.5 },
      { key: 'qualidade_vida', label: 'Qualidade de Vida', percentage: 0.2 },
      { key: 'reserva', label: 'Reserva', percentage: 0.1 },
      { key: 'investimentos', label: 'Investimentos', percentage: 0.1 },
      { key: 'objetivos', label: 'Objetivos', percentage: 0.1 },
    ];

    const budgetComparison = await Promise.all(
      budgetGroups.map(async (group) => {
        const spent = await prisma.transaction.aggregate({
          where: {
            ownerUserId: req.userId,
            visibility: 'private',
            type: 'expense',
            date: { gte: start, lt: end },
            category: { percentageGroup: group.key },
          },
          _sum: { amount: true },
        });
        const actual = Number(spent._sum.amount || 0);
        const target = income * group.percentage;
        return {
          ...group,
          target,
          actual,
          difference: target - actual,
          percentageUsed: target > 0 ? (actual / target) * 100 : 0,
        };
      })
    );

    // Category breakdown
    const categoryBreakdown = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { ownerUserId: req.userId, visibility: 'private', type: 'expense', date: { gte: start, lt: end } },
      _sum: { amount: true },
    });

    const categoryDetails = await Promise.all(
      categoryBreakdown.map(async (c) => {
        const category = c.categoryId ? await prisma.category.findUnique({ where: { id: c.categoryId } }) : null;
        return { categoryId: c.categoryId, categoryName: category?.name || 'Sem categoria', amount: Number(c._sum.amount || 0) };
      })
    );

    res.json({
      month: month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      income,
      expenses,
      result,
      savingsPercentage: income > 0 ? (result / income) * 100 : 0,
      status: result > 0 ? 'surplus' : result < 0 ? 'deficit' : 'balanced',
      accountsCount: accounts.length,
      budgetComparison,
      categoryBreakdown: categoryDetails.sort((a, b) => b.amount - a.amount),
      recentTransactions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar dashboard' });
  }
}

export async function getSharedDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const membership = await prisma.groupMember.findFirst({ where: { userId: req.userId, status: 'active' } });
    if (!membership) { res.json({ total: 0, balances: [], settlements: [] }); return; }

    const { month } = req.query as Record<string, string>;
    const { start, end } = getMonthRange(month);

    const expenses = await prisma.sharedExpense.findMany({
      where: { groupId: membership.groupId, date: { gte: start, lt: end } },
      include: {
        paidBy: { select: { id: true, name: true } },
        participants: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    const total = expenses.reduce((sum, e) => sum + Number(e.sharedAmount), 0);

    // Per-person summary
    const personMap = new Map<string, { userId: string; name: string; totalPaid: number; totalDue: number; balance: number }>();
    for (const expense of expenses) {
      for (const p of expense.participants) {
        const existing = personMap.get(p.userId) || { userId: p.userId, name: p.user.name, totalPaid: 0, totalDue: 0, balance: 0 };
        existing.totalPaid += Number(p.amountPaid);
        existing.totalDue += Number(p.amountDue);
        existing.balance += Number(p.balance);
        personMap.set(p.userId, existing);
      }
    }

    const pendingSettlements = await prisma.settlement.findMany({
      where: { groupId: membership.groupId, status: 'pending' },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });

    res.json({
      month: month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      total,
      expensesCount: expenses.length,
      balances: Array.from(personMap.values()),
      pendingSettlements,
      recentExpenses: expenses.slice(0, 5),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar dashboard compartilhado' });
  }
}
