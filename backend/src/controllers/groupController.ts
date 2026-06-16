import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getCurrentGroup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const membership = await prisma.groupMember.findFirst({
      where: { userId: req.userId, status: 'active' },
      include: { group: true },
    });
    if (!membership) {
      res.status(404).json({ error: 'Nenhum grupo encontrado' });
      return;
    }
    res.json(membership.group);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar grupo' });
  }
}

export async function getMembers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const membership = await prisma.groupMember.findFirst({
      where: { userId: req.userId, status: 'active' },
    });
    if (!membership) {
      res.status(403).json({ error: 'Sem acesso ao grupo' });
      return;
    }
    const members = await prisma.groupMember.findMany({
      where: { groupId: membership.groupId, status: 'active' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json(members);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar membros' });
  }
}

export async function createGroup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, defaultCurrency } = req.body;
    const group = await prisma.group.create({
      data: {
        name,
        defaultCurrency: defaultCurrency || 'EUR',
        createdByUserId: req.userId!,
        members: { create: { userId: req.userId!, role: 'admin' } },
      },
    });
    res.status(201).json(group);
  } catch {
    res.status(500).json({ error: 'Erro ao criar grupo' });
  }
}

export async function inviteMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const membership = await prisma.groupMember.findFirst({
      where: { userId: req.userId, role: 'admin', status: 'active' },
    });
    if (!membership) {
      res.status(403).json({ error: 'Somente administradores podem convidar membros' });
      return;
    }
    const { email, role } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }
    const member = await prisma.groupMember.create({
      data: { groupId: membership.groupId, userId: user.id, role: role || 'member' },
    });
    res.status(201).json(member);
  } catch {
    res.status(500).json({ error: 'Erro ao convidar membro' });
  }
}
