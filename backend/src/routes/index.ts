import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { register, login, me, updateMe } from '../controllers/authController';
import { getCurrentGroup, getMembers, createGroup, inviteMember } from '../controllers/groupController';
import { getPrivateAccounts, getSharedAccounts, createAccount, updateAccount, deleteAccount } from '../controllers/accountController';
import { getPrivateTransactions, getSharedTransactions, createTransaction, updateTransaction, deleteTransaction } from '../controllers/transactionController';
import { getSharedExpenses, createSharedExpense, updateSharedExpense, deleteSharedExpense, getSettlementSuggestions } from '../controllers/sharedExpenseController';
import { getSettlements, markSettlementPaid, createSettlement } from '../controllers/settlementController';
import { getPrivateDashboard, getSharedDashboard } from '../controllers/dashboardController';
import { getPrivateMonthlyReport, getSharedMonthlyReport, getPrivateYearlyReport } from '../controllers/reportController';
import { getPrivateBudget } from '../controllers/budgetController';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../controllers/goalController';
import { getDebts, createDebt, updateDebt, deleteDebt } from '../controllers/debtController';
import { getTransfers, createTransfer, deleteTransfer } from '../controllers/transferController';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';

const router = Router();

// Auth
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authenticate, me);
router.put('/auth/me', authenticate, updateMe);

// Groups
router.get('/groups/current', authenticate, getCurrentGroup);
router.get('/groups/members', authenticate, getMembers);
router.post('/groups', authenticate, createGroup);
router.post('/groups/invite', authenticate, inviteMember);

// Accounts
router.get('/accounts/private', authenticate, getPrivateAccounts);
router.get('/accounts/shared', authenticate, getSharedAccounts);
router.post('/accounts', authenticate, createAccount);
router.put('/accounts/:id', authenticate, updateAccount);
router.delete('/accounts/:id', authenticate, deleteAccount);

// Transactions
router.get('/transactions/private', authenticate, getPrivateTransactions);
router.get('/transactions/shared', authenticate, getSharedTransactions);
router.post('/transactions', authenticate, createTransaction);
router.put('/transactions/:id', authenticate, updateTransaction);
router.delete('/transactions/:id', authenticate, deleteTransaction);

// Shared Expenses
router.get('/shared-expenses', authenticate, getSharedExpenses);
router.post('/shared-expenses', authenticate, createSharedExpense);
router.put('/shared-expenses/:id', authenticate, updateSharedExpense);
router.delete('/shared-expenses/:id', authenticate, deleteSharedExpense);
router.get('/shared-expenses/settlements', authenticate, getSettlementSuggestions);

// Settlements
router.get('/settlements', authenticate, getSettlements);
router.post('/settlements', authenticate, createSettlement);
router.patch('/settlements/:id/mark-paid', authenticate, markSettlementPaid);

// Dashboard
router.get('/dashboard/private', authenticate, getPrivateDashboard);
router.get('/dashboard/shared', authenticate, getSharedDashboard);

// Reports
router.get('/reports/private/monthly', authenticate, getPrivateMonthlyReport);
router.get('/reports/private/yearly', authenticate, getPrivateYearlyReport);
router.get('/reports/shared/monthly', authenticate, getSharedMonthlyReport);

// Budget
router.get('/budgets/private/:month', authenticate, getPrivateBudget);

// Goals
router.get('/goals', authenticate, getGoals);
router.post('/goals', authenticate, createGoal);
router.put('/goals/:id', authenticate, updateGoal);
router.delete('/goals/:id', authenticate, deleteGoal);

// Debts
router.get('/debts', authenticate, getDebts);
router.post('/debts', authenticate, createDebt);
router.put('/debts/:id', authenticate, updateDebt);
router.delete('/debts/:id', authenticate, deleteDebt);

// Transfers
router.get('/transfers', authenticate, getTransfers);
router.post('/transfers', authenticate, createTransfer);
router.delete('/transfers/:id', authenticate, deleteTransfer);

// Categories
router.get('/categories', authenticate, getCategories);
router.post('/categories', authenticate, createCategory);
router.put('/categories/:id', authenticate, updateCategory);
router.delete('/categories/:id', authenticate, deleteCategory);

export default router;
