import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/currency';

interface DataPoint { categoryName: string; amount: number; }

const COLORS = ['#16a34a', '#2563eb', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

export default function CategoryPieChart({ data }: { data: DataPoint[] }) {
  if (!data.length) return <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Sem dados para exibir</div>;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="amount" nameKey="categoryName">
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend formatter={(value) => value} wrapperStyle={{ fontSize: '12px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
