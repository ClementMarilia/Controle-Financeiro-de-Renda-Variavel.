import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/currency';

interface DataPoint { month: string; income: number; expenses: number; result: number; }

export default function MonthlyEvolutionChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
        <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v) => `€${v}`} />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend formatter={(v: string) => ({ income: 'Receitas', expenses: 'Despesas', result: 'Resultado' } as Record<string, string>)[v] || v} />
        <Line type="monotone" dataKey="income" name="Receitas" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="expenses" name="Despesas" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
        <Line type="monotone" dataKey="result" name="Resultado" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
      </LineChart>
    </ResponsiveContainer>
  );
}
