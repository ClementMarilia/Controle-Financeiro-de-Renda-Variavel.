import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalApi } from '../../services/api';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Input from '../../components/ui/Input';
import { useForm } from 'react-hook-form';

export default function GoalsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const qc = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => goalApi.list().then((r) => r.data),
  });

  const { register, handleSubmit, reset } = useForm<any>({ defaultValues: { priority: 1 } });

  const createMutation = useMutation({
    mutationFn: (data: any) => goalApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setIsOpen(false); reset(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Metas Pessoais</h1>
          <p className="text-gray-500 text-sm">Seus objetivos financeiros</p>
        </div>
        <Button onClick={() => setIsOpen(true)}>+ Nova Meta</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => (
          <Card key={goal.id}>
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-800">{goal.name}</h3>
              <Button variant="ghost" size="sm" onClick={() => { if (confirm('Excluir meta?')) deleteMutation.mutate(goal.id); }}>🗑️</Button>
            </div>
            <div className="progress-bar mb-2">
              <div className="progress-fill bg-green-500" style={{ width: `${Math.min(goal.percentageCompleted || 0, 100)}%` }} />
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">{formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}</span>
              <span className="font-semibold text-green-600">{(goal.percentageCompleted || 0).toFixed(0)}%</span>
            </div>
            {goal.targetDate && (
              <p className="text-xs text-gray-400">Meta para {formatDate(goal.targetDate)}</p>
            )}
            {goal.monthlyNeeded ? (
              <p className="text-xs text-blue-600 mt-1">Aporte mensal necessário: {formatCurrency(goal.monthlyNeeded)}</p>
            ) : null}
          </Card>
        ))}
      </div>

      {goals.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-gray-600 font-medium">Nenhuma meta cadastrada</p>
          <Button onClick={() => setIsOpen(true)} className="mt-4">+ Criar Meta</Button>
        </div>
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Nova Meta">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <Input label="Nome da meta" placeholder="Ex: Viagem para o Brasil" {...register('name', { required: true })} />
          <Input label="Valor alvo (€)" type="number" step="0.01" min="0" {...register('targetAmount', { required: true, valueAsNumber: true })} />
          <Input label="Valor atual (€)" type="number" step="0.01" min="0" {...register('currentAmount', { valueAsNumber: true })} />
          <Input label="Data alvo" type="date" {...register('targetDate')} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={createMutation.isPending} className="flex-1">Criar Meta</Button>
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
