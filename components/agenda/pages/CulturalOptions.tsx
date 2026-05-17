import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MONTHS_DATA } from '../constants';
import { getCurrentDateInfo } from '../utils/dateUtils';
import { UserProfile, UserRole, CulturalOptionsData, CulturalOption } from '../types';
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import AgendaHeader from '../components/AgendaHeader';

interface CulturalOptionsProps {
  user: UserProfile;
  data: CulturalOptionsData;
  onUpdate: (data: CulturalOptionsData) => void;
  onMenuClick?: () => void;
  onBack: () => void;
}

const CulturalOptions: React.FC<CulturalOptionsProps> = ({ user, data, onUpdate, onMenuClick, onBack }) => {
  const navigate = useNavigate();
  const [showNextMonth, setShowNextMonth] = useState(false);
  const [daySearch, setDaySearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInfo = getCurrentDateInfo();

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  // Calculate current and next month names
  const currentMonthName = dateInfo.monthName.charAt(0).toUpperCase() + dateInfo.monthName.slice(1).toLowerCase();
  const currentMonthIndex = MONTHS_DATA.findIndex(m => m.name.toLowerCase() === currentMonthName.toLowerCase());
  const nextMonthIndex = (currentMonthIndex + 1) % 12;
  const nextMonthName = MONTHS_DATA[nextMonthIndex].name;

  const activeMonthName = showNextMonth ? nextMonthName : currentMonthName;

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processTxtData(text, true);
      alert(`Opciones Culturales para ${activeMonthName} cargadas con éxito.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const processTxtData = (text: string, isUpload: boolean = false) => {
      const lines = text.split('\n');
      const newData: CulturalOptionsData = isUpload ? { ...data } : { ...data, [activeMonthName]: [] };
      
      let currentDay = 0;
      let currentActivity: Partial<CulturalOption> = {};
      let parsedDays: Record<number, CulturalOption[]> = {};

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const dayMatch = trimmed.match(/^D[IÍ]A\s+(\d+)/i);
        if (dayMatch) {
          currentDay = parseInt(dayMatch[1]);
          if (!parsedDays[currentDay]) parsedDays[currentDay] = [];
          return;
        }

        if (currentDay > 0) {
          if (trimmed.toLowerCase().startsWith('actividad:')) {
            if (currentActivity.actividad) {
              parsedDays[currentDay].push(currentActivity as CulturalOption);
              currentActivity = {};
            }
            currentActivity.actividad = trimmed.substring(10).trim();
          } else if (trimmed.toLowerCase().startsWith('hora:')) {
            currentActivity.hora = trimmed.substring(5).trim();
          } else if (trimmed.toLowerCase().startsWith('lugar:')) {
            currentActivity.lugar = trimmed.substring(6).trim();
            parsedDays[currentDay].push(currentActivity as CulturalOption);
            currentActivity = {};
          }
        }
      });

      if (currentActivity.actividad && currentDay > 0) {
        parsedDays[currentDay].push({
          actividad: currentActivity.actividad || '',
          hora: currentActivity.hora || '',
          lugar: currentActivity.lugar || ''
        });
      }

      if (!newData[activeMonthName]) newData[activeMonthName] = [];

      let monthData = [...newData[activeMonthName]];
      
      Object.keys(parsedDays).forEach(dayStr => {
        const dayNum = parseInt(dayStr);
        monthData = monthData.filter(d => d.day !== dayNum);
        monthData.push({
          day: dayNum,
          activities: parsedDays[dayNum]
        });
      });

      newData[activeMonthName] = monthData;
      onUpdate(newData);
  };

  const handleClearMonth = () => {
      if (confirm(`¿Estás seguro de BORRAR todas las opciones culturales de ${activeMonthName}?`)) {
          const newData = { ...data };
          delete newData[activeMonthName];
          onUpdate(newData);
          alert(`Opciones culturales de ${activeMonthName} limpiadas correctamente.`);
      }
  };

  const startEditing = () => {
      let txt = '';
      const monthData = (data[activeMonthName] || []).sort((a, b) => a.day - b.day);
      monthData.forEach(dayData => {
          txt += `DÍA ${dayData.day}\n`;
          dayData.activities.forEach(act => {
              txt += `Actividad: ${act.actividad}\n`;
              if (act.hora) txt += `Hora: ${act.hora}\n`;
              if (act.lugar) txt += `Lugar: ${act.lugar}\n`;
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

  const handleDownloadDocx = async () => {
    if (!activeMonthName || !data[activeMonthName]) return;

    const monthData = [...data[activeMonthName]].sort((a, b) => a.day - b.day);
    
    const children: any[] = [
      new Paragraph({
        text: `Opciones Culturales - ${activeMonthName}`,
        heading: "Heading1",
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({ text: "" })
    ];

    monthData.forEach(dayData => {
      children.push(new Paragraph({
        text: `DÍA ${dayData.day}`,
        heading: "Heading2",
        spacing: { before: 200, after: 100 }
      }));

      dayData.activities.forEach(act => {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: "Actividad: ", bold: true }),
            new TextRun(act.actividad)
          ]
        }));
        children.push(new Paragraph({
          children: [
            new TextRun({ text: "Hora: ", bold: true }),
            new TextRun(act.hora)
          ]
        }));
        children.push(new Paragraph({
          children: [
            new TextRun({ text: "Lugar: ", bold: true }),
            new TextRun(act.lugar)
          ],
          spacing: { after: 200 }
        }));
      });
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Opciones_Culturales_${activeMonthName}.docx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderUploadBtn = () => {
    if (user.role !== UserRole.ADMIN) return null;
    return (
      <div className="px-4 py-6 border-t border-white/10 mt-auto bg-card-dark">
        <input type="file" accept=".txt" ref={fileInputRef} className="hidden" onChange={handleUpload} />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-3 bg-primary text-white py-4 rounded-2xl font-bold text-xs shadow-xl active:scale-95 transition-all mb-3"
        >
          <span className="material-symbols-outlined text-sm">upload_file</span>
          Cargar TXT ({activeMonthName})
        </button>
        <div className="p-3 bg-black/20 rounded-xl border border-white/5 text-[9px] text-text-secondary font-mono leading-relaxed">
            <p className="font-bold text-primary mb-1 uppercase tracking-widest">Formato Requerido:</p>
            DÍA 13<br/>
            Actividad: Taller del proyecto...<br/>
            Hora: 8:30 AM<br/>
            Lugar: Casa de orientación...
        </div>
      </div>
    );
  };

  let monthDataDisplay = (data[activeMonthName] || []).sort((a, b) => a.day - b.day);
  if (daySearch) {
    const dayNum = parseInt(daySearch);
    if (!isNaN(dayNum)) {
      monthDataDisplay = monthDataDisplay.filter(d => d.day === dayNum);
    }
  }

  return (
    <div className="h-full flex flex-col bg-background-dark">
      <AgendaHeader 
        title="Opciones Culturales" 
        user={user} 
        onMenuClick={onMenuClick} 
        onBack={onBack}
      />
      
      <div className="flex-none flex flex-col bg-card-dark/95 backdrop-blur px-4 py-3 border-b border-white/5 z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-0.5">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest">
              {showNextMonth ? 'Mes Siguiente' : 'Mes en Curso'}
            </h4>
            <p className="text-white font-bold text-lg">{activeMonthName}</p>
          </div>
          
          <div className="flex items-center gap-2">
            {!isEditing && (
               <button 
                 onClick={() => setShowNextMonth(!showNextMonth)}
                 className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 border ${showNextMonth ? 'bg-background-dark border-white/10 text-text-secondary' : 'bg-primary/10 border-primary/20 text-primary'}`}
               >
                 {showNextMonth ? 'Ver Actual' : nextMonthName}
               </button>
            )}
            
            {!isEditing && user.role === UserRole.ADMIN && (
                <>
                   <button onClick={startEditing} className="flex size-10 items-center justify-center rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all border border-white/5" title="Editar información TXT">
                       <span className="material-symbols-outlined text-sm">edit</span>
                   </button>
                   <button onClick={handleClearMonth} className="flex size-10 items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all border border-white/5" title="Limpiar todo">
                       <span className="material-symbols-outlined text-sm">delete_sweep</span>
                   </button>
                </>
            )}
            {!isEditing && (
               <button onClick={handleDownloadDocx} className="flex size-10 items-center justify-center rounded-full bg-white/5 text-text-secondary hover:bg-primary hover:text-white transition-all border border-white/5" title="Exportar DOCX">
                   <span className="material-symbols-outlined text-sm">description</span>
               </button>
            )}
            {isEditing && (
               <button onClick={saveEdit} className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">
                  Guardar
               </button>
            )}
            {isEditing && (
                <button onClick={() => setIsEditing(false)} className="bg-white/10 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">
                  Cancelar
               </button>
            )}
          </div>
        </div>

        {!isEditing && (
            <div className="relative">
               <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-text-secondary">search</span>
               <input 
                type="number" 
                placeholder="Filtrar por número de día (ej: 15)..."
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
               className="w-full h-full min-h-[60vh] bg-background-dark/50 border border-white/10 rounded-2xl p-4 text-xs font-mono text-white/90 focus:ring-2 focus:ring-primary focus:outline-none resize-none"
               placeholder="Pega o edita el texto aquí..."
             />
        ) : monthDataDisplay.length === 0 ? (
          <div className="text-center py-20">
            <div className="size-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-white/20 text-3xl">theater_comedy</span>
            </div>
            <p className="text-text-secondary text-sm">No hay opciones cargadas para {activeMonthName}.</p>
            {user.role === UserRole.ADMIN && (
              <p className="text-[10px] text-primary mt-2 uppercase font-bold tracking-widest">Use el botón inferior para cargar archivo .txt</p>
            )}
          </div>
        ) : (
          monthDataDisplay.map(dayData => (
            <div key={dayData.day} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/5"></div>
                <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em]">Día {dayData.day}</span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/5"></div>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {dayData.activities.map((act, i) => (
                  <div key={i} className="bg-card-dark border border-white/5 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
                    <p className="text-white/90 text-sm font-medium leading-relaxed">{act.actividad}</p>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                        <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
                        <span>{act.hora}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-text-secondary max-w-[60%]">
                        <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                        <span className="truncate">{act.lugar}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
      {renderUploadBtn()}
    </div>
  );
};

export default CulturalOptions;
