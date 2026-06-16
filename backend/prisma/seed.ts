import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');

  // Users
  const passwordHash = await bcrypt.hash('senha123', 12);

  const marilia = await prisma.user.upsert({
    where: { email: 'marilia@casa.com' },
    update: {},
    create: { name: 'Marilia', email: 'marilia@casa.com', passwordHash, defaultCurrency: 'EUR', language: 'pt-BR' },
  });

  const wendy = await prisma.user.upsert({
    where: { email: 'wendy@casa.com' },
    update: {},
    create: { name: 'Wendy', email: 'wendy@casa.com', passwordHash, defaultCurrency: 'EUR', language: 'pt-BR' },
  });

  const nathalia = await prisma.user.upsert({
    where: { email: 'nathalia@casa.com' },
    update: {},
    create: { name: 'Nathalia', email: 'nathalia@casa.com', passwordHash, defaultCurrency: 'EUR', language: 'pt-BR' },
  });

  console.log('Usuárias criadas:', marilia.name, wendy.name, nathalia.name);

  // Group
  let group = await prisma.group.findFirst({ where: { name: 'Casa' } });
  if (!group) {
    group = await prisma.group.create({
      data: {
        name: 'Casa',
        defaultCurrency: 'EUR',
        createdByUserId: marilia.id,
        members: {
          create: [
            { userId: marilia.id, role: 'admin' },
            { userId: wendy.id, role: 'member' },
            { userId: nathalia.id, role: 'member' },
          ],
        },
      },
    });
  }
  console.log('Grupo criado:', group.name);

  // Personal categories for each user
  const personalCategoryGroups = [
    { name: 'Necessidades', items: ['Aluguel', 'Mercado', 'Água', 'Energia', 'Gás', 'Internet', 'Telefone', 'Transporte', 'Saúde', 'Farmácia'], percentageGroup: 'necessidades', percentage: 50, type: 'expense' },
    { name: 'Qualidade de Vida', items: ['Restaurante', 'Lazer', 'Streaming', 'Compras pessoais', 'Beleza', 'Academia', 'Presentes', 'Passeios'], percentageGroup: 'qualidade_vida', percentage: 20, type: 'expense' },
    { name: 'Reserva', items: ['Reserva de emergência', 'Caixa de segurança', 'Fundo de oportunidade'], percentageGroup: 'reserva', percentage: 10, type: 'expense' },
    { name: 'Investimentos', items: ['ETF', 'Ações', 'Cripto', 'Renda fixa', 'Poupança', 'Aportes'], percentageGroup: 'investimentos', percentage: 10, type: 'expense' },
    { name: 'Objetivos', items: ['Viagem', 'Curso', 'Equipamento', 'Casa', 'Mudança', 'Projeto pessoal'], percentageGroup: 'objetivos', percentage: 10, type: 'expense' },
    { name: 'Receitas', items: ['Salário', 'Freelance', 'Renda variável', 'Dividendos', 'Reembolso', 'Outros'], percentageGroup: null, percentage: null, type: 'income' },
  ];

  for (const user of [marilia, wendy, nathalia]) {
    for (const group_cat of personalCategoryGroups) {
      for (const itemName of group_cat.items) {
        const existing = await prisma.category.findFirst({
          where: { name: itemName, ownerUserId: user.id },
        });
        if (!existing) {
          await prisma.category.create({
            data: {
              name: itemName,
              type: group_cat.type,
              percentageGroup: group_cat.percentageGroup,
              defaultPercentage: group_cat.percentage,
              visibility: 'private',
              ownerUserId: user.id,
              isActive: true,
            },
          });
        }
      }
    }
  }
  console.log('Categorias pessoais criadas');

  // Shared categories for group Casa
  const sharedCategories = [
    'Mercado da casa', 'Aluguel compartilhado', 'Contas da casa',
    'Produtos de limpeza', 'Transporte compartilhado', 'Manutenção',
    'Compras para casa', 'Outros compartilhados',
  ];

  for (const catName of sharedCategories) {
    const existing = await prisma.category.findFirst({ where: { name: catName, groupId: group.id } });
    if (!existing) {
      await prisma.category.create({
        data: { name: catName, type: 'expense', visibility: 'shared', groupId: group.id, isActive: true },
      });
    }
  }
  console.log('Categorias compartilhadas criadas');

  // Private accounts for each user
  const accountTypes = [
    { name: 'Conta Corrente', type: 'checking', initialBalance: 1000 },
    { name: 'Revolut', type: 'revolut', initialBalance: 500 },
    { name: 'Dinheiro', type: 'cash', initialBalance: 200 },
    { name: 'Cartão de Crédito', type: 'credit_card', initialBalance: 0 },
    { name: 'Poupança', type: 'savings', initialBalance: 2000 },
    { name: 'Investimentos', type: 'investment', initialBalance: 5000 },
  ];

  const marilaAccounts: Record<string, string> = {};
  const wendyAccounts: Record<string, string> = {};
  const nathaliaAccounts: Record<string, string> = {};

  for (const user of [marilia, wendy, nathalia]) {
    const accountMap: Record<string, string> = user.id === marilia.id ? marilaAccounts : user.id === wendy.id ? wendyAccounts : nathaliaAccounts;
    for (const acc of accountTypes) {
      const existing = await prisma.account.findFirst({ where: { ownerUserId: user.id, name: acc.name } });
      if (!existing) {
        const created = await prisma.account.create({
          data: {
            name: acc.name,
            type: acc.type,
            initialBalance: acc.initialBalance,
            currency: 'EUR',
            visibility: 'private',
            ownerUserId: user.id,
            includeInNetWorth: true,
            isActive: true,
          },
        });
        accountMap[acc.name] = created.id;
      } else {
        accountMap[acc.name] = existing.id;
      }
    }
  }
  console.log('Contas privadas criadas');

  // Mandatory example: Mercado = 222€
  // Wendy paid 168€, Nathalia paid 54€, Marilia paid 0€
  // Equal split: 74€ each
  const existingMercado = await prisma.sharedExpense.findFirst({ where: { description: 'Mercado', groupId: group.id } });
  if (!existingMercado) {
    const now = new Date();
    const expenseDate = new Date(now.getFullYear(), now.getMonth(), 15);

    // Create shared expense with multiple payers - we'll model as one expense paid by Wendy (primary payer)
    // and record participant payments accordingly
    await prisma.sharedExpense.create({
      data: {
        groupId: group.id,
        paidByUserId: wendy.id,
        totalAmount: 222,
        sharedAmount: 222,
        splitMethod: 'equal',
        date: expenseDate,
        description: 'Mercado',
        status: 'open',
        participants: {
          create: [
            {
              userId: marilia.id,
              amountDue: 74,
              amountPaid: 0,
              balance: -74,
            },
            {
              userId: wendy.id,
              amountDue: 74,
              amountPaid: 168,
              balance: 94,
            },
            {
              userId: nathalia.id,
              amountDue: 74,
              amountPaid: 54,
              balance: -20,
            },
          ],
        },
      },
    });

    // Create corresponding settlements
    const refMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await prisma.settlement.createMany({
      data: [
        {
          groupId: group.id,
          fromUserId: marilia.id,
          toUserId: wendy.id,
          amount: 74,
          referenceMonth: refMonth,
          status: 'pending',
        },
        {
          groupId: group.id,
          fromUserId: nathalia.id,
          toUserId: wendy.id,
          amount: 20,
          referenceMonth: refMonth,
          status: 'pending',
        },
      ],
    });

    console.log('Exemplo de despesa compartilhada (Mercado €222) criado');
    console.log('  Marilia deve €74 para Wendy');
    console.log('  Nathalia deve €20 para Wendy');
    console.log('  Wendy recebe €94 no total');
  }

  // Sample personal transactions for Marilia
  const marilaCurrentAccount = marilaAccounts['Conta Corrente'];
  if (marilaCurrentAccount) {
    const now = new Date();
    const incomeCategory = await prisma.category.findFirst({ where: { ownerUserId: marilia.id, name: 'Salário' } });
    const expenseCategory = await prisma.category.findFirst({ where: { ownerUserId: marilia.id, name: 'Mercado', percentageGroup: 'necessidades' } });

    const existingIncome = await prisma.transaction.findFirst({ where: { ownerUserId: marilia.id, description: 'Salário Junho' } });
    if (!existingIncome) {
      await prisma.transaction.create({
        data: {
          ownerUserId: marilia.id,
          accountId: marilaCurrentAccount,
          date: new Date(now.getFullYear(), now.getMonth(), 1),
          type: 'income',
          categoryId: incomeCategory?.id,
          description: 'Salário Junho',
          amount: 2500,
          currency: 'EUR',
          visibility: 'private',
          isShared: false,
        },
      });

      await prisma.transaction.create({
        data: {
          ownerUserId: marilia.id,
          accountId: marilaCurrentAccount,
          date: new Date(now.getFullYear(), now.getMonth(), 5),
          type: 'expense',
          categoryId: expenseCategory?.id,
          description: 'Supermercado pessoal',
          amount: 85,
          currency: 'EUR',
          visibility: 'private',
          isShared: false,
        },
      });
    }
  }

  console.log('Seed concluído com sucesso!');
  console.log('\nCredenciais de acesso:');
  console.log('  Marilia: marilia@casa.com / senha123');
  console.log('  Wendy:   wendy@casa.com / senha123');
  console.log('  Nathalia: nathalia@casa.com / senha123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
