import React, { useState } from 'react';
import { AppView, User } from '../types';
import { Radio, Lock, User as UserIcon, Eye, EyeOff, Smartphone, ArrowLeft } from 'lucide-react';
import { LOGO_URL } from '../utils/scheduleData';

interface Props {
  onNavigate: (view: AppView) => void;
  users: User[];
  onLoginSuccess: (user: User) => void;
}

const PublicLanding: React.FC<Props> = ({ onNavigate, users, onLoginSuccess }) => {
  const [identity, setIdentity] = useState('');
  const [credential, setCredential] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const trimmedIdentity = identity.trim();
    const trimmedCredential = credential.trim();

    if (!trimmedIdentity || !trimmedCredential) {
      setError('Ambos campos son obligatorios');
      return;
    }

    // Find user by matching identity (username or mobile) and credential (password or PIN)
    const user = users.find(u => {
      const matchIdentity = 
        u.username.toLowerCase() === trimmedIdentity.toLowerCase() || 
        (u.mobile && u.mobile.trim() === trimmedIdentity);
      
      const matchPassword = u.password === trimmedCredential;
      
      // PIN Extraction: last 4 digits of password
      const digitsAtEnd = u.password ? (u.password.match(/\d+$/)?.[0] || "") : "";
      const expectedPin = digitsAtEnd.slice(-4);
      const matchPin = trimmedCredential === expectedPin;

      return matchIdentity && (matchPassword || matchPin);
    });

    if (user) {
      localStorage.setItem('rcm_user_session', user.role);
      localStorage.setItem('rcm_user_username', user.username);
      onLoginSuccess(user);
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col overflow-hidden bg-[#FDFCF8] bg-heritage-pattern font-display text-[#4A3B32]">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#F5F0EB] to-transparent pointer-events-none"></div>

      <button 
        onClick={() => onNavigate(AppView.LISTENER_HOME)}
        className="absolute z-20 flex items-center gap-2 text-[#5D3A24] font-medium hover:opacity-70 transition-opacity"
        style={{ top: 'calc(1rem + var(--sat))', left: '1rem' }}
      >
        <ArrowLeft size={20} />
        Volver a la Radio
      </button>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        {/* Logo Section */}
        <div className="w-24 h-24 mb-6 rounded-2xl bg-white flex items-center justify-center shadow-lg p-0 overflow-hidden ring-4 ring-[#F5F0EB]">
             <img src={LOGO_URL} alt="Radio Ciudad" className="w-full h-full object-cover" />
        </div>

        <h2 className="text-2xl font-serif font-bold text-[#5D3A24] tracking-tight mb-2">
          Acceso Personal
        </h2>
        <p className="text-xs text-[#8C7B70] mb-8 text-center max-w-xs">
            Ingresa tus credenciales para acceder al sistema.
        </p>

        {/* Login Form */}
        <div className="w-full max-w-sm">
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7B70]">
                <UserIcon size={18} />
              </div>
              <input 
                type="text" 
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                placeholder="Usuario o Móvil" 
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-[#E8DCCF] bg-white text-[#4A3B32] focus:ring-2 focus:ring-[#8B5E3C] focus:border-transparent outline-none transition-all placeholder:text-[#8C7B70]/70 text-sm"
              />
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C7B70]">
                <Lock size={18} />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                placeholder="Contraseña o PIN" 
                className="w-full pl-11 pr-11 py-3 rounded-lg border border-[#E8DCCF] bg-white text-[#4A3B32] focus:ring-2 focus:ring-[#8B5E3C] focus:border-transparent outline-none transition-all placeholder:text-[#8C7B70]/70 text-sm"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C7B70] hover:text-[#5D3A24]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <p className="text-red-500 text-[10px] font-bold text-center mt-1 uppercase tracking-wider">{error}</p>}

            <button 
              type="submit"
              className="mt-4 w-full bg-[#5D3A24] text-white font-bold py-3.5 rounded-lg hover:bg-[#4A2E1C] hover:scale-[1.02] shadow-lg transition-all duration-300 uppercase tracking-widest text-xs"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center">
         <p className="text-[10px] text-[#8C7B70]">Sistema de Gestión Interna CMNL</p>
      </div>
    </div>
  );
};

export default PublicLanding;