import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserRole } from '../types';

interface BottomNavProps {
  user?: { role: UserRole; name: string } | null;
}

const BottomNav: React.FC<BottomNavProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const getActive = (path: string) => location.pathname === path;

  return (
    <nav className="flex-none bg-card-dark border-t border-white/5 pb-8 pt-3 z-50">
      <div className="flex items-center justify-center gap-10 px-4">
        <button 
          onClick={() => navigate('/home')}
          className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors active:scale-95 ${getActive('/home') ? 'text-primary' : 'text-text-secondary hover:text-white'}`}
        >
          <span className={`material-symbols-outlined text-2xl ${getActive('/home') ? 'filled-icon' : ''}`}>home</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">Inicio</span>
        </button>

        {user.role === UserRole.ESCRITOR && (
          <button 
            onClick={() => navigate('/interests')}
            className={`flex flex-col items-center justify-center gap-1 p-2 transition-colors active:scale-95 ${getActive('/interests') ? 'text-primary' : 'text-text-secondary hover:text-white'}`}
          >
            <span className={`material-symbols-outlined text-2xl ${getActive('/interests') ? 'filled-icon' : ''}`}>stars</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Intereses</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default BottomNav;
