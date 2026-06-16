import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Header({ title }: { title?: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="font-bold text-green-700 text-base">{title || 'Controle Financeiro'}</h1>
        <p className="text-xs text-gray-400">{user?.name}</p>
      </div>
      <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors text-sm">
        Sair
      </button>
    </header>
  );
}
