import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { to: '/dashboard', label: 'Painel Pessoal', icon: '🏠' },
  { to: '/dashboard/compartilhado', label: 'Painel da Casa', icon: '🏡' },
  { to: '/contas', label: 'Contas', icon: '💳' },
  { to: '/lancamentos', label: 'Lançamentos', icon: '📋' },
  { to: '/compartilhados', label: 'Compartilhados', icon: '🤝' },
  { to: '/acertos', label: 'Acertos', icon: '⚖️' },
  { to: '/orcamento', label: 'Orçamento', icon: '📊' },
  { to: '/transferencias', label: 'Transferências', icon: '🔄' },
  { to: '/metas', label: 'Metas', icon: '🎯' },
  { to: '/dividas', label: 'Dívidas', icon: '💸' },
  { to: '/relatorios', label: 'Relatórios', icon: '📈' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 h-screen fixed top-0 left-0 z-30">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            {user?.name?.charAt(0) || 'C'}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{user?.name}</p>
            <p className="text-xs text-gray-500">Controle Financeiro</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button onClick={handleLogout} className="nav-item w-full text-red-500 hover:bg-red-50 hover:text-red-600">
          <span className="text-lg">🚪</span>
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
