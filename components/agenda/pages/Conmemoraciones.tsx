import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MONTHS_DATA } from '../constants';
import { getCurrentDateInfo } from '../utils/dateUtils';
import { UserProfile, UserRole, ConmemoracionesData, Conmemoracion } from '../types';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from "docx";
import AgendaHeader from '../components/AgendaHeader';

interface ConmemoracionesProps {
  user: UserProfile;
  data: ConmemoracionesData;
  onUpdate: (data: ConmemoracionesData) => void;
  onMenuClick?: () => void;
}

const Conmemoraciones: React.FC<ConmemoracionesProps> = ({ user, data, onUpdate, onMenuClick }) => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [daySearch, setDaySearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInfo = getCurrentDateInfo();

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processTxtData(text, true);
      alert("Conmemoraciones cargadas con éxito.");
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const processTxtData = (text: string, isUpload: boolean = false) => {
      const lines = text.split('\n');
      const newData: ConmemoracionesData = isUpload ? { ...data } : { ...data, [selectedMonth as string]: [] };
      
      let currentMonth = isUpload ? "" : (selectedMonth as string);
      let currentDay = 0;
      let currentNational = "";
      let currentInternational = "";

      const saveCurrent = () => {
        if (currentMonth && currentDay > 0 && (currentNational || currentInternational)) {
          if (!newData[currentMonth]) newData[currentMonth] = [];
          
          const existsIdx = newData[currentMonth].findIndex(c => c.day === currentDay);
          if (existsIdx >= 0) {
             newData[currentMonth][existsIdx] = {
              day: currentDay,
              national: currentNational || newData[currentMonth][existsIdx].national,
              international: currentInternational || newData[currentMonth][existsIdx].international
             };
          } else {
             newData[currentMonth].push({
              day: currentDay,
              national: currentNational,
              international: currentInternational
             });
          }
        }
      };

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const dayMonthMatch = trimmed.match(/Día\s+(\d+)\s+de\s+([a-zA-ZáéíóúÁÉÍÓÚ]+)/i);
        if (dayMonthMatch) {
          saveCurrent(); // Save previous if any
          currentDay = parseInt(dayMonthMatch[1]);
          currentMonth = dayMonthMatch[2].charAt(0).toUpperCase() + dayMonthMatch[2].slice(1).toLowerCase();
          currentNational = "";
          currentInternational = "";
          return;
        }

        if (trimmed.toLowerCase().startsWith("conmemoraciones nacionales:")) {
          currentNational = trimmed.split(":")[1].trim();
        } else if (trimmed.toLowerCase().startsWith("conmemoraciones internacionales:")) {
          currentInternational = trimmed.split(":")[1].trim();
        }
      });

      saveCurrent(); // Save last one
      onUpdate(newData);
  };

  const handleClearMonth = () => {
      if (!selectedMonth) return;
      if (confirm(`¿Estás seguro de BORRAR todas las conmemoraciones de ${selectedMonth}?`)) {
          const newData = { ...data };
          delete newData[selectedMonth];
          onUpdate(newData);
          alert(`Conmemoraciones de ${selectedMonth} limpiadas correctamente.`);
      }
  };

  const startEditing = () => {
      if (!selectedMonth) return;
      let txt = '';
      const monthEvents = data[selectedMonth] || [];
      const days = Array.from(new Set(monthEvents.map(e => e.day))).sort((a: number, b: number) => a - b);
      days.forEach(day => {
          txt += `Día ${day} de ${selectedMonth}\n`;
          monthEvents.filter(e => e.day === day).forEach(ev => {
              if (ev.national) txt += `Conmemoraciones Nacionales: ${ev.national}\n`;
              if (ev.international) txt += `Conmemoraciones Internacionales: ${ev.international}\n`;
          });
          txt += `\n`;
      });
      setEditText(txt);
      setIsEditing(true);
  };

  const saveEdit = () => {
      processTxtData(editText, false);
      setIsEditing(false);
      alert("Información editada con éxito.");
  };

  const handleDownloadDocx = () => {
    // Download logic
  };

  const renderUploadBtn = () => {
    if (user.role !== UserRole.ADMIN) return null;
    return (
      <div className="px-4 py-6 border-t border-white/10 mt-auto bg-card-dark">
        <input type="file" accept=".txt" ref={fileInputRef} className="hidden" onChange={handleUpload} />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-3 bg-admin-red text-white py-4 rounded-2xl font-bold text-xs shadow-xl active:scale-95 transition-all mb-3"
        >
          <span className="material-symbols-outlined text-sm">upload_file</span>
          Cargar Conmemoraciones (TXT)
        </button>
        <div className="p-3 bg-black/20 rounded-xl border border-white/5 text-[9px] text-text-secondary font-mono leading-relaxed">
            <p className="font-bold text-admin-red mb-1 uppercase tracking-widest">Formato Requerido:</p>
            Día 10 de Octubre<br/>
            Conmemoraciones Nacionales: Inicio de las Guerras...<br/>
            Conmemoraciones Internacionales: Día de la Salud Mental...
        </div>
      </div>
    );
  };

  if (selectedMonth) {
    let monthEvents = (data[selectedMonth] || []).sort((a, b) => a.day - b.day);
    
    if (daySearch) {
      const dayNum = parseInt(daySearch);
      if (!isNaN(dayNum)) {
        monthEvents = monthEvents.filter(e => e.day === dayNum);
      }
    }

    return (
      <div className="h-full flex flex-col bg-background-dark">
        <AgendaHeader 
          title={`Conmemoraciones - ${selectedMonth}`} 
          user={user} 
          onMenuClick={onMenuClick} 
          onBack={() => { setSelectedMonth(null); setDaySearch(''); setIsEditing(false); }}
        />
        
        <div className="flex-none flex flex-col bg-card-dark/95 backdrop-blur px-4 py-3 border-b border-white/5 z-20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 text-xs text-text-secondary">
               {isEditing && "Modo de edición TXT"}
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && user.role === UserRole.ADMIN && (
                 <>
                    <button onClick={startEditing} className="flex size-10 items-center justify-center rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all" title="Editar información TXT">
                       <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={handleClearMonth} className="flex size-10 items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all" title="Limpiar todo">
                       <span className="material-symbols-outlined text-sm">delete_sweep</span>
                    </button>
                 </>
              )}
              {!isEditing && (
                <button onClick={handleDownloadDocx} className="flex size-10 items-center justify-center rounded-full bg-admin-red/20 text-admin-red hover:bg-admin-red hover:text-white transition-all">
                    <span className="material-symbols-outlined text-sm">description</span>
                </button>
              )}
              {isEditing && (
                 <button onClick={saveEdit} className="bg-admin-red text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">
                    Guardar
                 </button>
              )}
            </div>
          </div>
          {!isEditing && (
            <div className="relative">
               <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-text-secondary">search</span>
               <input 
                type="number" 
                placeholder="Día específico..."
                value={daySearch}
                onChange={(e) => setDaySearch(e.target.value)}
                className="w-full bg-background-dark border-none rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:ring-1 focus:ring-primary shadow-inner"
               />
            </div>
          )}
        </div>

        <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6 pb-32">
          {isEditing ? (
             <textarea
               value={editText}
               onChange={(e) => setEditText(e.target.value)}
               className="w-full h-full min-h-[60vh] bg-background-dark/50 border border-white/10 rounded-2xl p-4 text-xs font-mono text-white/90 focus:ring-2 focus:ring-admin-red focus:outline-none resize-none"
               placeholder="Pega o edita el texto aquí..."
             />
          ) : monthEvents.length === 0 ? (
            <div className="text-center py-20">
              <span className="material-symbols-outlined text-5xl text-white/10 mb-2">festival</span>
              <p className="text-text-secondary text-sm">No hay conmemoraciones cargadas para esta selección.</p>
            </div>
          ) : (
            monthEvents.map((ev, i) => (
              <div key={i} className="bg-card-dark border border-white/5 rounded-3xl overflow-hidden shadow-xl shadow-black/20">
                <div className="bg-admin-red/10 px-5 py-3 flex justify-between items-center border-b border-white/5">
                  <span className="text-admin-red font-bold text-lg tracking-tight">Día {ev.day}</span>
                  <span className="text-[10px] font-bold text-admin-red/60 uppercase tracking-widest">{selectedMonth}</span>
                </div>
                <div className="p-5 space-y-4">
                  {ev.national && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-admin-red uppercase tracking-widest">Nacionales</span>
                      <p className="text-white text-sm leading-relaxed">{ev.national}</p>
                    </div>
                  )}
                  {ev.international && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Internacionales</span>
                      <p className="text-white text-sm leading-relaxed">{ev.international}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </main>
        {!isEditing && renderUploadBtn()}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background-dark">
      <AgendaHeader 
        title="Conmemoraciones" 
        user={user} 
        onMenuClick={onMenuClick} 
        onBack={() => navigate('/home')}
      />

      <main className="flex-1 overflow-y-auto no-scrollbar flex flex-col pb-32">
        <div className="px-4 pt-8 pb-4 text-center">
          <div className="size-16 mx-auto bg-admin-red/20 rounded-2xl flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-admin-red text-3xl">celebration</span>
          </div>
          <h2 className="text-white text-4xl font-bold tracking-tight mb-2">{dateInfo.year}</h2>
          <p className="text-text-secondary text-sm font-medium px-8">Fechas patrias y efemérides mundiales.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
          {MONTHS_DATA.map((month) => {
            const isCurrent = month.name.toLowerCase() === dateInfo.monthName.toLowerCase();
            const hasData = data[month.name]?.length > 0;
            return (
              <button 
                key={month.id}
                onClick={() => setSelectedMonth(month.name)}
                className={`relative h-24 flex flex-col items-center justify-center rounded-2xl border transition-all active:scale-95 ${isCurrent ? 'bg-admin-red border-transparent shadow-lg shadow-admin-red/20' : 'bg-card-dark border-white/5'}`}
              >
                <p className={`text-xl font-bold ${isCurrent ? 'text-white' : 'text-white/80'}`}>{month.name}</p>
                {hasData && (
                  <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${isCurrent ? 'text-white/60' : 'text-admin-red/60'}`}>
                    {data[month.name].length} fechas
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {renderUploadBtn()}
      </main>
    </div>
  );
};

export default Conmemoraciones;
