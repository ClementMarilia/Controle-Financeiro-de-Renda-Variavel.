import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import { getCurrentMonth, getMonthLabel } from '../../utils/date';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function ReportsPage() {
  const [tab, setTab] = useState<'personal' | 'shared'>('personal');
  const [month, setMonth] = useState(getCurrentMonth());

  const { data: privateReport, isLoading: loadingPrivate } = useQuery({
    queryKey: ['report-private', month],
    queryFn: () => reportApi.privateMonthly(month).then((r) => r.data),
    enabled: tab === 'personal',
  });

  const { data: sharedReport, isLoading: loadingShared } = useQuery({
    queryKey: ['report-shared', month],
    queryFn: () => reportApi.sharedMonthly(month).then((r) => r.data as any),
    enabled: tab === 'shared',
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-field w-auto text-sm" />
      </div>

      <div className="flex gap-2">
        <Button variant={tab === 'personal' ? 'primary' : 'secondary'} onClick={() => setTab('personal')}>Pessoal</Button>
        <Button variant={tab === 'shared' ? 'primary' : 'secondary'} onClick={() => setTab('shared')}>Compartilhado</Button>
      </div>

      {tab === 'personal' && (
        loadingPrivate ? <LoadingSpinner /> : privateReport && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="stat-card"><p className="text-xs text-gray-500 uppercase">Receitas</p><p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(privateReport.income)}</p></div>
              <div className="stat-card"><p className="text-xs text-gray-500 uppercase">Despesas</p><p className="text-xl font-bold text-red-500 mt-1">{formatCurrency(privateReport.expenses)}</p></div>
              <div className="stat-card"><p className="text-xs text-gray-500 uppercase">Resultado</p><p className={`text-xl font-bold mt-1 ${privateReport.result >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(privateReport.result)}</p></div>
            </div>
            <Card title="Maiores Despesas">
              <div className="space-y-2">
                {privateReport.topExpenses.slice(0, 10).map((tx) => (
                  <div key={tx.id} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <span>{tx.description}</span>
                    <span className="font-semibold text-red-500">{formatCurrency(tx.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Categorias">
              <div className="space-y-2">
                {privateReport.categoryBreakdown.map((c, i) => (
                  <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <span>{c.name}</span>
                    <span className="font-semibold">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )
      )}

      {tab === 'shared' && (
        loadingShared ? <LoadingSpinner /> : sharedReport && (
          <div className="space-y-4">
            <div className="stat-card">
              <p className="text-xs text-gray-500 uppercase">Total Compartilhado em {getMonthLabel(month)}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(sharedReport.total)}</p>
            </div>
            <Card title="Resumo por Pessoa">
              <div className="space-y-2">
                {sharedReport.personSummary?.map((p: any) => (
                  <div key={p.userId} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <span>{p.name}</span>
                    <span className={`font-semibold ${p.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(p.balance)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )
      )}
    </div>
  );
}
