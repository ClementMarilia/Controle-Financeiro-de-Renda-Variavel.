import { NavLink } from 'react-router-dom';

const mobileNav = [
  { to: '/dashboard', label: 'Pessoal', icon: '🏠' },
  { to: '/dashboard/compartilhado', label: 'Casa', icon: '🏡' },
  { to: '/lancamentos', label: 'Lançamentos', icon: '📋' },
  { to: '/compartilhados', label: 'Gastos', icon: '🤝' },
  { to: '/acertos', label: 'Acertos', icon: '⚖️' },
];

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 flex">
      {mobileNav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/dashboard'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-3 text-xs transition-colors ${isActive ? 'text-green-600' : 'text-gray-500'}`
          }
        >
          <span className="text-xl leading-none">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
