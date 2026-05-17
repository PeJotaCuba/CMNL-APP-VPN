import React, { useState, useRef, useMemo } from 'react';
import { openWhatsApp } from '../../../utils/whatsappUtils';
import { useNavigate } from 'react-router-dom';
import { UserRole, Program, DailyContent, UserProfile, DayThemeData, EfemeridesData, ConmemoracionesData } from '../types.ts';
import { getWeeksInMonth, DayInfo, getCurrentDateInfo } from '../utils/dateUtils.ts';
import { MONTHS_DATA } from '../constants.ts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import AgendaHeader from '../components/AgendaHeader';
import { saveAgendaPdf, loadAgendaPdfs, deleteAgendaPdf, deleteAllAgendaPdfs, GeneratedAgenda } from '../services/db';
import { 
  syncEditorialContent, 
  updateEditorialFirebase, 
  shareAgendaFirebase, 
  getSharedAgendas,
  deleteSharedAgenda,
  deleteAllSharedAgendas,
  EditorialSyncData 
} from '../services/firebaseSync';

interface EditorialProps {
  user: UserProfile;
  users: UserProfile[];
  programs: Program[];
  dayThemes: DayThemeData;
  efemerides: EfemeridesData;
  conmemoraciones: ConmemoracionesData;
  onUpdateProgram: (p: Program) => void;
  onUpdateMany: (progs: Program[]) => void;
  onUpdateDayThemes: (themes: DayThemeData) => void;
  onClearAll: () => void;
  filterEnabled: boolean;
  onMenuClick?: () => void;
  onBack?: () => void;
}

const normalize = (str: string) => 
  (str || "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const ContentModal: React.FC<{ title: string; content: string; onClose: () => void }> = ({ title, content, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isIdea = title.startsWith("Ideas:");
  const displayTitle = isIdea ? title.replace("Ideas: ", "") : title;
  const displaySubtitle = isIdea ? "Sugerencias Creativas" : "Detalle de Contenido";

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="bg-card-dark w-full max-w-lg rounded-[2rem] border border-white/10 shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-card-dark z-10">
          <div className="flex items-center gap-4">
             <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                <span className="material-symbols-outlined text-2xl">lightbulb</span>
             </div>
             <div>
                <h3 className="text-white font-bold text-lg leading-tight">{displayTitle}</h3>
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest opacity-80 mt-1">{displaySubtitle}</p>
             </div>
          </div>
          <button onClick={onClose} className="size-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/5">
            <span className="material-symbols-outlined text-white text-sm">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 bg-black/20">
            <div className="prose prose-invert max-w-none">
               <p className="text-white/90 text-sm leading-loose font-serif whitespace-pre-wrap selection:bg-primary/30">
                  {content}
               </p>
            </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-card-dark flex gap-3 z-10">
            <button 
              onClick={handleCopy} 
              className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 border ${copied ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
            >
               <span className="material-symbols-outlined text-base">
                  {copied ? 'check' : 'content_copy'}
               </span>
               {copied ? 'Copiado' : 'Copiar'}
            </button>
            <button 
              onClick={onClose} 
              className="flex-1 bg-primary hover:bg-primary-dark text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
               Cerrar
            </button>
        </div>
      </div>
    </div>
  );
};

const Editorial: React.FC<EditorialProps> = ({ 
  user, users, programs, dayThemes, efemerides, conmemoraciones, onUpdateProgram, onUpdateMany, onUpdateDayThemes, onClearAll, filterEnabled, onMenuClick, onBack
}) => {
  const navigate = useNavigate();
  const dateInfo = getCurrentDateInfo(); 
  
  // Nivel 0: Selección de Mes
  const [isMonthSelection, setIsMonthSelection] = useState(true);
  const [targetDate, setTargetDate] = useState(new Date());
  
  const weeks = useMemo(() => getWeeksInMonth(targetDate), [targetDate]);
  const currentMonthLabel = MONTHS_DATA[targetDate.getMonth()].name;

  // Nivel 1: Selección de Semana (Lista de Semanas)
  // Nivel 2: Vista de Semana (Lista de Días)
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  
  // Nivel 3: Editor de Programa (Día Específico)
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);
  
  const [editingProg, setEditingProg] = useState<{program: Program, key: string} | null>(null);
  const [editData, setEditData] = useState<DailyContent>({ theme: '', ideas: '' }); 
  const [editThemePortada, setEditThemePortada] = useState<string | null>(null);
  
  const [progSearch, setProgSearch] = useState(''); 
  const [viewModal, setViewModal] = useState<{ title: string, content: string } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [viewPdfArchive, setViewPdfArchive] = useState(false);
  const [archiveList, setArchiveList] = useState<GeneratedAgenda[]>([]);

  const [confirmDialog, setConfirmDialog] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [alertDialog, setAlertDialog] = useState<{ message: string, onAlertClose?: () => void } | null>(null);

  // Firestore Data State
  const [firebaseEditorialData, setFirebaseEditorialData] = useState<Record<string, EditorialSyncData>>({});
  const [sharedAgendasList, setSharedAgendasList] = useState<any[]>([]);

  const [commentModal, setCommentModal] = useState<{program: Program, dayName: string, fullDate: string, data: DailyContent} | null>(null);
  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
     if (viewPdfArchive) {
        loadAgendaPdfs().then(setArchiveList);
        // Also listen to shared agendas from cloud
        return getSharedAgendas(setSharedAgendasList);
     }
  }, [viewPdfArchive]);

  // Real-time synchronization for editorial content
  React.useEffect(() => {
    if (selectedWeekId) {
      return syncEditorialContent(currentMonthLabel, selectedWeekId, (data) => {
        setFirebaseEditorialData(data);
      });
    }
  }, [selectedWeekId, currentMonthLabel]);

  const handleGeneratePdf = async () => {
      const data = await generatePdfBlob();
      if (!data) return;

      const newPdf: GeneratedAgenda = {
          id: Date.now().toString(),
          filename: data.filename,
          blob: data.blob,
          createdAt: new Date().toISOString(),
          month: currentMonthLabel,
          weekLabel: activeWeek?.label || ''
      };

      await saveAgendaPdf(newPdf);
      
      // Also share to cloud for team visibility
      try {
        const success = await shareAgendaFirebase(newPdf);
        if (success) {
          setAlertDialog({ message: "Agenda generada y compartida en la Nube con éxito." });
        } else {
          setAlertDialog({ message: "Agenda guardada localmente, pero no se pudo sincronizar con la Nube. Revisa tu conexión." });
        }
      } catch (e) {
        console.error("Cloud share error:", e);
        setAlertDialog({ message: "Error al sincronizar con la Nube. Se guardó solo localmente." });
      }

      setViewPdfArchive(true);
  };

  const handleArchiveDownload = (agenda: GeneratedAgenda) => {
      const url = window.URL.createObjectURL(agenda.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = agenda.filename;
      a.click();
      window.URL.revokeObjectURL(url);
  };

  const handleArchiveWhatsApp = async (agenda: GeneratedAgenda) => {
      // Direct redirect to WhatsApp Group as requested by user.
      const whatsappGroupUrl = `https://chat.whatsapp.com/IY4VnjbdYP9I9ozxV7BASS`;
      window.open(whatsappGroupUrl, "_blank");

      setAlertDialog({ 
          message: "Redirigiendo al grupo de WhatsApp. El PDF está disponible en tus archivos generados." 
      });
  };

  const handleArchiveGmail = async (agenda: GeneratedAgenda) => {
      const targetUsers = users.filter(u => {
          const classification = normalize(u.classification || '');
          const specialty = normalize(u.specialty || '');
          return classification.includes('guionist') || classification.includes('asesor') || classification.includes('especialista') ||
                 specialty.includes('guionist') || specialty.includes('asesor') || specialty.includes('especialista');
      });
      
      const emailsList = targetUsers.map(u => u.email).filter(e => e);
      const emails = emailsList.join(',');
      
      if (!emailsList.length) {
          setAlertDialog({ message: "No se encontraron correos de guionistas o asesores registrados." });
          return;
      }

      const subject = `Agenda Editorial CMNL - ${agenda.month} ${agenda.weekLabel}`;
      const textDesc = `Buenos días, esta es la agenda editorial de la ${agenda.weekLabel} del mes de ${agenda.month}.`;

      // Optimized flow: Copy emails to clipboard to assist the user
      try {
          await navigator.clipboard.writeText(emails);
      } catch (err) {
          console.error("Failed to copy emails", err);
      }

      // Try Automated Sharing (Web Share API) - Only way to attach the file
      const file = new File([agenda.blob], agenda.filename, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
              // We show a quick alert to prepare the user before the native sheet opens
              setAlertDialog({ 
                  message: "Los correos se han copiado al portapapeles. Selecciona Gmail en la siguiente ventana y pega los destinatarios en el campo 'Para'.",
                  onAlertClose: async () => {
                      try {
                          await navigator.share({
                              files: [file],
                              title: subject,
                              text: textDesc
                          });
                      } catch (e: any) {
                          if (e.name !== 'AbortError') console.error(e);
                      }
                  }
              });
              return;
          } catch (e: any) {
              console.error(e);
          }
      }
      
      // Fallback
      const subjectEncoded = encodeURIComponent(subject);
      const bodyEncoded = encodeURIComponent(textDesc);
      window.location.href = `mailto:${emails}?subject=${subjectEncoded}&body=${bodyEncoded}`;
      setAlertDialog({ 
          message: "Se ha abierto tu aplicación de correo. Debido a restricciones del sistema, por favor adjunta el PDF manualmente." 
      });
  };

  const handleSendComment = () => {
      if (!commentModal || !commentText.trim()) return;
      
      const adminUser = users.find(u => u.role === UserRole.ADMIN);
      let phone = adminUser?.phone || '54413935';
      
      if (!phone) {
          alert('No se encontró el número de teléfono del administrador.');
          return;
      }

      const { program, fullDate, data } = commentModal;
      
      const message = `Hola, tengo un comentario sobre el programa *${program.name}* del día *${fullDate}*.\n\n*Temática:* ${data.theme || 'N/A'}\n\n*Mi comentario:*\n${commentText}`;
      
      if (!phone.startsWith('53')) {
          phone = '53' + phone;
      }
      
      openWhatsApp(message, phone);
      
      setCommentModal(null);
      setCommentText('');
  };

  const activeWeek = weeks.find(w => w.id === selectedWeekId);
  
  // Filtrado de usuario
  const applyFilter = user.interests && filterEnabled && (
    (user.interests.days?.length || 0) > 0 || 
    (user.interests.programIds?.length || 0) > 0
  );
  const searchablePrograms = applyFilter
    ? programs.filter(p => (user.interests?.programIds || []).includes(p.id))
    : programs;

  // --- LÓGICA DE CLAVES DE DATOS (CORREGIDA) ---
  const getDataKey = (weekId: string, dayName: string) => `${currentMonthLabel}-${weekId}-${dayName}`;
  const getLegacyKey = (weekId: string, dayName: string) => `${weekId}-${dayName}`;

  // CORRECCIÓN CRÍTICA: Solo usar fallback a legacy si el mes es Enero.
  // Esto evita que datos de Enero se muestren en Febrero, Marzo, etc.
  const getEffectiveData = (program: Program, weekId: string, dayName: string): DailyContent => {
      // 0. Check Firebase Real-time Data (Highest Priority)
      const fbKey = `${program.id}-${dayName}`;
      if (firebaseEditorialData[fbKey]) {
          return {
              theme: firebaseEditorialData[fbKey].theme,
              ideas: firebaseEditorialData[fbKey].ideas
          };
      }

      const newKey = getDataKey(weekId, dayName);
      const oldKey = getLegacyKey(weekId, dayName);
      
      // 1. Buscar dato específico del mes (Prioridad Alta)
      if (program.dailyData && program.dailyData[newKey]) {
          return program.dailyData[newKey];
      }

      // 2. Si es Enero, permitir fallback a datos antiguos (Compatibilidad)
      if (currentMonthLabel === 'Enero' && program.dailyData && program.dailyData[oldKey]) {
          return program.dailyData[oldKey];
      }

      // 3. Si es otro mes y no tiene datos específicos, devolver vacío
      return { theme: '', ideas: '' };
  };

  const getEffectiveTheme = (weekId: string, dayName: string): string => {
      const newKey = getDataKey(weekId, dayName);
      const oldKey = getLegacyKey(weekId, dayName);
      
      if (dayThemes[newKey]) return dayThemes[newKey];
      if (currentMonthLabel === 'Enero' && dayThemes[oldKey]) return dayThemes[oldKey];
      
      return "";
  };

  // --- NAVEGACIÓN ---
  const handleMonthSelect = (index: number) => {
    setTargetDate(new Date(new Date().getFullYear(), index, 1));
    setIsMonthSelection(false);
    setSelectedWeekId(null);
    setSelectedDay(null);
  };

  const handleBack = () => {
    if (viewPdfArchive) {
        setViewPdfArchive(false);
    } else if (selectedDay) {
        // Volver de Editor a Vista de Semana
        setSelectedDay(null);
    } else if (selectedWeekId) {
        // Volver de Vista de Semana a Lista de Semanas
        setSelectedWeekId(null);
        setProgSearch('');
    } else if (!isMonthSelection) {
        // Volver de Lista de Semanas a Selección de Mes
        setIsMonthSelection(true);
    } else if (onBack) {
        // Volver de Selección de Mes a Home
        onBack();
    } else {
        navigate('/home');
    }
  };

  // --- ACCIONES DE SEMANA ---
  const clearWeekData = () => {
     if (!selectedWeekId) return;
     
     const newKeyPrefix = `${currentMonthLabel}-${selectedWeekId}-`;
     const oldKeyPrefix = `${selectedWeekId}-`;

     const updatedPrograms = programs.map(p => {
        const newData = { ...(p.dailyData || {}) };
        Object.keys(newData).forEach(key => {
            // Borrar datos específicos del mes actual
            if (key.startsWith(newKeyPrefix)) {
                delete newData[key];
            }
            // Borrar datos legacy SOLO si estamos en Enero
            if (currentMonthLabel === 'Enero' && key.startsWith(oldKeyPrefix)) {
                delete newData[key];
            }
        });
        return { ...p, dailyData: newData };
     });

     const updatedDayThemes = { ...dayThemes };
     Object.keys(updatedDayThemes).forEach(key => {
        if (key.startsWith(newKeyPrefix)) {
            delete updatedDayThemes[key];
        }
        if (currentMonthLabel === 'Enero' && key.startsWith(oldKeyPrefix)) {
            delete updatedDayThemes[key];
        }
     });

     onUpdateMany(updatedPrograms);
     onUpdateDayThemes(updatedDayThemes);
  };

  const dialogModals = (
    <>
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card-dark border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Confirmar acción</h3>
            <p className="text-sm text-text-secondary mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 text-xs font-bold text-white/70 hover:bg-white/5 rounded-xl transition-colors tracking-widest uppercase">Cancelar</button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className="px-4 py-2 text-xs font-bold bg-primary text-background-dark rounded-xl hover:opacity-90 transition-opacity tracking-widest uppercase">Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {alertDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card-dark border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="size-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-2xl">info</span>
            </div>
            <p className="text-sm text-text-secondary mb-6">{alertDialog.message}</p>
            <button onClick={() => { alertDialog.onAlertClose?.(); setAlertDialog(null); }} className="w-full py-3 text-xs font-bold bg-primary text-background-dark rounded-xl hover:opacity-90 transition-opacity tracking-widest uppercase">Aceptar</button>
          </div>
        </div>
      )}
    </>
  );

  const handleClearWeek = () => {
    setConfirmDialog({
        message: `¿Estás seguro de BORRAR toda la planificación de esta semana (${currentMonthLabel})?`,
        onConfirm: () => {
            clearWeekData();
            setAlertDialog({ message: "🗑️ Semana limpiada correctamente." });
        }
    });
  };

  const processImportText = (text: string) => {
    const lines = text.split(/\r?\n/);
    const updatedPrograms = JSON.parse(JSON.stringify(programs));
    const updatedDayThemes = { ...dayThemes };
    const dayMap: Record<string, string> = { 'lunes': 'Lunes', 'martes': 'Martes', 'miercoles': 'Miércoles', 'jueves': 'Jueves', 'viernes': 'Viernes', 'sabado': 'Sábado', 'domingo': 'Domingo' };

    let currentDayName: string | null = null;
    let currentProgIndex: number = -1;
    let currentKey: string | null = null; 
    let capturing: 'ideas' | null = null;
    let updatesCount = 0;

    const ensureDailyData = (progIndex: number, key: string) => {
        if (!updatedPrograms[progIndex].dailyData) updatedPrograms[progIndex].dailyData = {};
        if (!updatedPrograms[progIndex].dailyData[key]) updatedPrograms[progIndex].dailyData[key] = { theme: '', ideas: '' };
    };

    const matchProgramName = (prog: Program, inputName: string): boolean => {
      const pName = normalize(prog.name);
      const search = normalize(inputName);
      if (pName.includes(search) || search.includes(pName)) return true;
      if ((search.includes('noticiero') || search.includes('rcm noticias')) && (pName.includes('noticiero') || pName.includes('rcm noticias'))) return true;
      if (search.includes('buenos dias') && pName.includes('buenos dias')) return true;
      return false;
    };

    lines.forEach(line => {
      const clean = line.trim();
      const dayMatch = clean.match(/^\*\*?D[IÍ]A:\*\*?\s*(.*)/i) || clean.match(/^D[IÍ]A:\s*(.*)/i);
      if (dayMatch) {
        const rawContent = dayMatch[1].trim();
        const firstWord = rawContent.split(/[\s,.]+/)[0]; 
        const normalizedDay = normalize(firstWord);
        currentDayName = dayMap[normalizedDay] || null;
        if (currentDayName) {
            // Siempre guardamos con el formato nuevo específico del mes
            currentKey = getDataKey(selectedWeekId!, currentDayName);
        }
        currentProgIndex = -1;
        capturing = null;
        return;
      }
      
      const dayThemeMatch = clean.match(/^\*\*?Temática\s+del\s+d[íi]a:\*\*?\s*(.*)/i) || clean.match(/^Temática\s+del\s+d[íi]a:\s*(.*)/i);
      if (dayThemeMatch && currentKey) {
         updatedDayThemes[currentKey] = dayThemeMatch[1].trim();
         updatesCount++;
         return;
      }

      const progMatch = clean.match(/^\*\*?Programa:\*\*?\s*(.*)/i) || clean.match(/^Programa:\s*(.*)/i);
      if (progMatch) {
         const progNameInput = progMatch[1].trim();
         
         // Prioridad 1: Buscar programa que coincida en nombre Y que se emita ese día
         let foundIndex = -1;
         if (currentDayName) {
             foundIndex = updatedPrograms.findIndex((p: Program) => 
                 matchProgramName(p, progNameInput) && p.days.includes(currentDayName!)
             );
         }

         // Prioridad 2: Si no se encuentra para ese día específico, buscar solo por nombre (fallback)
         if (foundIndex === -1) {
             foundIndex = updatedPrograms.findIndex((p: Program) => matchProgramName(p, progNameInput));
         }

         currentProgIndex = foundIndex;
         
         if (currentProgIndex !== -1 && currentKey) {
             ensureDailyData(currentProgIndex, currentKey!);
         } else {
             currentProgIndex = -1;
         }
         capturing = null;
         return;
      }

      if (!currentKey || currentProgIndex === -1) return;

      const themeMatch = clean.match(/^\*\*?Temática:\*\*?\s*(.*)/i) || clean.match(/^Temática:\s*(.*)/i);
      if (themeMatch) {
          updatedPrograms[currentProgIndex].dailyData[currentKey].theme = themeMatch[1].trim();
          updatesCount++;
          capturing = null;
          return;
      }

      const ideasMatch = clean.match(/^\*\*?Ideas:\*\*?/i) || clean.match(/^Ideas:/i);
      if (ideasMatch) {
          capturing = 'ideas';
          updatedPrograms[currentProgIndex].dailyData[currentKey].ideas = ""; 
          const content = clean.replace(/^\*\*?Ideas:\*\*?/i, '').replace(/^Ideas:/i, '').trim();
          if(content) updatedPrograms[currentProgIndex].dailyData[currentKey].ideas = content;
          updatesCount++;
          return;
      }

      if (clean.match(/^\*\*?Fuentes:\*\*?/i) || clean.match(/^Fuentes:/i)) {
          capturing = null;
          return;
      }

      if (capturing === 'ideas') {
          const currentText = updatedPrograms[currentProgIndex].dailyData[currentKey].ideas;
          updatedPrograms[currentProgIndex].dailyData[currentKey].ideas = currentText ? currentText + "\n" + line : line;
      }
    });

    if (updatesCount > 0) {
        onUpdateMany(updatedPrograms);
        onUpdateDayThemes(updatedDayThemes);
        return updatesCount;
    } else {
        return 0;
    }
  };

  const handleBulkTxtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedWeekId) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const count = processImportText(text);
      if (count > 0) alert(`✅ Agenda actualizada correctamente para ${currentMonthLabel} (${count} cambios).`);
      else alert("⚠️ No se detectaron datos válidos.");
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const getVisibleDays = () => {
    if (!activeWeek) return [];
    let days = activeWeek.days;
    // Filtro de días según perfil de usuario
    if (applyFilter && user.interests && (user.interests.days?.length || 0) > 0) {
      days = days.filter(d => d && (user.interests!.days || []).includes(d.name));
    }
    return days;
  };

  const generatePdfBlob = async (): Promise<{blob: Blob, filename: string} | null> => {
      if (!activeWeek) return null;
      const visibleDays = getVisibleDays(); // Usamos los días filtrados
      if (visibleDays.length === 0) {
          alert("No hay días visibles para generar el reporte.");
          return null;
      }

      const weekNumber = activeWeek.label.replace('Semana ', '');
      const dateRange = `del ${activeWeek.start} al ${activeWeek.end}`;

      const jsPDFCtor = (jsPDF as any).default || jsPDF;
      const doc = new jsPDFCtor();

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("RADIO CIUDAD MONUMENTO", 105, 20, { align: "center" });

      doc.setFontSize(16);
      doc.text("AGENDA EDITORIAL", 105, 30, { align: "center" });

      autoTable(doc, {
          startY: 40,
          head: [['MES', currentMonthLabel, 'Semana', weekNumber]],
          body: [[{ content: dateRange, colSpan: 4, styles: { halign: 'center' } }]],
          theme: 'grid',
          headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], halign: 'center' },
          bodyStyles: { halign: 'center', fontStyle: 'bold' }
      });

      let finalY = (doc as any).lastAutoTable.finalY + 10;

      for (const day of visibleDays) {
          if (!day) continue;
          
          const monthNames = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
          ];
          const dayMonthLabel = day.month !== undefined ? monthNames[day.month] : currentMonthLabel;
          
          const dayTheme = getEffectiveTheme(selectedWeekId!, day.name);
          const dayEfemerides = efemerides[dayMonthLabel]?.filter(e => e.day === day.date) || [];
          const dayConmemoraciones = conmemoraciones[dayMonthLabel]?.filter(c => c.day === day.date) || [];

          let efemStr = dayEfemerides.map(e => `${e.event}: ${e.description}`).join('\n\n') || "No se reportan efemérides";
          
          let conmemoStr = '';
          dayConmemoraciones.forEach(c => {
             if(c.national) conmemoStr += `Nacional: ${c.national}\n`;
             if(c.international) conmemoStr += `Internacional: ${c.international}\n`;
          });
          if (!conmemoStr) conmemoStr = "No se reportan conmemoraciones";

          const dayProgs = searchablePrograms.filter(p => p.days.includes(day.name));
          dayProgs.sort((a,b) => a.time.localeCompare(b.time));

          const progBody = dayProgs.length > 0 ? dayProgs.map(p => {
              const data = getEffectiveData(p, selectedWeekId!, day.name);
              return [p.name, data.theme || '-'];
          }) : [["Sin programas asignados", ""]];

          autoTable(doc, {
              startY: finalY,
              head: [[{ content: `${day.name} ${day.date}`, colSpan: 2, styles: { halign: 'center', fillColor: [217, 217, 217], textColor: [0, 0, 0] } }]],
              body: [
                  [{ content: 'EFEMÉRIDES', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [242, 242, 242] } }],
                  [{ content: efemStr, colSpan: 2 }],
                  [{ content: 'CONMEMORACIONES', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [242, 242, 242] } }],
                  [{ content: conmemoStr, colSpan: 2 }],
                  [{ content: 'TEMÁTICA CENTRAL', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [242, 242, 242] } }],
                  [{ content: dayTheme || "Por definir", colSpan: 2, styles: { fontStyle: dayTheme ? 'normal' : 'italic' } }],
                  [{ content: 'PROGRAMA', styles: { fontStyle: 'bold', fillColor: [242, 242, 242] } }, { content: 'TEMÁTICA', styles: { fontStyle: 'bold', fillColor: [242, 242, 242] } }],
                  ...progBody
              ],
              theme: 'grid',
              columnStyles: {
                  0: { cellWidth: 60 },
                  1: { cellWidth: 'auto' }
              }
          });

          finalY = (doc as any).lastAutoTable.finalY + 10;
      }

      const blob = doc.output('blob');
      return {
          blob,
          filename: `Agenda-${currentMonthLabel}-${activeWeek.start}-${activeWeek.end}.pdf`
      };
  };

  const savePortadaEdit = () => {
    if (!selectedWeekId || !selectedDay || editThemePortada === null) return;
    const key = getDataKey(selectedWeekId, selectedDay.name);
    const newThemes = { ...dayThemes, [key]: editThemePortada };
    onUpdateDayThemes(newThemes);
    setEditThemePortada(null);
  };

  const openEditor = (p: Program, weekId: string, dayName: string) => {
    const data = getEffectiveData(p, weekId, dayName);
    const key = getDataKey(weekId, dayName);
    setEditingProg({ program: p, key });
    setEditData({ theme: data.theme, ideas: data.ideas || '' });
  };

  const saveProgEdit = async () => {
    if (!editingProg || !activeWeek || !selectedDay) return;
    const { program, key } = editingProg;
    
    // Create a copy to update
    const updatedProgram = { ...program, dailyData: { ...program.dailyData } };
    updatedProgram.dailyData[key] = {
      theme: editData.theme,
      ideas: editData.ideas
    };
    onUpdateProgram(updatedProgram);

    // Sync to Firebase for real-time communication
    try {
      await updateEditorialFirebase({
          programId: program.id,
          weekId: activeWeek.id,
          dayName: selectedDay.dayName,
          month: currentMonthLabel,
          theme: editData.theme,
          ideas: editData.ideas
      });
    } catch (e) {
      console.error("Firebase Sync Error:", e);
    }

    setEditingProg(null);
  };

  // --- EDITOR DE PROGRAMA (Nivel 3) ---
  if (selectedWeekId && selectedDay) {
    const dayProgs = searchablePrograms.filter(p => {
        const matchesDay = p.days.includes(selectedDay.name);
        const matchesSearch = progSearch === '' || normalize(p.name).includes(normalize(progSearch));
        return matchesDay && matchesSearch;
    });
    
    const currentTheme = getEffectiveTheme(selectedWeekId, selectedDay.name);

    return (
      <div className="h-full flex flex-col bg-background-dark">
        <AgendaHeader 
          title="Editor de Contenido" 
          user={user} 
          onMenuClick={onMenuClick} 
          onBack={handleBack}
        />

        <div className="flex-none bg-card-dark/95 backdrop-blur px-4 py-3 border-b border-white/5 shadow-xl z-20">
          <div className="flex items-center justify-center">
             <div className="text-center"><h1 className="text-white text-xs font-bold uppercase">{selectedDay.name} {selectedDay.date}</h1><p className="text-[9px] text-primary font-bold uppercase tracking-widest">{currentMonthLabel}</p></div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-32">
          <div className="bg-primary/10 border border-primary/20 p-6 rounded-[2rem] relative group">
            <span className="text-[10px] font-bold text-primary uppercase block mb-1 tracking-widest">Temática del día</span>
            {editThemePortada !== null ? (
              <div className="space-y-3 mt-2">
                <textarea value={editThemePortada} onChange={e => setEditThemePortada(e.target.value)} className="w-full bg-background-dark border-none rounded-xl p-3 text-sm text-white min-h-[80px]" />
                <div className="flex gap-2">
                  <button onClick={savePortadaEdit} className="bg-primary px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest">Guardar</button>
                  <button onClick={() => setEditThemePortada(null)} className="bg-white/10 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start gap-4">
                <p className="text-white font-serif italic text-lg leading-tight flex-1">{currentTheme || "Sin temática cargada."}</p>
                {user.role === UserRole.ADMIN && (
                  <button onClick={() => setEditThemePortada(currentTheme || '')} className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0"><span className="material-symbols-outlined text-sm">edit</span></button>
                )}
              </div>
            )}
          </div>

          {dayProgs.length === 0 ? (
            <div className="text-center py-10 text-white/40">{progSearch ? "No se encontraron programas." : "No hay programas asignados para este día."}</div>
          ) : (
            dayProgs.map(p => {
              const data = getEffectiveData(p, selectedWeekId, selectedDay.name);
              const hasIdeas = data.ideas && data.ideas.length > 0;

              return (
                <div key={p.id} className="bg-card-dark border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-3">
                     <span className="text-primary font-bold text-[9px] uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full">{p.time} — {p.name}</span>
                     {user.role === UserRole.ADMIN ? (
                        <button onClick={() => openEditor(p, selectedWeekId, selectedDay.name)} className="size-8 rounded-full bg-white/5 flex items-center justify-center text-text-secondary hover:text-white z-10"><span className="material-symbols-outlined text-sm">edit</span></button>
                     ) : (
                        <button onClick={() => setCommentModal({ program: p, dayName: selectedDay.name, fullDate: `${selectedDay.name} ${selectedDay.date} de ${currentMonthLabel.toLowerCase()} de ${targetDate.getFullYear()}`, data })} className="size-8 rounded-full bg-white/5 flex items-center justify-center text-text-secondary hover:text-white z-10" title="Comentar"><span className="material-symbols-outlined text-sm">chat_bubble</span></button>
                     )}
                  </div>
                  <h3 className="text-white font-bold text-base mb-4">{data.theme}</h3>
                  <div className="mt-2">
                    <button 
                        onClick={() => setViewModal({ title: `Ideas: ${p.name}`, content: data.ideas || "No hay ideas registradas." })}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border transition-all active:scale-95 ${hasIdeas ? 'bg-primary/20 border-primary/30 text-white hover:bg-primary/30' : 'bg-white/5 border-white/5 text-text-secondary opacity-50'}`}
                    >
                        <span className="material-symbols-outlined text-sm">lightbulb</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Ver Ideas</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </main>

        {commentModal && (
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
             <div className="bg-card-dark w-full max-w-sm rounded-[2.5rem] border border-white/10 p-8 space-y-6 shadow-2xl relative flex flex-col max-h-[90vh]">
                <div className="shrink-0">
                    <h3 className="text-primary font-bold text-[10px] uppercase tracking-widest mb-1">Comentar a Dirección</h3>
                    <p className="text-white font-bold text-lg">{commentModal.program.name}</p>
                </div>
                <div className="overflow-y-auto no-scrollbar space-y-4 pr-1">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-text-secondary uppercase tracking-widest ml-2">Tu Comentario</label>
                    <textarea 
                        value={commentText} 
                        onChange={e => setCommentText(e.target.value)} 
                        placeholder="Escribe tu comentario sobre la temática o ideas de este programa..."
                        className="w-full bg-background-dark border-none rounded-2xl p-4 text-sm text-white min-h-[150px] focus:ring-1 focus:ring-primary font-serif leading-relaxed" 
                    />
                  </div>
                </div>
                <div className="flex gap-3 shrink-0">
                    <button onClick={handleSendComment} disabled={!commentText.trim()} className="flex-1 bg-[#25D366] text-white py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest disabled:opacity-50 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-sm">send</span> Enviar
                    </button>
                    <button onClick={() => { setCommentModal(null); setCommentText(''); }} className="flex-1 bg-white/5 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                </div>
             </div>
          </div>
        )}

        {editingProg && (
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
             <div className="bg-card-dark w-full max-w-sm rounded-[2.5rem] border border-white/10 p-8 space-y-6 shadow-2xl relative flex flex-col max-h-[90vh]">
                <div className="shrink-0">
                    <h3 className="text-primary font-bold text-[10px] uppercase tracking-widest mb-1">Editando Contenido</h3>
                    <p className="text-white font-bold text-lg">{editingProg.program.name}</p>
                </div>
                <div className="overflow-y-auto no-scrollbar space-y-4 pr-1">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-text-secondary uppercase tracking-widest ml-2">Temática</label>
                    <input type="text" value={editData.theme} onChange={e => setEditData({...editData, theme: e.target.value})} className="w-full bg-background-dark border-none rounded-2xl p-4 text-sm text-white focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-text-secondary uppercase tracking-widest ml-2">Ideas (200-250 palabras)</label>
                    <textarea value={editData.ideas} onChange={e => setEditData({...editData, ideas: e.target.value})} className="w-full bg-background-dark border-none rounded-2xl p-4 text-sm text-white min-h-[150px] focus:ring-1 focus:ring-primary font-serif leading-relaxed" />
                  </div>
                </div>
                <div className="flex gap-3 shrink-0">
                    <button onClick={saveProgEdit} className="flex-1 bg-primary py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Actualizar</button>
                    <button onClick={() => setEditingProg(null)} className="flex-1 bg-white/5 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
                </div>
             </div>
          </div>
        )}
        {viewModal && <ContentModal title={viewModal.title} content={viewModal.content} onClose={() => setViewModal(null)} />}
        {dialogModals}
      </div>
    );
  }

  if (viewPdfArchive) {
    return (
      <div className="h-full flex flex-col bg-background-dark">
        <AgendaHeader 
          title="Archivos PDF Generados" 
          user={user} 
          onMenuClick={onMenuClick} 
          onBack={handleBack}
        />
        <main className="flex-1 overflow-y-auto p-4 space-y-4 pt-10">
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-[#9E7649] text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">cloud</span>
              Documentos de la Nube (Compartidos)
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => getSharedAgendas(setSharedAgendasList)}
                className="size-8 rounded-full bg-white/5 flex items-center justify-center text-text-secondary hover:bg-white/10 transition-colors"
                title="Actualizar Nube"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
              </button>
              {user.role === UserRole.ADMIN && sharedAgendasList.length > 0 && (
                <button 
                  onClick={() => {
                    setConfirmDialog({
                      message: "¿Estás seguro de ELIMINAR TODOS los archivos de la NUBE?",
                      onConfirm: async () => {
                        await deleteAllSharedAgendas();
                        setAlertDialog({ message: "Nube de archivos limpiada." });
                      }
                    });
                  }}
                  className="size-8 rounded-full bg-admin-red/10 flex items-center justify-center text-admin-red hover:bg-admin-red/20 transition-colors"
                  title="Borrar Nube"
                >
                  <span className="material-symbols-outlined text-sm">delete_sweep</span>
                </button>
              )}
            </div>
          </div>
          {/* Cloud Documents Section */}
          <div className="mb-6">
            {sharedAgendasList.length === 0 ? (
              <div className="bg-white/5 border border-white/5 rounded-2xl p-6 text-center">
                <p className="text-white/30 text-xs italic">No hay documentos compartidos en la nube.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sharedAgendasList.map(agenda => (
                  <div key={agenda.id} className="bg-primary/5 rounded-2xl p-4 border border-primary/20 shadow-xl flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-white font-bold text-sm leading-tight">{agenda.filename}</h3>
                        <p className="text-[10px] text-primary font-bold uppercase mt-1">Sincronizado por el equipo</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/20 text-primary p-1.5 rounded-lg">
                          <span className="material-symbols-outlined text-sm">cloud_done</span>
                        </div>
                        {user.role === UserRole.ADMIN && (
                          <button 
                            onClick={() => {
                              setConfirmDialog({
                                message: "¿Eliminar este archivo de la nube?",
                                onConfirm: async () => {
                                  await deleteSharedAgenda(agenda.id);
                                }
                              });
                            }}
                            className="bg-admin-red/10 text-admin-red p-1.5 rounded-lg hover:bg-admin-red/20"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => {
                        if (agenda.hasBinary && agenda.fileData) {
                          const binaryData = typeof agenda.fileData.toUint8Array === 'function' 
                            ? agenda.fileData.toUint8Array() 
                            : agenda.fileData;
                          const blob = new Blob([binaryData], { type: 'application/pdf' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = agenda.filename;
                          a.click();
                          URL.revokeObjectURL(url);
                        } else {
                          setAlertDialog({ message: "Este archivo de la nube solo tiene metadatos (probablemente es mayor a 1MB). Por favor, solicita el archivo original por WhatsApp." });
                        }
                      }} className="bg-primary text-background-dark py-2 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1 shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-sm">download</span> Descargar
                      </button>
                      <button onClick={() => handleArchiveWhatsApp(agenda)} className="bg-green-600/20 text-green-400 hover:bg-green-600/30 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-sm">chat</span> Grupo WhatsApp
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-white/5 my-6" />

          <h2 className="text-white/50 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">folder</span>
            Mis Archivos Locales
          </h2>
          {archiveList.length > 0 && (
            <div className="flex justify-end mb-2">
              <button onClick={() => {
                  setConfirmDialog({
                      message: "¿Estás seguro de ELIMINAR TODOS los archivos PDF generados? Esta acción no se puede deshacer.",
                      onConfirm: async () => {
                          await deleteAllAgendaPdfs();
                          setArchiveList([]);
                      }
                  });
              }} className="text-admin-red hover:bg-admin-red/10 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 border border-admin-red/20 shadow-sm shadow-admin-red/10">
                <span className="material-symbols-outlined text-sm">delete_sweep</span> 
                Borrar Todos
              </button>
            </div>
          )}
          {archiveList.length === 0 ? (
            <div className="text-center text-white/50 text-sm py-10">No hay archivos generados.</div>
          ) : (
            archiveList.map(agenda => (
              <div key={agenda.id} className="bg-card-dark rounded-2xl p-4 border border-white/5 shadow-xl flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="text-white font-bold text-sm leading-tight">{agenda.filename}</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => handleArchiveWhatsApp(agenda)} className="bg-green-600/20 text-green-400 hover:bg-green-600/40 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">chat</span> WhatsApp
                  </button>
                  <button onClick={() => handleArchiveGmail(agenda)} className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">mail</span> Gmail
                  </button>
                  <button onClick={() => handleArchiveDownload(agenda)} className="bg-white/10 text-white hover:bg-white/20 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">download</span> Descargar
                  </button>
                </div>
                <div className="text-right">
                  <button onClick={() => {
                      setConfirmDialog({
                          message: "¿Estás seguro de eliminar este archivo?",
                          onConfirm: async () => {
                              await deleteAgendaPdf(agenda.id);
                              setArchiveList(prev => prev.filter(a => a.id !== agenda.id));
                          }
                      });
                  }} className="text-red-400 text-xs font-medium hover:underline">Eliminar</button>
                </div>
              </div>
            ))
          )}
        </main>
        {dialogModals}
      </div>
    );
  }

  // --- VISTA DE SEMANA (Nivel 2: Días de la Semana) ---
  if (selectedWeekId && !isMonthSelection && !selectedDay) {
      const visibleDays = getVisibleDays();
      
      const filteredDays = visibleDays.filter(d => {
          if(!d) return false;
          if(!progSearch) return true;
          return searchablePrograms.some(p => 
              p.days.includes(d.name) && 
              normalize(p.name).includes(normalize(progSearch))
          );
      });

      return (
        <div className="h-full flex flex-col bg-background-dark">
            <AgendaHeader 
              title={`Agenda - ${currentMonthLabel}`} 
              user={user} 
              onMenuClick={onMenuClick} 
              onBack={handleBack}
            />

            <div className="flex-none flex flex-col bg-card-dark/95 backdrop-blur px-4 py-3 border-b border-white/5 z-20 space-y-3">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-lg font-bold leading-none">{activeWeek?.label}</h1>
                        <p className="text-[9px] font-bold text-primary uppercase tracking-widest mt-1">{currentMonthLabel}</p>
                    </div>
                </div>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-secondary">search</span>
                    <input type="text" placeholder="Filtrar por programa..." value={progSearch} onChange={(e) => setProgSearch(e.target.value)} className="w-full bg-background-dark border-none rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:ring-1 focus:ring-primary shadow-inner placeholder:text-text-secondary/50" />
                </div>
            </div>

            <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3 pb-32">
                {filteredDays.length === 0 ? (
                    <div className="text-center py-20 text-white/40">
                        {progSearch ? "No se encontraron días con ese programa." : "No hay días visibles según tus filtros."}
                    </div>
                ) : (
                    filteredDays.map((d) => {
                        if (!d) return null;
                        const theme = getEffectiveTheme(selectedWeekId, d.name);
                        return (
                            <button 
                                key={d.date} 
                                onClick={() => setSelectedDay(d)} 
                                className="w-full flex items-center justify-between bg-card-dark p-6 rounded-[2rem] border border-white/5 shadow-lg active:scale-[0.98] transition-transform text-left group"
                            >
                                <div className="flex-1 min-w-0 pr-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-primary font-bold text-xl">{d.date}</span>
                                        <span className="text-white font-bold text-lg">{d.name}</span>
                                    </div>
                                    {progSearch ? (
                                        <div className="space-y-1">
                                            {searchablePrograms
                                                .filter(p => p.days.includes(d.name) && normalize(p.name).includes(normalize(progSearch)))
                                                .map(p => {
                                                    const pData = getEffectiveData(p, selectedWeekId, d.name);
                                                    return (
                                                        <div key={p.id} className="text-left">
                                                            <span className="text-primary text-[9px] font-bold uppercase tracking-wider">{p.name}</span>
                                                            <p className="text-white/90 text-[10px] line-clamp-2 leading-tight">{pData.theme || "Sin tema asignado"}</p>
                                                        </div>
                                                    );
                                                })
                                            }
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-text-secondary uppercase tracking-widest truncate">{theme || "Sin temática"}</p>
                                    )}
                                </div>
                                <span className="material-symbols-outlined text-white/20 group-hover:text-white transition-colors">chevron_right</span>
                            </button>
                        );
                    })
                )}
            </main>

            {/* HERRAMIENTAS DE SEMANA (Solo visibles aquí) */}
            <div className="flex-none bg-card-dark/95 backdrop-blur border-t border-white/5 p-4 z-40">
                <div className="flex flex-row w-full gap-2 mb-3">
                    {/* Botón PDF (Solo Autorizados) */}
                    {(user.role === UserRole.ADMIN || (user.classification === 'Coordinador' && (user.coordinatorSections || []).includes('Agenda'))) && (
                      <button onClick={handleGeneratePdf} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 px-1 rounded-xl text-[10px] font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition-all">
                        <span className="material-symbols-outlined text-sm">description</span> <span className="text-[9px] text-center leading-tight">Generar<br/>PDF</span>
                      </button>
                    )}
                    
                    {/* Botón Compartir (WhatsApp/Email) */}
                    {(user.role === UserRole.ADMIN || (user.classification === 'Coordinador' && (user.coordinatorSections || []).includes('Agenda'))) && (
                        <button 
                            onClick={() => setShowShareModal(true)} 
                            className="flex-1 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-white py-3 px-1 rounded-xl text-[10px] font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">share</span> <span className="text-[9px] text-center leading-tight">Compartir<br/>Agenda</span>
                        </button>
                    )}
                    
                    {/* Botón Cargar TXT (Solo Admin) */}
                    {user.role === UserRole.ADMIN && (
                        <div className="flex-1 flex flex-col">
                             <input type="file" accept=".txt" ref={fileInputRef} className="hidden" onChange={handleBulkTxtUpload} />
                             <button onClick={() => fileInputRef.current?.click()} className="h-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 px-1 rounded-xl text-[10px] font-bold uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition-all">
                                <span className="material-symbols-outlined text-sm">upload_file</span> <span className="text-[9px] text-center leading-tight">Cargar<br/>TXT</span>
                            </button>
                        </div>
                    )}
                </div>
                
                {/* HINT PARA TXT UPLOAD */}
                {user.role === UserRole.ADMIN && (
                    <div className="mb-3 p-3 bg-black/20 rounded-xl border border-white/5 text-[9px] text-text-secondary font-mono leading-relaxed">
                        <p className="font-bold text-primary mb-1 uppercase tracking-widest">Formato TXT Requerido:</p>
                        **DÍA:** Lunes<br/>
                        **Temática del día:** Tarea Vida<br/>
                        <br/>
                        **Programa:** Buenos Días, Bayamo<br/>
                        **Temática:** Ahorro energético<br/>
                        **Ideas:** Entrevista a especialista...
                    </div>
                )}

                {/* Botón Limpiar (Solo Admin) */}
                {user.role === UserRole.ADMIN && (
                    <button onClick={handleClearWeek} className="w-full bg-admin-red/10 border border-admin-red/20 text-admin-red hover:bg-admin-red/20 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                        <span className="material-symbols-outlined text-sm">delete_sweep</span> Limpiar Semana
                    </button>
                )}
            </div>
            {showShareModal && activeWeek && (
                <ShareAgendaModal 
                    activeWeek={activeWeek}
                    programs={programs}
                    users={users}
                    onClose={() => setShowShareModal(false)}
                    monthName={currentMonthLabel}
                    getEffectiveData={getEffectiveData}
                    selectedWeekId={selectedWeekId}
                    onDownloadPdf={async () => {
                        const res = await generatePdfBlob();
                        if (res) {
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(res.blob);
                            link.download = res.filename;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }
                    }}
                />
            )}
            {dialogModals}
        </div>
      );
  }

  // --- VISTA PRINCIPAL (Meses o Semanas) ---
  // Nivel 0 y 1
  return (
    <div className="h-full flex flex-col bg-background-dark">
      <AgendaHeader 
        title="Agenda Editorial" 
        user={user} 
        onMenuClick={onMenuClick} 
        onBack={handleBack}
      />

      <div className="flex-none p-4 border-b border-white/5 flex items-center justify-between bg-card-dark/50 z-20 backdrop-blur">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold leading-none">{isMonthSelection ? "Selección de Mes" : "Semanas"}</h1>
            <p className="text-[9px] font-bold text-primary uppercase tracking-widest mt-1">{isMonthSelection ? dateInfo.year : currentMonthLabel}</p>
          </div>
        </div>
        {!isMonthSelection && (
          <button 
            onClick={() => setViewPdfArchive(true)} 
            className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-white/10 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">folder_open</span>
            <span>PDF Compartidos</span>
          </button>
        )}
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-32">
        {/* VISTA SELECCIÓN DE MES (Nivel 0) */}
        {isMonthSelection ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-in fade-in duration-300">
                {MONTHS_DATA.map((month, index) => {
                    const isCurrent = index === new Date().getMonth();
                    return (
                        <button 
                            key={month.id}
                            onClick={() => handleMonthSelect(index)}
                            className={`relative h-24 flex flex-col items-center justify-center rounded-[1.5rem] border transition-all active:scale-95 shadow-lg ${isCurrent ? 'bg-primary border-primary text-white shadow-primary/20' : 'bg-card-dark border-white/5 text-text-secondary hover:bg-white/5'}`}
                        >
                            <p className={`text-xl font-bold ${isCurrent ? 'text-white' : 'text-white/80'}`}>{month.name}</p>
                            {isCurrent && <span className="text-[8px] font-bold uppercase tracking-widest mt-1 bg-black/20 px-2 py-0.5 rounded-full">En Curso</span>}
                        </button>
                    );
                })}
            </div>
        ) : (
          /* VISTA LISTA DE SEMANAS (Nivel 1) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-right duration-300">
            {weeks.map(w => (
              <button key={w.id} onClick={() => { setSelectedWeekId(w.id); setProgSearch(''); }} className="w-full flex items-center justify-between bg-card-dark p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group active:scale-[0.98] transition-transform">
                <div className="text-left relative z-10">
                  <span className="text-white font-bold text-xl block group-hover:text-primary transition-colors">{w.label}</span>
                  <p className="text-[10px] text-text-secondary font-bold uppercase mt-1">Días {w.range}</p>
                </div>
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative z-10"><span className="material-symbols-outlined text-2xl">calendar_view_week</span></div>
              </button>
            ))}
          </div>
        )}
      </main>
      {dialogModals}
    </div>
  );
};

export default Editorial;

const ShareAgendaModal: React.FC<{
  activeWeek: any;
  programs: Program[];
  users: UserProfile[];
  onClose: () => void;
  monthName: string;
  getEffectiveData: (p: Program, weekId: string, dayName: string) => DailyContent;
  selectedWeekId: string;
  onDownloadPdf?: () => Promise<void>;
}> = ({ activeWeek, programs, users, onClose, monthName, getEffectiveData, selectedWeekId, onDownloadPdf }) => {
    const [channel, setChannel] = useState<'whatsapp' | 'email' | null>(null);
    const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
    const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
    const [shareStep, setShareStep] = useState<1 | 2>(1);
    
    // modal alert state if needed
    const [modalAlert, setModalAlert] = useState<string | null>(null);

    const targetUsers = useMemo(() => {
        return users.filter(u => {
            const classification = normalize((u as any).classification || '');
            const specialty = normalize((u as any).specialty || '');
            
            const isGuionista = classification.includes('guionist') || specialty.includes('guionist');
            const isAsesor = classification.includes('asesor') || specialty.includes('asesor');
            
            return isGuionista || isAsesor;
        });
    }, [users]);

    const uniquePrograms = useMemo(() => {
        const map = new Map<string, Program>();
        programs.forEach(p => {
            const normName = normalize(p.name);
            if (!map.has(normName)) {
                map.set(normName, p);
            }
        });
        return Array.from(map.values());
    }, [programs]);

    const handleToggleAllRecipients = () => {
        if (selectedRecipients.length === targetUsers.length) setSelectedRecipients([]);
        else setSelectedRecipients(targetUsers.map(u => u.id));
    };

    const handleToggleAllPrograms = () => {
        if (selectedPrograms.length === programs.length) setSelectedPrograms([]);
        else setSelectedPrograms(programs.map(p => p.id));
    };

    const generateContent = (targetUser?: UserProfile) => {
        const filteredProgs = programs.filter(p => selectedPrograms.includes(p.id));
        let content = `*AGENDA EDITORIAL - CMNL*\n`;
        content += `*MES:* ${monthName}\n`;
        content += `*${activeWeek.label}* (${activeWeek.start} al ${activeWeek.end})\n`;
        if (targetUser) content += `*PARA:* ${targetUser.name}\n`;
        content += `\n`;

        activeWeek.days.forEach((day: any) => {
            if (!day) return;
            let dayProgs = filteredProgs.filter(p => p.days.includes(day.name));
            
            // If we have a target user, filter by their habitual programs and days for their roles
            if (targetUser) {
                dayProgs = dayProgs.filter(p => {
                    const byRole = (targetUser as any).habitualProgramsByRole || {};
                    const daysByRole = (targetUser as any).habitualProgramsDays || {};
                    const normP = normalize(p.name);
                    const normDay = normalize(day.name);

                    let isRelevant = false;
                    Object.entries(byRole).forEach(([role, progs]) => {
                        const lowRole = normalize(role);
                        // SOLO tomar programas que corresponden a guionista o asesor
                        if (!(lowRole.includes('guionist') || lowRole.includes('asesor'))) return;

                        if (Array.isArray(progs) && progs.some(rp => normalize(rp) === normP)) {
                            if (lowRole.includes('guionist')) {
                                // Find assigned days using normalized program name lookup
                                let assignedDays: string[] = [];
                                const daysObj = daysByRole[role] || {};
                                Object.entries(daysObj).forEach(([dpName, dDays]) => {
                                    if (normalize(dpName) === normP && Array.isArray(dDays)) {
                                        assignedDays = [ ...assignedDays, ...dDays ];
                                    }
                                });

                                if (assignedDays.length > 0) {
                                    if (assignedDays.some(rd => {
                                        const nRd = normalize(rd);
                                        return nRd.includes(normDay) || normDay.includes(nRd);
                                    })) {
                                        isRelevant = true;
                                    }
                                } else {
                                    // strictly respect days, so if empty -> no relevant days assigned!
                                    isRelevant = false;
                                }
                            } else {
                                // Asesores
                                isRelevant = true;
                            }
                        }
                    });

                    const hasNewSystemSetup = Object.keys(byRole).some(k => Array.isArray(byRole[k]) && byRole[k].length > 0);
                    if (!isRelevant && !hasNewSystemSetup) {
                        const legacyHabitual = (targetUser as any).habitualPrograms || [];
                        if (legacyHabitual.some((lp: string) => normalize(lp) === normP)) {
                            // in legacy, we still output everything
                            isRelevant = true;
                        }
                    }

                    return isRelevant;
                });
            }

            if (dayProgs.length === 0) return;

            content += `*${day.name} ${day.date}:*\n`;
            dayProgs.forEach(p => {
                const data = getEffectiveData(p, selectedWeekId, day.name);
                if (data.theme) {
                    content += `- ${p.name}: ${data.theme}\n`;
                }
            });
            content += `\n`;
        });
        return content;
    };

    const handleShareIndividual = async (u: UserProfile) => {
        let phone = (u as any).mobile || u.phone;
        if (phone) {
            const content = generateContent(u);
            if (phone && !phone.startsWith('53') && phone.length === 8) phone = '53' + phone;
            
            // Re-introduced as a nice info but skipped download to follow user preference
            // and avoid pop-up blockers blocking the WhatsApp window
            setModalAlert(`Preparando WhatsApp para ${u.name}. Recuerda adjuntar el PDF si lo necesitas.`);
            
            openWhatsApp(content, phone);
        }
    };

    const handleShare = async () => {
        if (selectedRecipients.length === 0 || selectedPrograms.length === 0 || !channel) return;

        const recipientUsers = targetUsers.filter(u => selectedRecipients.includes(u.id));

        if (channel === 'whatsapp') {
            if (recipientUsers.length === 1) {
                await handleShareIndividual(recipientUsers[0]);
                onClose();
            } else {
                setShareStep(2);
            }
        } else {
            const emailsList = recipientUsers.map(u => (u as any).email).filter(e => e);
            if (emailsList.length > 0) {
                const emails = emailsList.join(',');
                const subject = `Agenda Editorial CMNL - ${monthName} ${activeWeek.label}`;
                const textDesc = generateContent().replace(/\*/g, '');

                // Assist by copying emails
                try {
                    await navigator.clipboard.writeText(emails);
                } catch (err) {
                    console.error(err);
                }

                const subjectEncoded = encodeURIComponent(subject);
                const bodyEncoded = encodeURIComponent(textDesc);
                
                // Force open mail app to ensure recipients are there
                window.location.href = `mailto:${emails}?subject=${subjectEncoded}&body=${bodyEncoded}`;
                setModalAlert("Se ha abierto Gmail con los destinatarios. Los correos también se copiaron al portapapeles. Recuerda adjuntar el PDF.");
            } else {
                setModalAlert("No se encontraron correos seleccionados.");
            }
        }
    };

    if (shareStep === 2) {
        const recipientUsers = targetUsers.filter(u => selectedRecipients.includes(u.id));
        const content = generateContent();
        
        return (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
                <div className="bg-card-dark w-full max-w-md rounded-[2.5rem] border border-white/10 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-white/5 bg-card-dark">
                        <h3 className="text-white font-bold text-lg">Enviando por WhatsApp</h3>
                        <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">Envía el mensaje a cada destinatario</p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
                        {recipientUsers.map(u => {
                            let phone = (u as any).mobile || u.phone;
                            const hasPhone = !!phone;
                            return (
                                <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div>
                                        <p className="text-white text-sm font-bold">{u.name}</p>
                                        <p className="text-[10px] text-text-secondary">{phone || 'Sin número'}</p>
                                    </div>
                                    <button 
                                        disabled={!hasPhone}
                                        onClick={() => handleShareIndividual(u)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                                            hasPhone ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-white/10 text-white/30 cursor-not-allowed'
                                        }`}
                                    >
                                        Enviar
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="p-6 border-t border-white/5 bg-card-dark">
                        <button onClick={onClose} className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all">Finalizar</button>
                    </div>
                    {modalAlert && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-card-dark border border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
                                <div className="size-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-2xl">info</span>
                                </div>
                                <p className="text-sm text-text-secondary mb-6">{modalAlert}</p>
                                <button onClick={() => { setModalAlert(null); if (shareStep === 1) onClose(); }} className="w-full py-3 text-xs font-bold bg-primary text-background-dark rounded-xl hover:opacity-90 transition-opacity tracking-widest uppercase">Aceptar</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-card-dark w-full max-w-md rounded-[2.5rem] border border-white/10 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/5 bg-card-dark">
                    <h3 className="text-white font-bold text-lg">Compartir Agenda</h3>
                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">Selecciona canal, destinatarios y programas</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                    {/* Canal selection */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest ml-1">1. Seleccionar Canal</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setChannel('whatsapp')}
                                className={`py-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${channel === 'whatsapp' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                            >
                                <span className="material-symbols-outlined text-2xl">chat</span>
                                <span className="font-bold text-[10px] uppercase">WhatsApp</span>
                            </button>
                            <button 
                                onClick={() => setChannel('email')}
                                className={`py-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${channel === 'email' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'}`}
                            >
                                <span className="material-symbols-outlined text-2xl">mail</span>
                                <span className="font-bold text-[10px] uppercase">Gmail</span>
                            </button>
                        </div>
                    </div>

                    {/* Recipients selection */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end px-1">
                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">2. Destinatarios ({targetUsers.length})</label>
                            <button onClick={handleToggleAllRecipients} className="text-[9px] font-bold text-primary uppercase">
                                {selectedRecipients.length === targetUsers.length ? "Deseleccionar" : "Seleccionar Todos"}
                            </button>
                        </div>
                        <div className="bg-black/20 rounded-2xl border border-white/5 p-2 max-h-40 overflow-y-auto no-scrollbar">
                            {targetUsers.length > 0 ? targetUsers.map(u => (
                                <label key={u.id} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedRecipients.includes(u.id)}
                                        onChange={() => {
                                            if (selectedRecipients.includes(u.id)) {
                                                setSelectedRecipients(selectedRecipients.filter(id => id !== u.id));
                                            } else {
                                                setSelectedRecipients([...selectedRecipients, u.id]);
                                                
                                                // Extract habitual programs ONLY for relevant roles (guionista/asesor)
                                                const allHabitual = new Set<string>();
                                                const hasByRole = !!u.habitualProgramsByRole;
                                                
                                                if (u.habitualProgramsByRole) {
                                                    Object.entries(u.habitualProgramsByRole).forEach(([role, progs]) => {
                                                        const lowRole = normalize(role);
                                                        if (lowRole.includes('guionist') || lowRole.includes('asesor')) {
                                                            if (Array.isArray(progs)) {
                                                                progs.forEach(p => allHabitual.add(p));
                                                            }
                                                        }
                                                    });
                                                }

                                                // Fallback to simple habitualPrograms ONLY if byRole is NOT present
                                                if (!hasByRole && u.habitualPrograms) {
                                                    u.habitualPrograms.forEach(p => allHabitual.add(p));
                                                }
 
                                                const programIdsToSelect = programs
                                                    .filter(p => {
                                                        const pNorm = normalize(p.name);
                                                        return Array.from(allHabitual).some(h => normalize(h) === pNorm);
                                                    })
                                                    .map(p => p.id);
                                                    
                                                if (programIdsToSelect.length > 0) {
                                                    setSelectedPrograms(prev => [...new Set([...prev, ...programIdsToSelect])]);
                                                }
                                            }
                                        }}
                                        className="accent-primary size-4"
                                    />
                                    <div className="flex-1">
                                        <p className="text-white text-xs font-bold">{u.name}</p>
                                        <p className="text-[9px] text-text-secondary uppercase">{(u as any).classification || "Usuario"}</p>
                                    </div>
                                </label>
                            )) : (
                                <p className="text-center py-4 text-[10px] text-white/30 uppercase italic">No se encontraron guionistas o asesores</p>
                            )}
                        </div>
                    </div>

                    {/* Programs selection */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end px-1">
                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">3. Programas ({uniquePrograms.length})</label>
                            <button onClick={handleToggleAllPrograms} className="text-[9px] font-bold text-primary uppercase">
                                {selectedPrograms.length === programs.length ? "Deseleccionar" : "Seleccionar Todos"}
                            </button>
                        </div>
                        <div className="bg-black/20 rounded-2xl border border-white/5 p-2 max-h-40 overflow-y-auto no-scrollbar">
                            {uniquePrograms.map(p => {
                                const normName = normalize(p.name);
                                const relatedIds = programs.filter(x => normalize(x.name) === normName).map(x => x.id);
                                const isChecked = relatedIds.every(id => selectedPrograms.includes(id));
                                
                                return (
                                    <label key={p.id} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={isChecked}
                                            onChange={() => {
                                                if (isChecked) {
                                                    setSelectedPrograms(selectedPrograms.filter(id => !relatedIds.includes(id)));
                                                } else {
                                                    setSelectedPrograms([...new Set([...selectedPrograms, ...relatedIds])]);
                                                }
                                            }}
                                            className="accent-primary size-4"
                                        />
                                        <span className="text-white text-xs font-medium">{p.name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/5 bg-card-dark flex gap-3">
                    <button onClick={onClose} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all">Cancelar</button>
                    <button 
                        onClick={handleShare} 
                        disabled={!channel || selectedRecipients.length === 0 || selectedPrograms.length === 0}
                        className="flex-1 py-4 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all disabled:opacity-50"
                    >
                        Compartir
                    </button>
                </div>
            </div>
        </div>
    );
};

const ExportAgendaModal: React.FC<{
  onClose: () => void;
  onDownload: () => void;
  onWhatsApp: () => void;
  onGmail: () => void;
}> = ({ onClose, onDownload, onWhatsApp, onGmail }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-card-dark w-full max-w-sm rounded-[2.5rem] border border-white/10 shadow-2xl relative flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/5 bg-card-dark text-center">
                    <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-white text-2xl">description</span>
                    </div>
                    <h3 className="text-white font-bold text-xl">Exportar Agenda</h3>
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-2">¿Cómo deseas obtener este documento PDF?</p>
                </div>

                <div className="p-6 space-y-3">
                    <button 
                        onClick={onWhatsApp}
                        className="w-full py-4 rounded-2xl border bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all flex items-center justify-center gap-3"
                    >
                        <span className="material-symbols-outlined text-xl">chat</span>
                        <span className="font-bold text-[11px] uppercase tracking-wider">WhatsApp</span>
                    </button>

                    <button 
                        onClick={onGmail}
                        className="w-full py-4 rounded-2xl border bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all flex items-center justify-center gap-3"
                    >
                        <span className="material-symbols-outlined text-xl">mail</span>
                        <span className="font-bold text-[11px] uppercase tracking-wider">Gmail</span>
                    </button>

                    <button 
                        onClick={onDownload}
                        className="w-full py-4 rounded-2xl border bg-white/5 border-white/10 text-white hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                    >
                        <span className="material-symbols-outlined text-xl">download</span>
                        <span className="font-bold text-[11px] uppercase tracking-wider">Descargar Local</span>
                    </button>
                </div>
                
                <div className="p-4 border-t border-white/5 bg-black/40 text-center">
                    <button onClick={onClose} className="px-6 py-2 text-[10px] text-text-secondary hover:text-white font-bold uppercase tracking-widest transition-colors">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};
