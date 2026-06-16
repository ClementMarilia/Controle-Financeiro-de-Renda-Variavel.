import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import PrivateDashboard from './pages/dashboard/PrivateDashboard';
import SharedDashboard from './pages/dashboard/SharedDashboard';
import PrivateAccountsPage from './pages/accounts/PrivateAccountsPage';
import PrivateTransactionsPage from './pages/transactions/PrivateTransactionsPage';
import SharedExpensesPage from './pages/shared/SharedExpensesPage';
import SettlementsPage from './pages/shared/SettlementsPage';
import BudgetPage from './pages/budget/BudgetPage';
import TransfersPage from './pages/transfers/TransfersPage';
import GoalsPage from './pages/goals/GoalsPage';
import DebtsPage from './pages/debts/DebtsPage';
import ReportsPage from './pages/reports/ReportsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<PrivateDashboard />} />
          <Route path="/dashboard/compartilhado" element={<SharedDashboard />} />
          <Route path="/contas" element={<PrivateAccountsPage />} />
          <Route path="/lancamentos" element={<PrivateTransactionsPage />} />
          <Route path="/compartilhados" element={<SharedExpensesPage />} />
          <Route path="/acertos" element={<SettlementsPage />} />
          <Route path="/orcamento" element={<BudgetPage />} />
          <Route path="/transferencias" element={<TransfersPage />} />
          <Route path="/metas" element={<GoalsPage />} />
          <Route path="/dividas" element={<DebtsPage />} />
          <Route path="/relatorios" element={<ReportsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
