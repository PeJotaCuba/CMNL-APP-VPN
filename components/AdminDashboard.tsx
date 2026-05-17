import React, { useEffect, useState } from 'react';
import { AppView, NewsItem, User, ProgramItem } from '../types';
import { Settings, ChevronRight, ChevronLeft, CalendarDays, Music, FileText, Podcast, LogOut, MessageSquare, Menu, ScrollText, Mic, Users, RefreshCw, Play, Pause, Upload } from 'lucide-react';
import { LOGO_URL } from '../utils/scheduleData';
import Sidebar from './Sidebar';

interface Props {
  onNavigate: (view: AppView, data?: any) => void;
  news: NewsItem[];
  setNews: React.Dispatch<React.SetStateAction<NewsItem[]>>;
  users: User[]; 
  currentUser: User | null;
  onLogout: () => void;
  onSync: () => void;
  isSyncing: boolean;
  isPlaying: boolean;
  togglePlay: () => void;
  isRefreshing: boolean;
  onRefreshLive: () => void;
  currentProgram: ProgramItem;
  onMenuClick?: () => void;
  onBackup?: () => void;
}

const newsColors = [
  'bg-[#3E1E16]', 
  'bg-[#1a237e]', 
  'bg-[#004d40]', 
  'bg-[#b71c1c]', 
  'bg-[#4a148c]', 
  'bg-[#263238]',
];

const AdminDashboard: React.FC<Props> = ({ 
    onNavigate, 
    news, 
    setNews,
    users, 
    currentUser, 
    onLogout, 
    onSync, 
    isSyncing,
    isPlaying,
    togglePlay,
    isRefreshing,
    onRefreshLive,
    currentProgram,
    onMenuClick,
    onBackup
}) => {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

  // News Carousel Interval
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

  const handleNewsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        const date = lines[0].trim();
        const content = lines.slice(1).join('\n');
        const blocks = content.split(/Titular:/i).filter(b => b.trim());

        const newNews: NewsItem[] = blocks.map((block, index) => {
          const fuenteMatch = block.match(/Fuente:\s*([\s\S]*?)(?=\n\n|\nTexto|Texto|$)/i);
          const textoMatch = block.match(/Texto:\s*([\s\S]*?)$/i);
          
          // Extract title: it's the text from start of block until the first double newline or Fuente
          const titleMatch = block.trim().match(/^([\s\S]*?)(?=\n\n|\nFuente|Fuente|$)/i);
          const title = titleMatch ? titleMatch[1].trim() : 'Sin Título';
          const author = fuenteMatch ? fuenteMatch[1].trim() : 'Redacción RCM';
          const content = textoMatch ? textoMatch[1].trim() : '';
          
          return {
            id: `news-${Date.now()}-${index}`,
            title,
            author,
            content,
            category: 'General',
            date: date,
            excerpt: content.split('. ')[0] + '.'
          };
        });
        setNews(newNews);
        localStorage.setItem('rcm_data_news', JSON.stringify(newNews));
        alert(`${newNews.length} noticias cargadas correctamente.`);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="relative min-h-screen h-full bg-[#1A100C] font-display text-[#E8DCCF] flex flex-col pb-10 overflow-y-auto no-scrollbar">
      {/* Mobile Sticky Header */}
      <header className="sticky top-0 z-30 w-full px-4 pt-safe-top-extra pb-3 flex items-center justify-between bg-[#3E1E16] border-b border-[#9E7649]/20 shadow-md">
        <div className="flex items-center gap-3">
          <button 
              onClick={onMenuClick}
              className="text-[#F5EFE6] hover:text-[#9E7649] transition-colors p-1"
          >
              <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white overflow-hidden p-0 shadow-lg">
               <img src={LOGO_URL} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none tracking-tight">CMNL App</h1>
              <p className="text-[8px] text-[#9E7649] uppercase tracking-tighter mt-0.5">Panel Interno</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            {isSyncing && (
               <div className="flex items-center gap-2 text-[#9E7649] text-[10px] font-bold mr-2">
                   <RefreshCw size={12} className="animate-spin" />
               </div>
            )}
            <div className="text-right ml-1">
               <p className="text-[10px] font-bold text-white leading-none">{currentUser?.name || 'Admin'}</p>
               <p className="text-[8px] text-[#9E7649] flex items-center justify-end gap-1 mt-0.5">
                   <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                   {currentUser?.classification || 'Admin'}
               </p>
            </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto p-5 flex flex-col gap-6">
         
         {/* Welcome (Simplified) */}
         <div className="flex justify-between items-center">
            <h2 className="text-sm text-stone-400 font-medium">Panel de Control</h2>
            {currentUser?.classification === 'Administrador' && (
              <div className="flex gap-2">
                <button 
                 onClick={onBackup}
                 className="text-xs bg-[#2C1B15] text-[#9E7649] border border-[#9E7649]/30 px-3 py-1.5 rounded-lg font-bold hover:bg-[#9E7649]/10 transition-all"
                >
                  Respaldar sistema
                </button>
                <button 
                 onClick={onSync}
                 disabled={isSyncing}
                 className={`text-xs bg-[#9E7649] text-[#3E1E16] px-3 py-1.5 rounded-lg font-bold transition-all ${isSyncing ? 'opacity-50' : 'hover:scale-105 active:scale-95'}`}
                 title="Actualizar Datos del Sistema"
                >
                  {isSyncing ? 'Sincronizando...' : 'Actualizar Sistema'}
                </button>
              </div>
            )}
         </div>

         {/* Live Program Widget with Integrated Player */}
         <div>
            <div className="flex items-center justify-between mb-3 px-1">
               <h2 className="text-lg font-bold text-white flex items-center gap-2">
                 <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                 </span>
                 En el Aire
               </h2>
            </div>

            <div className="relative bg-[#2C1B15] rounded-xl overflow-hidden border border-[#9E7649]/10 group shadow-lg">
               <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600"></div>
               <div className="p-4 flex items-center gap-3">
                  
                  {/* Vector Visualization (Left) */}
                  <div className="relative shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-black/20 flex items-center justify-center border border-white/5">
                      <div className="flex gap-0.5 h-6 items-end">
                          <div className={`w-1 bg-[#9E7649] ${isPlaying ? 'animate-soundbar-1' : 'h-2'}`}></div>
                          <div className={`w-1 bg-[#9E7649] ${isPlaying ? 'animate-soundbar-2' : 'h-4'}`}></div>
                          <div className={`w-1 bg-[#9E7649] ${isPlaying ? 'animate-soundbar-3' : 'h-1'}`}></div>
                          <div className={`w-1 bg-[#9E7649] ${isPlaying ? 'animate-soundbar-4' : 'h-3'}`}></div>
                          <div className={`w-1 bg-[#9E7649] ${isPlaying ? 'animate-soundbar-5' : 'h-2'}`}></div>
                      </div>
                  </div>

                  {/* Info (Center) */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                     <div className="flex items-center gap-2 mb-0.5">
                         <span className="bg-red-600/20 text-red-500 text-[8px] font-bold px-1.5 py-0.5 rounded border border-red-600/20 uppercase tracking-wider">En Vivo</span>
                     </div>
                     <h4 className="text-white font-bold text-sm sm:text-base leading-tight line-clamp-2">{currentProgram.name}</h4>
                     <p className="text-[#9E7649] text-xs font-medium truncate">{currentProgram.time}</p>
                  </div>

                  {/* Controls (Right) */}
                  <div className="flex items-center gap-3 shrink-0">
                      <button 
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-[#9E7649] text-[#3E1E16] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                        title={isPlaying ? "Pausar" : "Reproducir"}
                      >
                         {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                      </button>
                      <button 
                          onClick={onRefreshLive}
                          className={`w-10 h-10 rounded-full bg-[#2C1B15] border border-[#9E7649]/30 text-[#9E7649] flex items-center justify-center shadow-lg hover:bg-[#9E7649]/10 active:scale-95 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                          title="Actualizar señal"
                      >
                          <RefreshCw size={18} />
                      </button>
                  </div>
               </div>
               {/* Background blur effect */}
               <div className="absolute inset-0 z-[-1] opacity-20 bg-cover bg-center blur-xl" style={{ backgroundImage: `url(${currentProgram.image})` }}></div>
            </div>
         </div>

         {/* News Carousel */}
         <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-3 px-1">
                 <h2 className="text-lg font-bold text-white">Noticias Recientes</h2>
                 <div className="flex items-center gap-2">
                     {currentUser?.role === 'admin' && (
                        <label className="flex items-center gap-2 bg-[#C69C6D] hover:bg-[#b58b5c] text-white px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                            <Upload size={14} />
                            <span>Cargar Noticias</span>
                            <input type="file" accept=".txt" onChange={handleNewsUpload} className="hidden" />
                        </label>
                     )}
                 </div>
            </div>

            {activeNews ? (
                <div 
                    onClick={() => onNavigate(AppView.SECTION_NEWS_DETAIL, activeNews)} 
                    className={`relative cursor-pointer rounded-xl ${currentColor} overflow-hidden shadow-sm border border-[#9E7649]/10 hover:border-[#9E7649]/30 transition-all min-h-[200px] flex-1 group`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>

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

                  <div className="absolute inset-0 p-6 px-12 sm:px-14 flex flex-col justify-center items-start text-left overflow-hidden">
                      <div className="flex items-center gap-1 mb-4 shrink-0">
                        {news.slice(0, 6).map((_, idx) => (
                            <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === (currentNewsIndex % 6) ? 'bg-white' : 'bg-white/30'}`}></div>
                        ))}
                      </div>
                      <div className="overflow-y-auto no-scrollbar w-full flex-1 pt-2">
                          <h3 className="text-lg sm:text-2xl font-bold text-white leading-tight mb-3 text-left">{activeNews.title}</h3>
                          <p className="text-sm sm:text-base text-[#E8DCCF]/90 leading-relaxed text-justify w-full pb-2">
                            {activeNews.content}
                          </p>
                      </div>
                  </div>
                </div>
            ) : (
                <div className="p-6 bg-[#2C1B15] rounded-xl border border-[#9E7649]/10 text-center text-xs text-[#E8DCCF]/50">
                    No hay noticias cargadas. Ir a Ajustes para gestionar.
                </div>
            )}
         </div>
         
      </main>

      {/* FAB - Worker Group */}
      <a 
         href="https://chat.whatsapp.com/BBalNMYSJT9CHQybLUVg5v" 
         target="_blank" 
         rel="noopener noreferrer"
         className="fixed right-5 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl shadow-black/20 flex items-center justify-center border-2 border-white/10 hover:scale-105 active:scale-95 transition-all"
         style={{ bottom: 'calc(6rem + var(--sab))' }}
         title="Grupo de Trabajo WhatsApp"
      >
         <MessageSquare size={28} fill="white" />
      </a>
      
      <style>{`
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
