import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settlementApi, sharedExpenseApi } from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import { formatDate, getCurrentMonth } from '../../utils/date';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function SettlementsPage() {
  const qc = useQueryClient();
  const month = getCurrentMonth();

  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ['settlements'],
    queryFn: () => settlementApi.list().then((r) => r.data),
  });

  const { data: suggestions } = useQuery({
    queryKey: ['settlement-suggestions', month],
    queryFn: () => sharedExpenseApi.settlementSuggestions({ month }).then((r) => r.data),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => settlementApi.markPaid(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settlements'] }),
  });

  const pending = settlements.filter((s) => s.status === 'pending');
  const paid = settlements.filter((s) => s.status === 'paid');

  if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Acertos ⚖️</h1>
        <p className="text-gray-500 text-sm">Quem deve pagar quem na casa</p>
      </div>

      {suggestions?.suggestions && suggestions.suggestions.length > 0 && (
        <Card title="💡 Sugestões de Acerto (mês atual)">
          <div className="space-y-2">
            {suggestions.suggestions.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                <p className="text-sm">
                  <span className="font-semibold text-red-600">{s.fromName}</span>
                  {' deve pagar '}
                  <span className="font-bold text-gray-900">{formatCurrency(s.amount)}</span>
                  {' para '}
                  <span className="font-semibold text-green-600">{s.toName}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Pendentes">
        {pending.length === 0 ? (
          <p className="text-gray-400 text-center py-6">Nenhum acerto pendente</p>
        ) : (
          <div className="space-y-3">
            {pending.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                <div>
                  <p className="text-sm font-semibold">
                    <span className="text-red-600">{s.fromUser.name}</span>
                    {' → '}
                    <span className="text-green-600">{s.toUser.name}</span>
                    {': '}
                    <span className="font-bold">{formatCurrency(s.amount)}</span>
                  </p>
                  <p className="text-xs text-gray-500">Referência: {s.referenceMonth}</p>
                </div>
                <Button size="sm" loading={markPaid.isPending} onClick={() => markPaid.mutate(s.id)}>Marcar como pago</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Histórico de Pagamentos">
        {paid.length === 0 ? (
          <p className="text-gray-400 text-center py-6">Nenhum acerto pago ainda</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">De</th>
                  <th className="table-header">Para</th>
                  <th className="table-header text-right">Valor</th>
                  <th className="table-header">Pago em</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {paid.map((s) => (
                  <tr key={s.id} className="table-row">
                    <td className="table-cell">{s.fromUser.name}</td>
                    <td className="table-cell">{s.toUser.name}</td>
                    <td className="table-cell text-right font-semibold">{formatCurrency(s.amount)}</td>
                    <td className="table-cell text-gray-500">{s.paidAt ? formatDate(s.paidAt) : '—'}</td>
                    <td className="table-cell"><Badge variant="green">Pago</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
