import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { debtApi } from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Input from '../../components/ui/Input';
import { useForm } from 'react-hook-form';

export default function DebtsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const qc = useQueryClient();

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['debts'],
    queryFn: () => debtApi.list().then((r) => r.data),
  });

  const { register, handleSubmit, reset } = useForm<any>();

  const createMutation = useMutation({
    mutationFn: (data: any) => debtApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); setIsOpen(false); reset(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => debtApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dívidas Pessoais</h1>
          <p className="text-gray-500 text-sm">Controle de pagamentos e parcelas</p>
        </div>
        <Button onClick={() => setIsOpen(true)}>+ Nova Dívida</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {debts.map((debt) => (
          <Card key={debt.id}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-800">{debt.description}</h3>
                {debt.dueDate && <p className="text-xs text-gray-400">Vencimento: {formatDate(debt.dueDate)}</p>}
              </div>
              <Badge variant={debt.status === 'paid' ? 'green' : 'yellow'}>{debt.status === 'paid' ? 'Pago' : 'Ativa'}</Badge>
            </div>
            <div className="progress-bar mb-2">
              <div className="progress-fill bg-blue-500" style={{ width: `${Math.min(debt.paidPercentage || 0, 100)}%` }} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pago: {formatCurrency(debt.paidAmount)} / {formatCurrency(debt.totalAmount)}</span>
              <span className="font-semibold text-red-500">Resta: {formatCurrency(debt.remainingAmount)}</span>
            </div>
            {debt.totalInstallments && (
              <p className="text-xs text-gray-400 mt-1">Parcelas: {debt.paidInstallments}/{debt.totalInstallments}</p>
            )}
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => { if (confirm('Marcar como paga?')) deleteMutation.mutate(debt.id); }}>
              Marcar como paga
            </Button>
          </Card>
        ))}
      </div>

      {debts.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">💸</p>
          <p className="text-gray-600 font-medium">Nenhuma dívida cadastrada</p>
          <Button onClick={() => setIsOpen(true)} className="mt-4">+ Adicionar Dívida</Button>
        </div>
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Nova Dívida">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <Input label="Descrição" placeholder="Ex: Financiamento do carro" {...register('description', { required: true })} />
          <Input label="Valor total (€)" type="number" step="0.01" min="0" {...register('totalAmount', { required: true, valueAsNumber: true })} />
          <Input label="Total de parcelas" type="number" min="1" {...register('totalInstallments', { valueAsNumber: true })} />
          <Input label="Valor da parcela (€)" type="number" step="0.01" {...register('installmentAmount', { valueAsNumber: true })} />
          <Input label="Vencimento" type="date" {...register('dueDate')} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={createMutation.isPending} className="flex-1">Adicionar</Button>
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
