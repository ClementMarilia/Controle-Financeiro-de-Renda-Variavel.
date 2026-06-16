import axios from 'axios';
import {
  User, Account, Transaction, Transfer, Category, SharedExpense, Settlement,
  Goal, Debt, PrivateDashboard, SharedDashboard, BudgetCategory,
  AuthResponse, SettlementSuggestion, PersonBalance, MonthlyReport
} from '../types';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('auth-storage');
  if (stored) {
    const { state } = JSON.parse(stored);
    if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post<AuthResponse>('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => api.post<AuthResponse>('/auth/register', { name, email, password }),
  me: () => api.get<User>('/auth/me'),
  updateMe: (data: Partial<User>) => api.put<User>('/auth/me', data),
};

// Groups
export const groupApi = {
  current: () => api.get('/groups/current'),
  members: () => api.get('/groups/members'),
  invite: (email: string, role?: string) => api.post('/groups/invite', { email, role }),
};

// Accounts
export const accountApi = {
  private: () => api.get<Account[]>('/accounts/private'),
  shared: () => api.get<Account[]>('/accounts/shared'),
  create: (data: Partial<Account>) => api.post<Account>('/accounts', data),
  update: (id: string, data: Partial<Account>) => api.put<Account>(`/accounts/${id}`, data),
  delete: (id: string) => api.delete(`/accounts/${id}`),
};

// Transactions
export const transactionApi = {
  private: (params?: Record<string, string>) => api.get<{ transactions: Transaction[]; total: number }>('/transactions/private', { params }),
  shared: (params?: Record<string, string>) => api.get<{ transactions: Transaction[]; total: number }>('/transactions/shared', { params }),
  create: (data: Partial<Transaction> & { accountId: string }) => api.post<Transaction>('/transactions', data),
  update: (id: string, data: Partial<Transaction>) => api.put<Transaction>(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
};

// Shared Expenses
export const sharedExpenseApi = {
  list: (params?: Record<string, string>) => api.get<SharedExpense[]>('/shared-expenses', { params }),
  create: (data: object) => api.post<SharedExpense>('/shared-expenses', data),
  update: (id: string, data: object) => api.put<SharedExpense>(`/shared-expenses/${id}`, data),
  delete: (id: string) => api.delete(`/shared-expenses/${id}`),
  settlementSuggestions: (params?: Record<string, string>) => api.get<{ suggestions: SettlementSuggestion[]; balances: PersonBalance[] }>('/shared-expenses/settlements', { params }),
};

// Settlements
export const settlementApi = {
  list: () => api.get<Settlement[]>('/settlements'),
  create: (data: object) => api.post<Settlement>('/settlements', data),
  markPaid: (id: string) => api.patch<Settlement>(`/settlements/${id}/mark-paid`),
};

// Dashboard
export const dashboardApi = {
  private: (month?: string) => api.get<PrivateDashboard>('/dashboard/private', { params: { month } }),
  shared: (month?: string) => api.get<SharedDashboard>('/dashboard/shared', { params: { month } }),
};

// Reports
export const reportApi = {
  privateMonthly: (month?: string) => api.get<MonthlyReport>('/reports/private/monthly', { params: { month } }),
  sharedMonthly: (month?: string) => api.get('/reports/shared/monthly', { params: { month } }),
  privateYearly: (year?: number) => api.get('/reports/private/yearly', { params: { year } }),
};

// Budget
export const budgetApi = {
  private: (month: string) => api.get<{ month: string; income: number; comparison: BudgetCategory[] }>(`/budgets/private/${month}`),
};

// Goals
export const goalApi = {
  list: () => api.get<Goal[]>('/goals'),
  create: (data: Partial<Goal>) => api.post<Goal>('/goals', data),
  update: (id: string, data: Partial<Goal>) => api.put<Goal>(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`),
};

// Debts
export const debtApi = {
  list: () => api.get<Debt[]>('/debts'),
  create: (data: Partial<Debt>) => api.post<Debt>('/debts', data),
  update: (id: string, data: Partial<Debt>) => api.put<Debt>(`/debts/${id}`, data),
  delete: (id: string) => api.delete(`/debts/${id}`),
};

// Transfers
export const transferApi = {
  list: () => api.get<Transfer[]>('/transfers'),
  create: (data: Partial<Transfer> & { fromAccountId: string; toAccountId: string }) => api.post<Transfer>('/transfers', data),
  delete: (id: string) => api.delete(`/transfers/${id}`),
};

// Categories
export const categoryApi = {
  list: () => api.get<Category[]>('/categories'),
  create: (data: Partial<Category>) => api.post<Category>('/categories', data),
  update: (id: string, data: Partial<Category>) => api.put<Category>(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export default api;
