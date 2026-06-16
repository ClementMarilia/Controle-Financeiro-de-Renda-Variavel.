import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi, settlementApi } from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import { formatDate, getCurrentMonth, getMonthLabel } from '../../utils/date';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function SharedDashboard() {
  const [month, setMonth] = useState(getCurrentMonth());
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-shared', month],
    queryFn: () => dashboardApi.shared(month).then((r) => r.data),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => settlementApi.markPaid(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard-shared'] }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel da Casa 🏡</h1>
          <p className="text-gray-500 text-sm">Despesas compartilhadas do grupo</p>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-field w-auto text-sm" />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="stat-card col-span-1 lg:col-span-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Compartilhado</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(data?.total || 0)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{data?.expensesCount || 0} despesas em {getMonthLabel(month)}</p>
        </div>

        {/* Balances per person */}
        {data?.balances?.map((b) => (
          <div key={b.userId} className="stat-card">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{b.name}</p>
            <p className={`text-2xl font-bold mt-1 ${b.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {b.balance >= 0 ? '+' : ''}{formatCurrency(b.balance)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {b.balance > 0 ? '↑ a receber' : b.balance < 0 ? '↓ a pagar' : '✓ quitada'}
            </p>
          </div>
        ))}
      </div>

      {/* Per-person details */}
      {data?.balances && data.balances.length > 0 && (
        <Card title="Resumo por Pessoa">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">Pessoa</th>
                  <th className="table-header text-right">Pago</th>
                  <th className="table-header text-right">Devido</th>
                  <th className="table-header text-right">Saldo</th>
                  <th className="table-header text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.balances.map((b) => (
                  <tr key={b.userId} className="table-row">
                    <td className="table-cell font-medium">{b.name}</td>
                    <td className="table-cell text-right text-green-600">{formatCurrency(b.totalPaid || 0)}</td>
                    <td className="table-cell text-right">{formatCurrency(b.totalDue || 0)}</td>
                    <td className={`table-cell text-right font-semibold ${b.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {b.balance >= 0 ? '+' : ''}{formatCurrency(b.balance)}
                    </td>
                    <td className="table-cell text-center">
                      <Badge variant={b.balance > 0 ? 'green' : b.balance < 0 ? 'red' : 'gray'}>
                        {b.balance > 0 ? 'Recebe' : b.balance < 0 ? 'Deve' : 'Quitada'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pending Settlements */}
      {data?.pendingSettlements && data.pendingSettlements.length > 0 && (
        <Card title="⚖️ Acertos Pendentes">
          <div className="space-y-3">
            {data.pendingSettlements.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    <span className="text-red-600">{s.fromUser.name}</span>
                    {' deve pagar '}
                    <span className="text-green-600 font-bold">{formatCurrency(s.amount)}</span>
                    {' para '}
                    <span className="text-blue-600">{s.toUser.name}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Referência: {s.referenceMonth}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={markPaid.isPending}
                  onClick={() => markPaid.mutate(s.id)}
                >
                  Pago
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Shared Expenses */}
      {data?.recentExpenses && data.recentExpenses.length > 0 && (
        <Card title="Últimas Despesas Compartilhadas">
          <div className="space-y-2">
            {data.recentExpenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{e.description}</p>
                  <p className="text-xs text-gray-400">{formatDate(e.date)} · Pago por {e.paidBy.name}</p>
                </div>
                <span className="text-sm font-semibold text-gray-800">{formatCurrency(e.sharedAmount)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(!data?.total || data.total === 0) && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🏡</p>
          <p className="text-gray-600 font-medium">Nenhuma despesa compartilhada em {getMonthLabel(month)}</p>
          <p className="text-gray-400 text-sm mt-1">Adicione despesas na seção Compartilhados</p>
        </div>
      )}
    </div>
  );
}
