import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getDebts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const debts = await prisma.debt.findMany({
      where: { ownerUserId: req.userId, visibility: 'private', status: 'active' },
      orderBy: { dueDate: 'asc' },
    });
    const withCalcs = debts.map((d) => ({
      ...d,
      paidPercentage: Number(d.totalAmount) > 0 ? (Number(d.paidAmount) / Number(d.totalAmount)) * 100 : 0,
    }));
    res.json(withCalcs);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar dívidas' });
  }
}

export async function createDebt(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { description, totalAmount, totalInstallments, installmentAmount, interestRate, dueDate } = req.body;
    const debt = await prisma.debt.create({
      data: {
        description, totalAmount,
        paidAmount: 0,
        remainingAmount: totalAmount,
        totalInstallments: totalInstallments || null,
        paidInstallments: 0,
        remainingInstallments: totalInstallments || null,
        installmentAmount: installmentAmount || null,
        interestRate: interestRate || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        visibility: 'private',
        ownerUserId: req.userId,
      },
    });
    res.status(201).json(debt);
  } catch {
    res.status(500).json({ error: 'Erro ao criar dívida' });
  }
}

export async function updateDebt(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const debt = await prisma.debt.findFirst({ where: { id, ownerUserId: req.userId } });
    if (!debt) { res.status(404).json({ error: 'Dívida não encontrada' }); return; }
    const updated = await prisma.debt.update({
      where: { id },
      data: { ...req.body, dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar dívida' });
  }
}

export async function deleteDebt(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const debt = await prisma.debt.findFirst({ where: { id, ownerUserId: req.userId } });
    if (!debt) { res.status(404).json({ error: 'Dívida não encontrada' }); return; }
    await prisma.debt.update({ where: { id }, data: { status: 'paid' } });
    res.json({ message: 'Dívida marcada como paga' });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir dívida' });
  }
}
