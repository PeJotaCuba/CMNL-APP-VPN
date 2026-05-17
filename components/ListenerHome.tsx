import React, { useState, useEffect } from 'react';
import { AppView, NewsItem } from '../types';
import { ScrollText, Mic, Users, Home, Newspaper, Podcast, User as UserIcon, ChevronRight, ChevronLeft, LogIn, MessageCircle, X, RefreshCw, Menu, LogOut } from 'lucide-react';
import { LOGO_URL } from '../utils/scheduleData';
import Sidebar from './Sidebar';

interface Props {
  onNavigate: (view: AppView, data?: any) => void;
  news: NewsItem[];
  onSync?: () => void;
  isSyncing?: boolean;
  onMenuClick?: () => void;
}

const newsColors = [
  'bg-[#3E1E16]', // Brand Dark Brown
  'bg-[#1a237e]', // Deep Blue
  'bg-[#004d40]', // Deep Teal
  'bg-[#b71c1c]', // Deep Red
  'bg-[#4a148c]', // Deep Purple
  'bg-[#263238]', // Dark Blue Grey
];

const ListenerHome: React.FC<Props> = ({ onNavigate, news, onSync, isSyncing, onMenuClick }) => {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [showFabMenu, setShowFabMenu] = useState(false);

  useEffect(() => {
    if (news.length > 1) {
      const interval = setInterval(() => {
        setCurrentNewsIndex((prev) => (prev + 1) % news.length);
      }, 5000); 
      return () => clearInterval(interval);
    } else {
        setCurrentNewsIndex(0);
    }
  }, [news]);

  const activeNews = news.length > 0 ? news[currentNewsIndex] : null;
  const currentColor = newsColors[currentNewsIndex % newsColors.length];

  const nextNews = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(news.length > 0) setCurrentNewsIndex((prev) => (prev + 1) % news.length);
  };

  const prevNews = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(news.length > 0) setCurrentNewsIndex((prev) => (prev - 1 + news.length) % news.length);
  };

  return (
    <div className="relative flex min-h-screen h-full w-full flex-col md:flex-row bg-[#2C1B15] font-display text-stone-100 overflow-y-auto no-scrollbar">
      {/* Header Pattern Background */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none fixed"></div>

      {/* Mobile Sticky Header */}
      <header className="md:hidden sticky top-0 z-30 w-full px-4 pt-safe-top-extra pb-3 flex items-center justify-between bg-[#2C1B15]/90 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <button 
              onClick={onMenuClick}
              className="text-[#C69C6D] hover:text-white transition-colors p-1"
          >
              <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white overflow-hidden p-0 shadow-lg">
               <img src={LOGO_URL} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-sm font-serif font-bold text-[#C69C6D] leading-none tracking-wide">CMNL App</h1>
              <p className="text-[8px] text-stone-500 uppercase tracking-tighter mt-0.5">Voz de la segunda villa cubana</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isSyncing && (
               <div className="flex items-center gap-2 text-[#C69C6D] text-[10px] font-bold mr-2">
                   <RefreshCw size={12} className="animate-spin" />
               </div>
          )}
        </div>
      </header>

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#2C1B15]/80 backdrop-blur-md border-r border-white/5 p-6 z-20 relative h-screen sticky top-0 pb-28">
         <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-white p-0.5 overflow-hidden shrink-0">
                <img src={LOGO_URL} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
                <h1 className="text-white font-black text-lg leading-none tracking-tight">CMNL App</h1>
                <p className="text-[10px] text-[#9E7649]/80 italic mt-0.5 font-serif">Oyentes</p>
            </div>
         </div>

          <div className="flex flex-col gap-2 flex-1">
             <button onClick={() => onNavigate(AppView.LANDING)} className="flex items-center gap-3 bg-[#9E7649] text-white p-3 rounded-xl transition-all w-full text-left shadow-lg hover:bg-[#8B653D] hover:scale-[1.02] mb-4">
                 <LogIn size={18} />
                 <span className="font-bold text-sm">Iniciar Sesión</span>
             </button>
             <SidebarLink icon={<ScrollText size={18} />} label="Historia" onClick={() => onNavigate(AppView.SECTION_HISTORY)} />
             <SidebarLink icon={<Users size={18} />} label="Quiénes Somos" onClick={() => onNavigate(AppView.SECTION_ABOUT)} />
             <SidebarLink icon={<Mic size={18} />} label="Programación" onClick={() => onNavigate(AppView.SECTION_PROGRAMMING_PUBLIC)} />
             
             {onSync && (
                 <div className="mt-8 flex justify-center">
                     <button 
                         onClick={onSync} 
                         disabled={isSyncing} 
                         title="Actualizar Datos"
                         className="flex items-center justify-center bg-[#C69C6D] text-[#3E1E16] hover:bg-[#b58b5c] hover:scale-105 active:scale-95 transition-all w-14 h-14 rounded-full shadow-lg"
                     >
                         <RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} />
                     </button>
                 </div>
             )}
         </div>

         <div className="mt-auto pt-6 border-t border-white/5">
            {/* Actualizar button moved to floating action button */}
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-5 py-8 md:px-10 md:py-10 flex flex-col gap-4 relative z-10 max-w-7xl mx-auto w-full">
        
        {/* Mobile Branding (Hidden as it's now in the header) */}
        <div className="md:hidden h-4"></div>

        <div className="flex flex-col h-full">
             <div className="flex justify-between items-center mb-4 px-1">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="w-1 h-6 bg-[#C69C6D] rounded-full"></span>
                      Noticias Destacadas
                  </h2>
             </div>

             {/* News Carousel - Full Width on Desktop */}
             {activeNews ? (
                <div 
                    onClick={() => onNavigate(AppView.SECTION_NEWS_DETAIL, activeNews)} 
                    className={`relative rounded-xl ${currentColor} border border-white/5 overflow-hidden shadow-lg flex-1 min-h-[400px] cursor-pointer group transition-colors duration-500`}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none"></div>
                    
                    {news.length > 1 && (
                        <>
                            <button onClick={prevNews} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 p-2 rounded-full text-white/70 hover:text-white z-20 transition-all border border-white/10">
                                <ChevronLeft size={24} />
                            </button>
                            <button onClick={nextNews} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 p-2 rounded-full text-white/70 hover:text-white z-20 transition-all border border-white/10">
                                <ChevronRight size={24} />
                            </button>
                        </>
                    )}

                    <div className="absolute inset-0 p-8 sm:p-14 md:p-20 flex flex-col justify-center items-start text-left overflow-hidden">
                        <div className="flex items-center gap-1 mb-4 shrink-0">
                            {news.slice(0, 6).map((_, idx) => (
                                <div key={idx} className={`w-2 h-2 rounded-full ${idx === (currentNewsIndex % 6) ? 'bg-white' : 'bg-white/30'}`}></div>
                            ))}
                        </div>
                        <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-md text-xs font-bold uppercase tracking-wider mb-3 text-white border border-white/10 shrink-0">
                            {activeNews.category || 'Actualidad'}
                        </span>
                        <div className="overflow-y-auto no-scrollbar w-full max-w-4xl flex-1 pt-2 px-2">
                            <h3 className="text-xl md:text-4xl font-bold text-white leading-tight mb-4 text-left w-full">{activeNews.title}</h3>
                            <p className="text-sm md:text-xl text-stone-200 opacity-90 leading-relaxed text-justify w-full mb-6">
                                {activeNews.content}
                            </p>
                            <div className="text-xs md:text-sm text-stone-400 font-medium flex items-center justify-start gap-2 w-full pb-4">
                                 <span>{activeNews.date}</span>
                                 <span className="w-1 h-1 bg-stone-500 rounded-full"></span>
                                 <span>Fuente: {activeNews.author}</span>
                            </div>
                        </div>
                    </div>
                </div>
             ) : (
                <div className="rounded-xl bg-[#2C2420] border border-white/5 h-64 flex items-center justify-center">
                    <p className="text-sm text-stone-500">No hay noticias recientes</p>
                </div>
             )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 pb-4 border-t border-white/5 pt-6 flex flex-col items-center justify-center gap-2 text-stone-500 text-xs md:hidden">
            <p className="font-bold text-[#C69C6D] uppercase tracking-widest">Radio Ciudad Monumento</p>
            <p>Voz de la segunda villa cubana</p>
            <p className="opacity-50 mt-1">CMNL App 2026</p>
        </div>

      </main>
      
      {/* Floating WhatsApp Menu for Listeners */}
      <div className="fixed right-5 z-40 flex flex-col items-end gap-3" style={{ bottom: 'calc(7rem + var(--sab))' }}>
         {showFabMenu && (
             <div className="flex flex-col gap-3 animate-fade-in-up">
                 <a 
                    href="https://chat.whatsapp.com/BBalNMYSJT9CHQybLUVg5v" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-white text-[#3E1E16] px-4 py-2 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 hover:bg-[#E8DCCF] transition-colors"
                 >
                    Unirse a Comunidad CMNL
                 </a>
                 <a 
                    href="https://api.whatsapp.com/send?phone=5354413935"
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-white text-[#3E1E16] px-4 py-2 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 hover:bg-[#E8DCCF] transition-colors"
                 >
                    Escribir a administradores
                 </a>
             </div>
         )}
         <button 
            onClick={() => setShowFabMenu(!showFabMenu)}
            className="w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl shadow-black/20 flex items-center justify-center border-2 border-white/10 hover:scale-105 active:scale-95 transition-all"
         >
            {showFabMenu ? <X size={28} /> : <MessageCircle size={30} fill="white" />}
         </button>
      </div>
      
      <style>{`
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.2s ease-out forwards;
        }
      `}</style>

      {/* Bottom Nav (Mobile Only) - REMOVED */}
    </div>
  );
};

const SidebarLink = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
    <button onClick={onClick} className="flex items-center gap-3 text-stone-300 hover:text-[#CD853F] hover:bg-white/5 p-3 rounded-xl transition-all w-full text-left group">
        <span className="group-hover:scale-110 transition-transform">{icon}</span>
        <span className="font-medium text-sm">{label}</span>
    </button>
);

export default ListenerHome;
