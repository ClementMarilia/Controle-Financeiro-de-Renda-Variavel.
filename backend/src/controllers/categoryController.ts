import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export async function getCategories(req: AuthRequest, res: Response): Promise<void> {
  try {
    const membership = await prisma.groupMember.findFirst({ where: { userId: req.userId, status: 'active' } });
    const groupId = membership?.groupId;

    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { ownerUserId: req.userId },
          ...(groupId ? [{ groupId }] : []),
        ],
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
}

export async function createCategory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, type, visibility, color, icon, percentageGroup } = req.body;
    const membership = await prisma.groupMember.findFirst({ where: { userId: req.userId, status: 'active' } });

    const category = await prisma.category.create({
      data: {
        name,
        type,
        visibility: visibility || 'private',
        color,
        icon,
        percentageGroup,
        ownerUserId: visibility !== 'shared' ? req.userId : null,
        groupId: visibility === 'shared' && membership ? membership.groupId : null,
      },
    });
    res.status(201).json(category);
  } catch {
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
}

export async function updateCategory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const category = await prisma.category.findFirst({ where: { id, ownerUserId: req.userId } });
    if (!category) { res.status(404).json({ error: 'Categoria não encontrada' }); return; }

    const updated = await prisma.category.update({ where: { id }, data: req.body });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
}

export async function deleteCategory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const category = await prisma.category.findFirst({ where: { id, ownerUserId: req.userId } });
    if (!category) { res.status(404).json({ error: 'Categoria não encontrada' }); return; }

    await prisma.category.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Categoria desativada' });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
}
