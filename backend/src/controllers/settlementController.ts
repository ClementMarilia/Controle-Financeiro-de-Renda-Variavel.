import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getSettlements(req: AuthRequest, res: Response): Promise<void> {
  try {
    const membership = await prisma.groupMember.findFirst({ where: { userId: req.userId, status: 'active' } });
    if (!membership) { res.json([]); return; }

    const settlements = await prisma.settlement.findMany({
      where: { groupId: membership.groupId },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(settlements);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar acertos' });
  }
}

export async function markSettlementPaid(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const membership = await prisma.groupMember.findFirst({ where: { userId: req.userId, status: 'active' } });
    if (!membership) { res.status(403).json({ error: 'Sem acesso' }); return; }

    const settlement = await prisma.settlement.findFirst({ where: { id, groupId: membership.groupId } });
    if (!settlement) { res.status(404).json({ error: 'Acerto não encontrado' }); return; }

    const updated = await prisma.settlement.update({
      where: { id },
      data: { status: 'paid', paidAt: new Date() },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Erro ao marcar acerto como pago' });
  }
}

export async function createSettlement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const membership = await prisma.groupMember.findFirst({ where: { userId: req.userId, status: 'active' } });
    if (!membership) { res.status(403).json({ error: 'Sem acesso' }); return; }

    const { fromUserId, toUserId, amount, referenceMonth } = req.body;
    const settlement = await prisma.settlement.create({
      data: {
        groupId: membership.groupId,
        fromUserId,
        toUserId,
        amount,
        referenceMonth,
      },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(settlement);
  } catch {
    res.status(500).json({ error: 'Erro ao criar acerto' });
  }
}
