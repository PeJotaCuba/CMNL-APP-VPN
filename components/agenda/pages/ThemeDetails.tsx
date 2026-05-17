import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDeepSeekIdeas } from '../services/deepSeekService';
import AgendaHeader from '../components/AgendaHeader';
import { UserProfile } from '../types';

interface ThemeDetailsProps {
  user: UserProfile;
  onMenuClick?: () => void;
  onBack?: () => void;
}

const ThemeDetails: React.FC<ThemeDetailsProps> = ({ user, onMenuClick, onBack }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, instructions, program } = location.state || {};
  
  const [ideasContent, setIdeasContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!theme) {
      if (onBack) onBack();
      else navigate('/home');
      return;
    }
    loadIdeas();
  }, [theme]);

  const loadIdeas = async () => {
    if (ideasContent) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const text = await getDeepSeekIdeas(theme, program || "Programa RCM", instructions || "");
      setIdeasContent(text);
    } catch (error: any) {
      setErrorMsg(error.message || "Error al conectar con DeepSeek.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-24 bg-background-dark min-h-screen">
      <AgendaHeader title="Detalles" user={user} onMenuClick={onMenuClick} onBack={onBack} />

      <header className="sticky top-0 z-50 flex items-center justify-between bg-card-dark/95 backdrop-blur px-4 py-3 border-b border-white/5">
        <div className="flex-1 px-4 text-center">
             <h1 className="text-white text-xs font-bold uppercase tracking-wider truncate">{program}</h1>
             <p className="text-[9px] text-primary font-bold truncate">{theme}</p>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto no-scrollbar">
        
        {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-in fade-in">
                <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] text-text-secondary uppercase font-bold animate-pulse">
                    Redactando con DeepSeek...
                </p>
            </div>
        )}

        {errorMsg && !loading && (
            <div className="p-6 text-center bg-red-500/10 rounded-2xl border border-red-500/20">
                <span className="material-symbols-outlined text-red-400 text-3xl mb-2">error</span>
                <p className="text-red-300 text-sm font-medium">{errorMsg}</p>
            </div>
        )}

        {!loading && !errorMsg && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-card-dark border border-white/5 p-6 rounded-[2rem] shadow-xl">
                    <div className="mb-4 flex items-center gap-2 text-primary opacity-80">
                        <span className="material-symbols-outlined text-lg">movie_filter</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest">Estructura Narrativa</span>
                    </div>
                    <div className="space-y-4 text-sm text-white/90 leading-relaxed font-serif whitespace-pre-wrap">
                        {ideasContent}
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
};

export default ThemeDetails;
