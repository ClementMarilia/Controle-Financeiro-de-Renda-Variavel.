import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import { formatDate, getCurrentMonth, getMonthLabel } from '../../utils/date';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import CategoryPieChart from '../../components/charts/CategoryPieChart';
import { useAuth } from '../../hooks/useAuth';

function StatCard({ label, value, subtext, color = 'gray' }: { label: string; value: string; subtext?: string; color?: string }) {
  const colors: Record<string, string> = { green: 'text-green-600', red: 'text-red-500', blue: 'text-blue-600', gray: 'text-gray-800' };
  return (
    <div className="stat-card">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colors[color]}`}>{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
    </div>
  );
}

export default function PrivateDashboard() {
  const { user } = useAuth();
  const [month, setMonth] = useState(getCurrentMonth());
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-private', month],
    queryFn: () => dashboardApi.private(month).then((r) => r.data),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  const statusLabel = data?.status === 'surplus' ? '✅ Sobrou' : data?.status === 'deficit' ? '❌ Faltou' : '⚖️ Zerou';
  const statusColor = data?.status === 'surplus' ? 'green' : data?.status === 'deficit' ? 'red' : 'gray';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel Pessoal</h1>
          <p className="text-gray-500 text-sm">Bem-vinda, {user?.name} 👋</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="input-field w-auto text-sm"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Receitas" value={formatCurrency(data?.income || 0)} color="green" />
        <StatCard label="Despesas" value={formatCurrency(data?.expenses || 0)} color="red" />
        <StatCard label="Resultado" value={formatCurrency(data?.result || 0)} color={statusColor} subtext={statusLabel} />
        <StatCard label="Economizado" value={`${(data?.savingsPercentage || 0).toFixed(1)}%`} subtext={getMonthLabel(month)} />
      </div>

      {/* Budget 50/20/10/10/10 */}
      {data?.budgetComparison && data.budgetComparison.length > 0 && (
        <Card title="Orçamento 50/20/10/10/10">
          <div className="space-y-4">
            {data.budgetComparison.map((cat) => (
              <div key={cat.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{cat.label} <span className="text-gray-400">({cat.percentage}%)</span></span>
                  <span className={`text-sm font-semibold ${cat.status === 'over' ? 'text-red-500' : 'text-green-600'}`}>
                    {formatCurrency(cat.actual)} / {formatCurrency(cat.target)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${cat.status === 'over' ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(cat.percentageUsed, 100)}%` }}
                  />
                </div>
                {cat.status === 'over' && (
                  <p className="text-xs text-red-500 mt-0.5">Acima da meta em {formatCurrency(Math.abs(cat.difference))}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        {data?.categoryBreakdown && data.categoryBreakdown.length > 0 && (
          <Card title="Gastos por Categoria">
            <CategoryPieChart data={data.categoryBreakdown} />
          </Card>
        )}

        {/* Recent Transactions */}
        {data?.recentTransactions && data.recentTransactions.length > 0 && (
          <Card title="Lançamentos Recentes">
            <div className="space-y-2">
              {data.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{tx.description}</p>
                    <p className="text-xs text-gray-400">{formatDate(tx.date)} · {tx.category?.name || 'Sem categoria'}</p>
                  </div>
                  <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {data?.income === 0 && (
        <div className="card bg-yellow-50 border-yellow-100 text-center py-8">
          <p className="text-yellow-700 font-medium">Nenhuma receita registrada em {getMonthLabel(month)}</p>
          <p className="text-yellow-600 text-sm mt-1">Adicione seus lançamentos de receita para ver o orçamento</p>
        </div>
      )}
    </div>
  );
}
