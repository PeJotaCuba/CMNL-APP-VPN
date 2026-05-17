import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Construction, Radio, Calendar, Music, FileText, Podcast, Clock, User, MessageCircle, X, Edit2, Save, Plus, Trash2, Upload } from 'lucide-react';
import { NewsItem, ProgramFicha } from '../types';
import CMNLHeader from './CMNLHeader';
import { generateProgramming, ProgramSchedule } from '../src/services/programmingService';
import { INITIAL_FICHAS } from '../utils/fichasData';

interface ViewProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  onMenuClick?: () => void;
  type?: 'agenda' | 'music' | 'scripts' | 'schedule';
  customContent?: string;
  newsItem?: NewsItem | null;
  user?: { name: string; role: string; photo?: string } | null;
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>, type: 'history') => void;
  onNewsUpdate?: (updatedNews: NewsItem) => void;
}

const newsColors = [
  'bg-[#3E1E16]', 
  'bg-[#1a237e]', 
  'bg-[#004d40]', 
  'bg-[#b71c1c]', 
  'bg-[#4a148c]', 
  'bg-[#263238]',
];

const formatTo12Hour = (timeStr: string): string => {
    if (!timeStr || !timeStr.includes(':')) return timeStr;
    // If already formatted with AM/PM, return as is
    if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) {
        return timeStr.trim();
    }
    try {
        const [hourStr, minStr] = timeStr.trim().split(':');
        let hour = parseInt(hourStr, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12; // the hour '0' should be '12'
        return `${hour}:${minStr} ${ampm}`;
    } catch (e) {
        return timeStr;
    }
};

import { LOGO_URL } from '../utils/scheduleData';

export const PlaceholderView: React.FC<ViewProps> = ({ title, subtitle, onBack, customContent, newsItem, onUpload, user, onNewsUpdate }) => {
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [isEditingNews, setIsEditingNews] = useState(false);
  const [isEditingProgramming, setIsEditingProgramming] = useState(false);
  const [editForm, setEditForm] = useState<NewsItem | null>(null);
  const [editedProgramming, setEditedProgramming] = useState<ProgramSchedule[] | null>(null);
  
  const isProgramming = title.includes('Programación');
  // Logic to show FAB on specific public views (History, About, Programming)
  const showListenerFab = title.includes('Historia') || title.includes('Quiénes Somos') || title.includes('Programación');

  const handleEditNewsClick = () => {
    if (newsItem) {
      setEditForm({ ...newsItem });
      setIsEditingNews(true);
    }
  };

  const handleSaveNewsEdit = () => {
    if (editForm && onNewsUpdate) {
      onNewsUpdate(editForm);
      setIsEditingNews(false);
    }
  };

  const programmingData = useMemo(() => {
    if (!isProgramming) return null;
    
    const savedFichas = localStorage.getItem('rcm_data_fichas');
    const fichas: ProgramFicha[] = savedFichas ? JSON.parse(savedFichas) : INITIAL_FICHAS;
    
    // Fichas change detection
    const fichasHash = JSON.stringify(fichas.map(f => ({ n: f.name, f: f.frequency, s: f.schedule })));
    const lastHash = localStorage.getItem('rcm_fichas_hash');
    
    let allPrograms: ProgramSchedule[] = [];
    
    if (fichasHash !== lastHash) {
        // Fichas changed! Regenerate programming and ignore manual data
        allPrograms = generateProgramming(fichas);
        localStorage.setItem('rcm_manual_programming', JSON.stringify(allPrograms));
        localStorage.setItem('rcm_fichas_hash', fichasHash);
    } else {
        // Use manual data if available
        const manualData = localStorage.getItem('rcm_manual_programming');
        if (manualData && manualData !== '[]') {
            try {
                allPrograms = JSON.parse(manualData);
            } catch(e) {
                allPrograms = generateProgramming(fichas);
            }
        } else {
            allPrograms = generateProgramming(fichas);
        }
    }
    
    if (allPrograms.length === 0) {
        allPrograms = generateProgramming(fichas);
    }

    // Ensure sorting by time
    const getMinutes = (time: string) => {
        const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
            let h = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            const ampm = match[3].toUpperCase();
            if (ampm === 'PM' && h < 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            return h * 60 + m;
        }
        const [h, m] = time.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    };

    allPrograms.sort((a, b) => {
        // Special case: Cómplices first on Sunday
        if (a.name.toLowerCase().includes('cómplices') && a.days.includes(0) && b.days.includes(0)) return -1;
        if (b.name.toLowerCase().includes('cómplices') && b.days.includes(0) && a.days.includes(0)) return 1;
        return getMinutes(a.start) - getMinutes(b.start);
    });

    const monFri = allPrograms.filter(p => p.days.some(d => [1, 2, 3, 4, 5].includes(d)));
    const saturday = allPrograms.filter(p => p.days.includes(6));
    const sunday = allPrograms.filter(p => p.days.includes(0));

    return { monFri, saturday, sunday, all: allPrograms };
  }, [isProgramming, isEditingProgramming]); // Re-run when isEditingProgramming changes (after save)

  const handleStartEdit = () => {
      setEditedProgramming(programmingData?.all || []);
      setIsEditingProgramming(true);
  };

  const handleSaveEdit = () => {
      if (editedProgramming) {
          localStorage.setItem('rcm_manual_programming', JSON.stringify(editedProgramming));
          setIsEditingProgramming(false);
      }
  };

  const handleCancelEdit = () => {
      setIsEditingProgramming(false);
      setEditedProgramming(null);
  };

  const updateProgram = (index: number, field: keyof ProgramSchedule, value: any) => {
      if (!editedProgramming) return;
      const newProg = [...editedProgramming];
      newProg[index] = { ...newProg[index], [field]: value };
      setEditedProgramming(newProg);
  };

  const addProgram = () => {
      if (!editedProgramming) return;
      const newProg = [...editedProgramming, { name: 'Nuevo Programa', start: '00:00', end: '00:00', days: [1,2,3,4,5] }];
      setEditedProgramming(newProg);
  };

  const removeProgram = (index: number) => {
      if (!editedProgramming) return;
      const newProg = editedProgramming.filter((_, i) => i !== index);
      setEditedProgramming(newProg);
  };

  const toggleDay = (index: number, day: number) => {
      if (!editedProgramming) return;
      const newProg = [...editedProgramming];
      const days = [...newProg[index].days];
      if (days.includes(day)) {
          newProg[index].days = days.filter(d => d !== day);
      } else {
          newProg[index].days = [...days, day].sort();
      }
      setEditedProgramming(newProg);
  };

  // Specific Layout for News Detail
  if (newsItem) {
      // Deterministic color based on id or length
      const colorIndex = newsItem.title.length % newsColors.length;
      const headerColor = newsColors[colorIndex];

      return (
        <div className="flex flex-col h-full w-full bg-[#2C1B15] text-[#E8DCCF]">
             <div className={`relative h-56 flex flex-col justify-end ${headerColor}`}>
                 <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-[#1A100C] opacity-80"></div>
                 <button onClick={onBack} className="absolute top-4 left-4 p-2 bg-black/40 text-white rounded-full backdrop-blur-md z-10 border border-white/10 hover:bg-white/20 transition-all">
                    <ArrowLeft size={24} />
                 </button>
                 <div className="absolute top-4 right-4 z-10">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden p-1.5">
                       <img src={LOGO_URL} alt="Logo CMNL" className="w-full h-full object-contain" />
                    </div>
                 </div>
                 <div className="relative p-6 z-10">
                    <h1 className="text-2xl font-bold text-white leading-tight shadow-sm mb-2">{newsItem.title}</h1>
                    {user?.role === 'admin' && (
                        <button onClick={handleEditNewsClick} className="mt-2 text-xs bg-white/20 hover:bg-white/40 text-white px-3 py-1 rounded-full backdrop-blur-md transition-all">
                            Editar Noticia
                        </button>
                    )}
                 </div>
             </div>
             <div className="flex-1 p-6 overflow-y-auto">
                 <div className="flex items-center gap-4 text-xs text-[#9E7649] mb-6 border-b border-[#9E7649]/20 pb-4">
                     <span className="flex items-center gap-1"><User size={14}/> Fuente: {newsItem.author}</span>
                     <span className="flex items-center gap-1"><Clock size={14}/> {newsItem.date}</span>
                 </div>
                 <div className="prose prose-invert prose-p:text-[#E8DCCF]/80 prose-headings:text-white max-w-none">
                     {newsItem.content.split('\n').map((paragraph, i) => (
                         <p key={i} className="mb-4 leading-relaxed">{paragraph}</p>
                     ))}
                 </div>
             </div>
             {isEditingNews && editForm && (
                 <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                     <div className="bg-[#2C1B15] border border-[#9E7649]/30 p-6 rounded-xl w-full max-w-lg text-[#E8DCCF]">
                         <h2 className="text-lg font-bold mb-4">Editar Noticia</h2>
                         <input className="w-full p-2 mb-2 bg-[#1A100C] border border-[#9E7649]/30 rounded" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Titular" />
                         <input className="w-full p-2 mb-2 bg-[#1A100C] border border-[#9E7649]/30 rounded" value={editForm.author} onChange={e => setEditForm({...editForm, author: e.target.value})} placeholder="Fuente" />
                         <input className="w-full p-2 mb-2 bg-[#1A100C] border border-[#9E7649]/30 rounded" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} placeholder="Fecha" />
                         <textarea className="w-full p-2 mb-4 bg-[#1A100C] border border-[#9E7649]/30 rounded h-40" value={editForm.content} onChange={e => setEditForm({...editForm, content: e.target.value})} placeholder="Texto" />
                         <div className="flex justify-end gap-2">
                             <button onClick={() => setIsEditingNews(false)} className="px-4 py-2 bg-black/40 rounded">Cancelar</button>
                             <button onClick={handleSaveNewsEdit} className="px-4 py-2 bg-[#9E7649] text-white rounded">Guardar</button>
                         </div>
                     </div>
                 </div>
             )}
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#FDFCF8] text-[#4A3B32]">
      <div className="bg-[#5D3A24] text-white p-4 pt-8 flex items-center justify-between shadow-md z-10 sticky top-0">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
            </button>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-lg overflow-hidden p-1.5">
               <img src={LOGO_URL} alt="Logo CMNL" className="w-full h-full object-contain" />
            </div>
            <div>
            <h2 className="font-serif font-bold text-lg leading-tight">{title}</h2>
            {subtitle && <p className="text-xs text-[#E8DCCF] opacity-80">{subtitle}</p>}
            </div>
        </div>
        
        <div className="flex gap-2">
            {onUpload && (
                <label className="flex items-center gap-2 bg-[#C69C6D] hover:bg-[#b58b5c] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                    <Upload size={16} />
                    <span>Cargar (.txt)</span>
                    <input type="file" accept=".txt" onChange={(e) => onUpload(e, 'history')} className="hidden" />
                </label>
            )}
            {isProgramming && user?.role === 'admin' && (
                <>
                    {isEditingProgramming ? (
                        <>
                            <button onClick={handleSaveEdit} className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold">
                                <Save size={18} /> Guardar
                            </button>
                            <button onClick={handleCancelEdit} className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold">
                                <X size={18} /> Cancelar
                            </button>
                        </>
                    ) : (
                        <button onClick={handleStartEdit} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold">
                            <Edit2 size={18} /> Editar
                        </button>
                    )}
                </>
            )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 pb-24"> {/* Added pb-24 for player clearance */}
        {isProgramming ? (
          isEditingProgramming ? (
              <div className="max-w-4xl mx-auto space-y-4">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-[#5D3A24]">Editor de Programación</h3>
                      <button onClick={addProgram} className="bg-[#5D3A24] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                          <Plus size={18} /> Añadir Programa
                      </button>
                  </div>
                  <div className="space-y-3">
                      {editedProgramming?.map((p, idx) => (
                          <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-[#5D3A24]/10 flex flex-col gap-3">
                              <div className="flex justify-between gap-4">
                                  <input 
                                    type="text" 
                                    value={p.name} 
                                    onChange={(e) => updateProgram(idx, 'name', e.target.value)}
                                    className="flex-1 border-b border-[#5D3A24]/20 p-1 font-bold text-[#5D3A24] focus:outline-none focus:border-[#5D3A24]"
                                    placeholder="Nombre del programa"
                                  />
                                  <button onClick={() => removeProgram(idx)} className="text-red-500 p-1 hover:bg-red-50 rounded">
                                      <Trash2 size={18} />
                                  </button>
                              </div>
                              <div className="flex gap-4 items-center">
                                  <div className="flex items-center gap-2">
                                      <span className="text-xs text-[#9E7649] font-bold">Inicio:</span>
                                      <input 
                                        type="text" 
                                        value={p.start} 
                                        onChange={(e) => updateProgram(idx, 'start', e.target.value)}
                                        className="border border-[#5D3A24]/20 rounded px-2 py-1 text-sm w-20"
                                        placeholder="00:00"
                                      />
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <span className="text-xs text-[#9E7649] font-bold">Fin:</span>
                                      <input 
                                        type="text" 
                                        value={p.end} 
                                        onChange={(e) => updateProgram(idx, 'end', e.target.value)}
                                        className="border border-[#5D3A24]/20 rounded px-2 py-1 text-sm w-20"
                                        placeholder="00:00"
                                      />
                                  </div>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                  {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((day, dIdx) => (
                                      <button 
                                        key={dIdx}
                                        onClick={() => toggleDay(idx, dIdx)}
                                        className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${p.days.includes(dIdx) ? 'bg-[#5D3A24] text-white' : 'bg-[#F5F0EB] text-[#9E7649]'}`}
                                      >
                                          {day}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          ) : (
          <div className="max-w-2xl mx-auto space-y-8">
             <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#5D3A24]/10">
               <div className="p-4 bg-[#F5F0EB] border-b border-[#5D3A24]/10">
                  <h3 className="font-bold text-[#5D3A24] uppercase tracking-wide text-sm">Lunes a Viernes</h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-[#5D3A24] text-white">
                       <tr>
                          <th className="px-4 py-3 font-semibold">Programa</th>
                          <th className="px-4 py-3 font-semibold">Horario</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[#5D3A24]/10">
                       {programmingData?.monFri.map((p, idx) => (
                         <tr key={idx} className={idx % 2 === 0 ? "bg-[#FDFCF8]" : "bg-[#F5F0EB]"}>
                           <td className="px-4 py-3 font-medium">
                             {p.name}
                             {p.parent && <span className="text-xs text-[#9E7649] block font-normal italic">Dentro de {p.parent}</span>}
                           </td>
                           <td className="px-4 py-3">{formatTo12Hour(p.start)} - {formatTo12Hour(p.end)}</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
             </div>

             <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#5D3A24]/10">
               <div className="p-4 bg-[#F5F0EB] border-b border-[#5D3A24]/10">
                  <h3 className="font-bold text-[#5D3A24] uppercase tracking-wide text-sm">Sábado</h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-[#5D3A24] text-white">
                       <tr>
                          <th className="px-4 py-3 font-semibold">Programa</th>
                          <th className="px-4 py-3 font-semibold">Horario</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[#5D3A24]/10">
                       {programmingData?.saturday.map((p, idx) => (
                         <tr key={idx} className={idx % 2 === 0 ? "bg-[#FDFCF8]" : "bg-[#F5F0EB]"}>
                           <td className="px-4 py-3 font-medium">
                             {p.name}
                             {p.parent && <span className="text-xs text-[#9E7649] block font-normal italic">Dentro de {p.parent}</span>}
                           </td>
                           <td className="px-4 py-3">{formatTo12Hour(p.start)} - {formatTo12Hour(p.end)}</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
             </div>

             <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#5D3A24]/10">
               <div className="p-4 bg-[#F5F0EB] border-b border-[#5D3A24]/10">
                  <h3 className="font-bold text-[#5D3A24] uppercase tracking-wide text-sm">Domingo</h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-[#5D3A24] text-white">
                       <tr>
                          <th className="px-4 py-3 font-semibold">Programa</th>
                          <th className="px-4 py-3 font-semibold">Horario</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[#5D3A24]/10">
                       {programmingData?.sunday.map((p, idx) => (
                         <tr key={idx} className={idx % 2 === 0 ? "bg-[#FDFCF8]" : "bg-[#F5F0EB]"}>
                           <td className="px-4 py-3 font-medium">
                             {p.name}
                             {p.parent && <span className="text-xs text-[#9E7649] block font-normal italic">Dentro de {p.parent}</span>}
                           </td>
                           <td className="px-4 py-3">{formatTo12Hour(p.start)} - {formatTo12Hour(p.end)}</td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
               </div>
             </div>
          </div>
        )
      ) : customContent ? (
            <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-[#5D3A24]/10 whitespace-pre-wrap">
                {customContent}
            </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-50">
             <Construction size={48} className="text-[#8B5E3C] mb-4" />
             <p className="text-center font-medium">Contenido no cargado.</p>
             <p className="text-center text-xs mt-2">Contacte al administrador para actualizar.</p>
          </div>
        )}
      </div>

      {/* Floating WhatsApp Menu for Listener Views */}
      {showListenerFab && (
          <div className="fixed bottom-24 right-5 z-40 flex flex-col items-end gap-3">
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
      )}
    </div>
  );
};

export const CMNLAppView: React.FC<ViewProps> = ({ title, type, onBack, onMenuClick, user }) => {
  const getIcon = () => {
    switch(type) {
      case 'agenda': return <Calendar size={48} />;
      case 'music': return <Music size={48} />;
      case 'scripts': return <FileText size={48} />;
      case 'schedule': return <Podcast size={48} />;
      default: return <Radio size={48} />;
    }
  };

  const getBgColor = () => {
    switch(type) {
      case 'agenda': return 'bg-[#2a1b12]'; // Dark Brown
      case 'music': return 'bg-[#1a237e]'; // Deep Blue
      case 'scripts': return 'bg-[#1b5e20]'; // Deep Green
      case 'schedule': return 'bg-[#b71c1c]'; // Deep Red
      default: return 'bg-[#2a1b12]';
    }
  };

  return (
    <div className={`flex flex-col h-full w-full ${getBgColor()} text-white overflow-hidden`}>
      <CMNLHeader 
          user={user || null}
          sectionTitle={title}
          onMenuClick={onMenuClick}
          onBack={onBack}
      />

      <div className="flex-1 relative">
          <div className="flex flex-col p-6 h-full">
            <div className="w-full h-40 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-6 shadow-inner">
               {getIcon()}
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="h-12 w-full bg-white/5 rounded-lg animate-pulse"></div>
              <div className="h-24 w-full bg-white/5 rounded-lg animate-pulse"></div>
              <div className="h-12 w-full bg-white/5 rounded-lg animate-pulse"></div>
            </div>

            <div className="mt-auto text-center opacity-60 text-xs uppercase tracking-widest">
               Módulo de Gestión Interna
            </div>
          </div>
      </div>
    </div>
  );
};