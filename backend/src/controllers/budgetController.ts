import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

const BUDGET_GROUPS = [
  { key: 'necessidades', label: 'Necessidades', percentage: 0.5 },
  { key: 'qualidade_vida', label: 'Qualidade de Vida', percentage: 0.2 },
  { key: 'reserva', label: 'Reserva', percentage: 0.1 },
  { key: 'investimentos', label: 'Investimentos', percentage: 0.1 },
  { key: 'objetivos', label: 'Objetivos', percentage: 0.1 },
];

export async function getPrivateBudget(req: AuthRequest, res: Response): Promise<void> {
  try {
    const month = (req.params.month as string) || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const [year, m] = month.split('-');
    const start = new Date(parseInt(year), parseInt(m) - 1, 1);
    const end = new Date(parseInt(year), parseInt(m), 1);

    const incomeAgg = await prisma.transaction.aggregate({
      where: { ownerUserId: req.userId, visibility: 'private', type: 'income', date: { gte: start, lt: end } },
      _sum: { amount: true },
    });
    const income = Number(incomeAgg._sum.amount || 0);

    const comparison = await Promise.all(
      BUDGET_GROUPS.map(async (group) => {
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
          key: group.key,
          label: group.label,
          percentage: group.percentage * 100,
          target,
          actual,
          difference: target - actual,
          percentageUsed: target > 0 ? (actual / target) * 100 : 0,
          status: actual <= target ? 'ok' : 'over',
        };
      })
    );

    res.json({ month, income, comparison, totalExpenses: comparison.reduce((s, c) => s + c.actual, 0) });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar orçamento' });
  }
}
