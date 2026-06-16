import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getGoals(req: AuthRequest, res: Response): Promise<void> {
  try {
    const goals = await prisma.goal.findMany({
      where: { ownerUserId: req.userId, visibility: 'private', status: 'active' },
      orderBy: { priority: 'asc' },
    });
    const now = new Date();
    const withCalcs = goals.map((g) => {
      const target = Number(g.targetAmount);
      const current = Number(g.currentAmount);
      const missing = target - current;
      const percentage = target > 0 ? (current / target) * 100 : 0;
      let monthlyNeeded = 0;
      if (g.targetDate) {
        const months = Math.max(1, Math.round((new Date(g.targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        monthlyNeeded = missing / months;
      }
      return { ...g, missingAmount: missing, percentageCompleted: percentage, monthlyNeeded };
    });
    res.json(withCalcs);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar metas' });
  }
}

export async function createGoal(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, targetAmount, currentAmount, targetDate, category, priority, visibility } = req.body;
    const membership = visibility === 'shared' ? await prisma.groupMember.findFirst({ where: { userId: req.userId, status: 'active' } }) : null;
    const goal = await prisma.goal.create({
      data: {
        name, targetAmount, currentAmount: currentAmount || 0,
        targetDate: targetDate ? new Date(targetDate) : null,
        category, priority: priority || 1,
        visibility: visibility || 'private',
        ownerUserId: visibility !== 'shared' ? req.userId : null,
        groupId: visibility === 'shared' && membership ? membership.groupId : null,
      },
    });
    res.status(201).json(goal);
  } catch {
    res.status(500).json({ error: 'Erro ao criar meta' });
  }
}

export async function updateGoal(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const goal = await prisma.goal.findFirst({ where: { id, ownerUserId: req.userId } });
    if (!goal) { res.status(404).json({ error: 'Meta não encontrada' }); return; }
    const updated = await prisma.goal.update({ where: { id }, data: { ...req.body, targetDate: req.body.targetDate ? new Date(req.body.targetDate) : undefined } });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar meta' });
  }
}

export async function deleteGoal(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const goal = await prisma.goal.findFirst({ where: { id, ownerUserId: req.userId } });
    if (!goal) { res.status(404).json({ error: 'Meta não encontrada' }); return; }
    await prisma.goal.update({ where: { id }, data: { status: 'archived' } });
    res.json({ message: 'Meta arquivada' });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir meta' });
  }
}
