import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getTransfers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const transfers = await prisma.transfer.findMany({
      where: { ownerUserId: req.userId },
      include: {
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: 50,
    });
    res.json(transfers);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar transferências' });
  }
}

export async function createTransfer(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { fromAccountId, toAccountId, amount, date, description } = req.body;

    const [from, to] = await Promise.all([
      prisma.account.findFirst({ where: { id: fromAccountId, ownerUserId: req.userId } }),
      prisma.account.findUnique({ where: { id: toAccountId } }),
    ]);

    if (!from) { res.status(403).json({ error: 'Conta de origem não encontrada ou sem permissão' }); return; }
    if (!to) { res.status(404).json({ error: 'Conta de destino não encontrada' }); return; }

    const transfer = await prisma.transfer.create({
      data: {
        fromAccountId,
        toAccountId,
        amount,
        date: new Date(date),
        description,
        ownerUserId: req.userId!,
      },
      include: {
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(transfer);
  } catch {
    res.status(500).json({ error: 'Erro ao criar transferência' });
  }
}

export async function deleteTransfer(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const transfer = await prisma.transfer.findFirst({ where: { id, ownerUserId: req.userId } });
    if (!transfer) { res.status(404).json({ error: 'Transferência não encontrada' }); return; }
    await prisma.transfer.delete({ where: { id } });
    res.json({ message: 'Transferência excluída' });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir transferência' });
  }
}
