import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transferApi, accountApi } from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useForm } from 'react-hook-form';

export default function TransfersPage() {
  const [isOpen, setIsOpen] = useState(false);
  const qc = useQueryClient();

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['transfers'],
    queryFn: () => transferApi.list().then((r) => r.data),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-private'],
    queryFn: () => accountApi.private().then((r) => r.data),
  });

  const { register, handleSubmit, reset } = useForm<any>({
    defaultValues: { date: new Date().toISOString().split('T')[0] },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => transferApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transfers'] }); qc.invalidateQueries({ queryKey: ['accounts-private'] }); setIsOpen(false); reset(); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transferências</h1>
          <p className="text-gray-500 text-sm">Movimentações entre suas contas</p>
        </div>
        <Button onClick={() => setIsOpen(true)}>+ Nova Transferência</Button>
      </div>

      <div className="card bg-blue-50 border-blue-100">
        <p className="text-blue-700 text-sm">ℹ️ Transferência não é receita nem despesa — apenas move dinheiro entre suas contas.</p>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <Card>
          {transfers.length === 0 ? (
            <p className="text-gray-400 text-center py-10">Nenhuma transferência registrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">Data</th>
                    <th className="table-header">De</th>
                    <th className="table-header">Para</th>
                    <th className="table-header">Descrição</th>
                    <th className="table-header text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => (
                    <tr key={t.id} className="table-row">
                      <td className="table-cell text-gray-500">{formatDate(t.date)}</td>
                      <td className="table-cell">{t.fromAccount?.name}</td>
                      <td className="table-cell">{t.toAccount?.name}</td>
                      <td className="table-cell">{t.description || '—'}</td>
                      <td className="table-cell text-right font-semibold text-blue-600">{formatCurrency(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Nova Transferência">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <Select label="Conta de origem" options={accounts.map((a) => ({ value: a.id, label: a.name }))} placeholder="De qual conta?" {...register('fromAccountId', { required: true })} />
          <Select label="Conta de destino" options={accounts.map((a) => ({ value: a.id, label: a.name }))} placeholder="Para qual conta?" {...register('toAccountId', { required: true })} />
          <Input label="Valor (€)" type="number" step="0.01" min="0" {...register('amount', { required: true, valueAsNumber: true })} />
          <Input label="Data" type="date" {...register('date', { required: true })} />
          <Input label="Descrição" placeholder="Opcional" {...register('description')} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={createMutation.isPending} className="flex-1">Transferir</Button>
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
