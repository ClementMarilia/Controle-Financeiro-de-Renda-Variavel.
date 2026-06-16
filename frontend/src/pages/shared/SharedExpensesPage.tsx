import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sharedExpenseApi, groupApi } from '../../services/api';
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

export default function SharedExpensesPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState(getCurrentMonth());
  const qc = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['shared-expenses', month],
    queryFn: () => sharedExpenseApi.list({ month }).then((r) => r.data),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['group-members'],
    queryFn: () => groupApi.members().then((r) => r.data),
  });

  const { register, handleSubmit, reset, watch } = useForm<any>({
    defaultValues: { splitMethod: 'equal', date: new Date().toISOString().split('T')[0], participantIds: [] },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      const participantIds = members.map((m: any) => m.userId);
      return sharedExpenseApi.create({ ...data, participantIds });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shared-expenses'] }); setIsOpen(false); reset(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sharedExpenseApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shared-expenses'] }),
  });

  const total = expenses.reduce((s, e) => s + Number(e.sharedAmount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Despesas Compartilhadas</h1>
          <p className="text-gray-500 text-sm">Gastos do grupo Casa</p>
        </div>
        <Button onClick={() => { reset({ splitMethod: 'equal', date: new Date().toISOString().split('T')[0] }); setIsOpen(true); }}>
          + Nova Despesa
        </Button>
      </div>

      <div className="flex gap-3">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-field w-auto text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card">
          <p className="text-xs text-gray-500 uppercase">Total Compartilhado</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(total)}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-gray-500 uppercase">Despesas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{expenses.length}</p>
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="space-y-4">
          {expenses.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">🛒</p>
              <p className="text-gray-600 font-medium">Nenhuma despesa compartilhada</p>
              <Button onClick={() => setIsOpen(true)} className="mt-4">+ Adicionar Despesa</Button>
            </div>
          ) : expenses.map((expense) => (
            <Card key={expense.id}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{expense.description}</h3>
                  <p className="text-sm text-gray-500">{formatDate(expense.date)} · Pago por <strong>{expense.paidBy.name}</strong></p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(expense.sharedAmount)}</p>
                  <Badge variant={expense.status === 'settled' ? 'green' : 'yellow'}>
                    {expense.status === 'settled' ? 'Acertado' : 'Em aberto'}
                  </Badge>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase">Participantes</p>
                {expense.participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{p.user.name}</span>
                    <div className="flex gap-4 text-right">
                      <span className="text-gray-500">Deve: {formatCurrency(p.amountDue)}</span>
                      <span className="text-green-600">Pagou: {formatCurrency(p.amountPaid)}</span>
                      <span className={`font-semibold ${Number(p.balance) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {Number(p.balance) >= 0 ? '+' : ''}{formatCurrency(p.balance)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <Button variant="danger" size="sm" onClick={() => { if (confirm('Excluir despesa?')) deleteMutation.mutate(expense.id); }}>
                  Excluir
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Nova Despesa Compartilhada">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <Input label="Descrição" placeholder="Ex: Mercado, Aluguel..." {...register('description', { required: true })} />
          <Input label="Valor total (€)" type="number" step="0.01" min="0" {...register('totalAmount', { required: true, valueAsNumber: true })} />
          <Input label="Data" type="date" {...register('date', { required: true })} />
          <Select
            label="Pago por"
            options={members.map((m: any) => ({ value: m.userId, label: m.user.name }))}
            placeholder="Quem pagou?"
            {...register('paidByUserId', { required: true })}
          />
          <Select
            label="Método de divisão"
            options={[{ value: 'equal', label: 'Igual' }, { value: 'fixed_amount', label: 'Valor fixo' }]}
            {...register('splitMethod')}
          />
          <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
            <p>💡 Todos os membros do grupo ({members.length}) serão incluídos automaticamente.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={createMutation.isPending} className="flex-1">Adicionar Despesa</Button>
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
