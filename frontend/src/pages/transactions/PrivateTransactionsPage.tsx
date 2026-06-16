import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionApi, accountApi, categoryApi } from '../../services/api';
import { Transaction } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { formatDate, getCurrentMonth } from '../../utils/date';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useForm } from 'react-hook-form';

export default function PrivateTransactionsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState(getCurrentMonth());
  const [typeFilter, setTypeFilter] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['transactions-private', month, typeFilter],
    queryFn: () => transactionApi.private({ month, ...(typeFilter ? { type: typeFilter } : {}) }).then((r) => r.data),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-private'],
    queryFn: () => accountApi.private().then((r) => r.data),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then((r) => r.data),
  });

  const { register, handleSubmit, reset, watch, setValue } = useForm<any>({
    defaultValues: { type: 'expense', visibility: 'private', currency: 'EUR', date: new Date().toISOString().split('T')[0] },
  });

  const txType = watch('type');

  const saveMutation = useMutation({
    mutationFn: (formData: any) => editing
      ? transactionApi.update(editing.id, formData)
      : transactionApi.create(formData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions-private'] }); setIsOpen(false); reset(); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transactionApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions-private'] }),
  });

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setValue('type', tx.type);
    setValue('description', tx.description);
    setValue('amount', tx.amount);
    setValue('date', tx.date.split('T')[0]);
    setValue('accountId', tx.accountId);
    setValue('categoryId', tx.categoryId);
    setValue('notes', tx.notes);
    setIsOpen(true);
  };

  const transactions = data?.transactions || [];
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const filteredCategories = categories.filter((c) => c.type === txType || !txType);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lançamentos Pessoais</h1>
          <p className="text-gray-500 text-sm">Seus lançamentos privados</p>
        </div>
        <Button onClick={() => { setEditing(null); reset({ type: 'expense', visibility: 'private', currency: 'EUR', date: new Date().toISOString().split('T')[0] }); setIsOpen(true); }}>
          + Novo Lançamento
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-field w-auto text-sm" />
        <select className="input-field w-auto text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Todos os tipos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card"><p className="text-xs text-gray-500 uppercase">Receitas</p><p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(totalIncome)}</p></div>
        <div className="stat-card"><p className="text-xs text-gray-500 uppercase">Despesas</p><p className="text-xl font-bold text-red-500 mt-1">{formatCurrency(totalExpense)}</p></div>
        <div className="stat-card"><p className="text-xs text-gray-500 uppercase">Resultado</p><p className={`text-xl font-bold mt-1 ${totalIncome - totalExpense >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(totalIncome - totalExpense)}</p></div>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <Card>
          {transactions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400">Nenhum lançamento encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">Data</th>
                    <th className="table-header">Descrição</th>
                    <th className="table-header">Categoria</th>
                    <th className="table-header">Conta</th>
                    <th className="table-header text-right">Valor</th>
                    <th className="table-header">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="table-row">
                      <td className="table-cell text-gray-500">{formatDate(tx.date)}</td>
                      <td className="table-cell font-medium">{tx.description}</td>
                      <td className="table-cell"><Badge variant="gray">{tx.category?.name || '—'}</Badge></td>
                      <td className="table-cell text-gray-500">{tx.account?.name || '—'}</td>
                      <td className={`table-cell text-right font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(tx)}>✏️</Button>
                          <Button variant="ghost" size="sm" onClick={() => { if (confirm('Excluir?')) deleteMutation.mutate(tx.id); }}>🗑️</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setEditing(null); }} title={editing ? 'Editar Lançamento' : 'Novo Lançamento'}>
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <div className="flex gap-2">
            {['income', 'expense'].map((t) => (
              <button key={t} type="button"
                onClick={() => setValue('type', t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${txType === t ? (t === 'income' ? 'bg-green-600 text-white' : 'bg-red-500 text-white') : 'bg-gray-100 text-gray-600'}`}
              >
                {t === 'income' ? '↑ Receita' : '↓ Despesa'}
              </button>
            ))}
          </div>
          <Input label="Descrição" placeholder="Ex: Supermercado" {...register('description', { required: true })} />
          <Input label="Valor (€)" type="number" step="0.01" min="0" placeholder="0.00" {...register('amount', { required: true, valueAsNumber: true })} />
          <Input label="Data" type="date" {...register('date', { required: true })} />
          <Select label="Conta" options={accounts.map((a) => ({ value: a.id, label: a.name }))} placeholder="Selecione a conta" {...register('accountId', { required: true })} />
          <Select label="Categoria" options={filteredCategories.map((c) => ({ value: c.id, label: c.name }))} placeholder="Selecione a categoria" {...register('categoryId')} />
          <Input label="Observações" placeholder="Opcional" {...register('notes')} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saveMutation.isPending} className="flex-1">{editing ? 'Salvar' : 'Adicionar'}</Button>
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
