import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { Decimal } from '@prisma/client/runtime/library';

async function computeBalance(accountId: string): Promise<number> {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) return 0;

  const [income, expense, transferIn, transferOut] = await Promise.all([
    prisma.transaction.aggregate({
      where: { accountId, type: 'income' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { accountId, type: 'expense' },
      _sum: { amount: true },
    }),
    prisma.transfer.aggregate({
      where: { toAccountId: accountId },
      _sum: { amount: true },
    }),
    prisma.transfer.aggregate({
      where: { fromAccountId: accountId },
      _sum: { amount: true },
    }),
  ]);

  const initial = Number(account.initialBalance);
  const inc = Number(income._sum.amount || 0);
  const exp = Number(expense._sum.amount || 0);
  const tin = Number(transferIn._sum.amount || 0);
  const tout = Number(transferOut._sum.amount || 0);
  return initial + inc - exp + tin - tout;
}

export async function getPrivateAccounts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const accounts = await prisma.account.findMany({
      where: { ownerUserId: req.userId, visibility: 'private', isActive: true },
      orderBy: { name: 'asc' },
    });
    const withBalance = await Promise.all(
      accounts.map(async (a) => ({ ...a, currentBalance: await computeBalance(a.id) }))
    );
    res.json(withBalance);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar contas' });
  }
}

export async function getSharedAccounts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const membership = await prisma.groupMember.findFirst({
      where: { userId: req.userId, status: 'active' },
    });
    if (!membership) { res.json([]); return; }

    const accounts = await prisma.account.findMany({
      where: { groupId: membership.groupId, visibility: 'shared', isActive: true },
      orderBy: { name: 'asc' },
    });
    const withBalance = await Promise.all(
      accounts.map(async (a) => ({ ...a, currentBalance: await computeBalance(a.id) }))
    );
    res.json(withBalance);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar contas compartilhadas' });
  }
}

export async function createAccount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, type, initialBalance, currency, color, includeInNetWorth, visibility } = req.body;
    const membership = await prisma.groupMember.findFirst({ where: { userId: req.userId, status: 'active' } });

    const account = await prisma.account.create({
      data: {
        name,
        type,
        initialBalance: initialBalance || 0,
        currency: currency || 'EUR',
        color,
        includeInNetWorth: includeInNetWorth !== false,
        visibility: visibility || 'private',
        ownerUserId: visibility !== 'shared' ? req.userId : null,
        groupId: visibility === 'shared' && membership ? membership.groupId : null,
      },
    });
    res.status(201).json({ ...account, currentBalance: Number(account.initialBalance) });
  } catch {
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
}

export async function updateAccount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const account = await prisma.account.findFirst({ where: { id, ownerUserId: req.userId } });
    if (!account) { res.status(404).json({ error: 'Conta não encontrada' }); return; }

    const updated = await prisma.account.update({
      where: { id },
      data: req.body,
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar conta' });
  }
}

export async function deleteAccount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const account = await prisma.account.findFirst({ where: { id, ownerUserId: req.userId } });
    if (!account) { res.status(404).json({ error: 'Conta não encontrada' }); return; }

    await prisma.account.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Conta desativada com sucesso' });
  } catch {
    res.status(500).json({ error: 'Erro ao deletar conta' });
  }
}
