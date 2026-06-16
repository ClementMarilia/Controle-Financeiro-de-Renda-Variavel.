import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { budgetApi } from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import { getCurrentMonth, getMonthLabel } from '../../utils/date';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function BudgetPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const { data, isLoading } = useQuery({
    queryKey: ['budget', month],
    queryFn: () => budgetApi.private(month).then((r) => r.data),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orçamento Pessoal</h1>
          <p className="text-gray-500 text-sm">Método 50/20/10/10/10</p>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-field w-auto text-sm" />
      </div>

      <div className="card bg-gradient-to-r from-green-600 to-green-700 text-white">
        <p className="text-sm opacity-80">Receita do mês ({getMonthLabel(month)})</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(data?.income || 0)}</p>
      </div>

      {!data?.income && (
        <div className="card bg-yellow-50 border-yellow-100 text-center py-6">
          <p className="text-yellow-700 font-medium">Sem renda registrada neste mês</p>
          <p className="text-yellow-600 text-sm mt-1">Cadastre receitas para gerar as metas do orçamento</p>
        </div>
      )}

      <div className="space-y-4">
        {data?.comparison.map((cat) => (
          <Card key={cat.key}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-800">{cat.label}</h3>
                <p className="text-xs text-gray-400">{cat.percentage}% da receita</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{formatCurrency(cat.actual)}</p>
                <p className="text-xs text-gray-400">Meta: {formatCurrency(cat.target)}</p>
              </div>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${cat.status === 'over' ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(cat.percentageUsed, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-sm">
              <span className={cat.status === 'over' ? 'text-red-500' : 'text-green-600'}>
                {cat.percentageUsed.toFixed(0)}% utilizado
              </span>
              <span className={cat.difference >= 0 ? 'text-green-600' : 'text-red-500'}>
                {cat.difference >= 0 ? 'Sobram ' : 'Excedeu '}{formatCurrency(Math.abs(cat.difference))}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
