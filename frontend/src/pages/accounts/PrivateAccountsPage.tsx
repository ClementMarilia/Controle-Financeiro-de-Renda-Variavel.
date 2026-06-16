import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '../../services/api';
import { Account } from '../../types';
import { formatCurrency } from '../../utils/currency';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useForm } from 'react-hook-form';

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'revolut', label: 'Revolut' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'savings', label: 'Poupança' },
  { value: 'investment', label: 'Investimentos' },
  { value: 'other', label: 'Outros' },
];

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Conta Corrente', revolut: 'Revolut', cash: 'Dinheiro',
  credit_card: 'Cartão de Crédito', savings: 'Poupança', investment: 'Investimentos', other: 'Outros',
};

const ACCOUNT_ICONS: Record<string, string> = {
  checking: '🏦', revolut: '💳', cash: '💵', credit_card: '💳', savings: '🏫', investment: '📈', other: '💼',
};

export default function PrivateAccountsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const qc = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts-private'],
    queryFn: () => accountApi.private().then((r) => r.data),
  });

  const { register, handleSubmit, reset, setValue } = useForm<Partial<Account>>();

  const createMutation = useMutation({
    mutationFn: (data: Partial<Account>) => editing ? accountApi.update(editing.id, data) : accountApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts-private'] }); setIsOpen(false); reset(); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts-private'] }),
  });

  const openEdit = (acc: Account) => {
    setEditing(acc);
    setValue('name', acc.name);
    setValue('type', acc.type);
    setValue('initialBalance', acc.initialBalance);
    setValue('currency', acc.currency);
    setIsOpen(true);
  };

  const openNew = () => { setEditing(null); reset(); setIsOpen(true); };

  const totalBalance = accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

  if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas Pessoais</h1>
          <p className="text-gray-500 text-sm">Suas contas privadas</p>
        </div>
        <Button onClick={openNew}>+ Nova Conta</Button>
      </div>

      <div className="card bg-gradient-to-r from-green-600 to-green-700 text-white">
        <p className="text-sm opacity-80">Saldo total</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
        <p className="text-sm opacity-70 mt-1">{accounts.length} contas ativas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => (
          <div key={acc.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{ACCOUNT_ICONS[acc.type] || '💼'}</span>
                <div>
                  <p className="font-semibold text-gray-800">{acc.name}</p>
                  <Badge variant="gray">{ACCOUNT_TYPE_LABELS[acc.type]}</Badge>
                </div>
              </div>
            </div>
            <p className={`text-2xl font-bold ${(acc.currentBalance || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatCurrency(acc.currentBalance || 0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Saldo inicial: {formatCurrency(acc.initialBalance)}</p>
            <div className="flex gap-2 mt-3">
              <Button variant="ghost" size="sm" onClick={() => openEdit(acc)}>Editar</Button>
              <Button variant="danger" size="sm" onClick={() => { if (confirm('Desativar esta conta?')) deleteMutation.mutate(acc.id); }}>
                Remover
              </Button>
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">💳</p>
          <p className="text-gray-600 font-medium">Nenhuma conta cadastrada</p>
          <p className="text-gray-400 text-sm mt-1">Adicione suas contas para controlar seu saldo</p>
          <Button onClick={openNew} className="mt-4">+ Adicionar Conta</Button>
        </div>
      )}

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setEditing(null); reset(); }} title={editing ? 'Editar Conta' : 'Nova Conta'}>
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <Input label="Nome da conta" placeholder="Ex: Conta Corrente BPI" {...register('name', { required: true })} />
          <Select label="Tipo" options={ACCOUNT_TYPE_OPTIONS} placeholder="Selecione o tipo" {...register('type', { required: true })} />
          <Input label="Saldo inicial" type="number" step="0.01" placeholder="0.00" {...register('initialBalance', { valueAsNumber: true })} />
          <Select label="Moeda" options={[{ value: 'EUR', label: 'Euro (€)' }, { value: 'BRL', label: 'Real (R$)' }, { value: 'USD', label: 'Dólar ($)' }]} {...register('currency')} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={createMutation.isPending} className="flex-1">{editing ? 'Salvar' : 'Criar Conta'}</Button>
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
