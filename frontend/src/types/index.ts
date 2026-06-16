export interface User {
  id: string;
  name: string;
  email: string;
  defaultCurrency: string;
  language: string;
  status?: string;
  createdAt?: string;
}

export interface Group {
  id: string;
  name: string;
  defaultCurrency: string;
  createdByUserId: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'admin' | 'member' | 'viewer';
  status: string;
  joinedAt: string;
  user: { id: string; name: string; email: string };
}

export interface Account {
  id: string;
  ownerUserId?: string;
  groupId?: string;
  name: string;
  type: 'checking' | 'revolut' | 'cash' | 'credit_card' | 'savings' | 'investment' | 'shared' | 'other';
  initialBalance: number;
  currency: string;
  color?: string;
  isActive: boolean;
  includeInNetWorth: boolean;
  visibility: 'private' | 'shared';
  currentBalance?: number;
  createdAt: string;
}

export interface Category {
  id: string;
  ownerUserId?: string;
  groupId?: string;
  name: string;
  parentCategoryId?: string;
  percentageGroup?: string;
  defaultPercentage?: number;
  type: 'income' | 'expense' | 'transfer';
  visibility: 'private' | 'shared';
  color?: string;
  icon?: string;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  ownerUserId: string;
  groupId?: string;
  accountId: string;
  date: string;
  type: 'income' | 'expense';
  categoryId?: string;
  description: string;
  amount: number;
  currency: string;
  visibility: 'private' | 'shared';
  isShared: boolean;
  sharedAmount?: number;
  personalAmount?: number;
  notes?: string;
  createdAt: string;
  category?: Category;
  account?: { id: string; name: string };
  owner?: { id: string; name: string };
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string;
  ownerUserId: string;
  createdAt: string;
  fromAccount?: { id: string; name: string };
  toAccount?: { id: string; name: string };
}

export interface SharedExpenseParticipant {
  id: string;
  sharedExpenseId: string;
  userId: string;
  percentage?: number;
  amountDue: number;
  amountPaid: number;
  balance: number;
  user: { id: string; name: string };
}

export interface SharedExpense {
  id: string;
  transactionId?: string;
  groupId: string;
  paidByUserId: string;
  totalAmount: number;
  sharedAmount: number;
  splitMethod: 'equal' | 'percentage' | 'fixed_amount';
  date: string;
  description: string;
  status: 'open' | 'settled';
  createdAt: string;
  paidBy: { id: string; name: string };
  participants: SharedExpenseParticipant[];
}

export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  referenceMonth: string;
  status: 'pending' | 'paid' | 'cancelled';
  paidAt?: string;
  createdAt: string;
  fromUser: { id: string; name: string };
  toUser: { id: string; name: string };
}

export interface SettlementSuggestion {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

export interface PersonBalance {
  userId: string;
  name: string;
  balance: number;
  totalPaid?: number;
  totalDue?: number;
}

export interface BudgetCategory {
  key: string;
  label: string;
  percentage: number;
  target: number;
  actual: number;
  difference: number;
  percentageUsed: number;
  status: 'ok' | 'over';
}

export interface PrivateDashboard {
  month: string;
  income: number;
  expenses: number;
  result: number;
  savingsPercentage: number;
  status: 'surplus' | 'deficit' | 'balanced';
  accountsCount: number;
  budgetComparison: BudgetCategory[];
  categoryBreakdown: { categoryId?: string; categoryName: string; amount: number }[];
  recentTransactions: Transaction[];
}

export interface SharedDashboard {
  month: string;
  total: number;
  expensesCount: number;
  balances: PersonBalance[];
  pendingSettlements: Settlement[];
  recentExpenses: SharedExpense[];
}

export interface Goal {
  id: string;
  ownerUserId?: string;
  groupId?: string;
  visibility: 'private' | 'shared';
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  category?: string;
  priority: number;
  status: string;
  missingAmount?: number;
  percentageCompleted?: number;
  monthlyNeeded?: number;
  createdAt: string;
}

export interface Debt {
  id: string;
  ownerUserId?: string;
  visibility: 'private' | 'shared';
  description: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  totalInstallments?: number;
  paidInstallments: number;
  remainingInstallments?: number;
  installmentAmount?: number;
  interestRate?: number;
  dueDate?: string;
  status: string;
  paidPercentage?: number;
  createdAt: string;
}

export interface MonthlyReport {
  month: string;
  income: number;
  expenses: number;
  result: number;
  savingsPercentage: number;
  status: string;
  topExpenses: Transaction[];
  categoryBreakdown: { name: string; amount: number }[];
}

export interface AuthResponse {
  user: User;
  token: string;
}
