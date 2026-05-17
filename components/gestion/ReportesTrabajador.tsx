import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Save, Clock, ArrowRight, FileCode, FileDown, Search } from 'lucide-react';
import { User, FP02Report, ProgramFicha, ConsolidatedPayment, ProgramCatalog, WorkLog } from '../../types';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table as DocTable, TableRow as DocRow, TableCell as DocCell, TextRun, AlignmentType, WidthType } from 'docx';

interface Props {
  currentUser: User | null;
  fichas: ProgramFicha[];
  equipoData: any[]; 
  catalogo: ProgramCatalog[];
  consolidatedPayments: ConsolidatedPayment[];
  setConsolidatedPayments: React.Dispatch<React.SetStateAction<ConsolidatedPayment[]>>;
  getProgramRate: (name: string, role: string, level: string) => number;
  calculateTax: (amount: number) => number;
  reports: FP02Report[];
  isMatch: (name1: string, name2: string) => boolean;
  normalize: (s: string) => string;
  workLogs: WorkLog[];
  setWorkLogs: React.Dispatch<React.SetStateAction<WorkLog[]>>;
  workLogDate: string;
  setWorkLogDate: React.Dispatch<React.SetStateAction<string>>;
  workLogView: 'daily' | 'weekly' | 'monthly';
  setWorkLogView: React.Dispatch<React.SetStateAction<'daily' | 'weekly' | 'monthly'>>;
}

export const ReportesTrabajador: React.FC<Props> = ({
  currentUser, fichas, equipoData, catalogo,
  consolidatedPayments, setConsolidatedPayments,
  getProgramRate, calculateTax, reports, isMatch, normalize,
  workLogs, setWorkLogs, workLogDate, setWorkLogDate, workLogView, setWorkLogView
}) => {
  const [activeTab, setActiveTab] = useState<'autogestion' | 'oficiales' | 'pagos'>('autogestion');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7));

  // Auto-set view to daily and prevent weekly
  useEffect(() => {
    if (workLogView === 'weekly') {
      setWorkLogView('daily');
    }
  }, [workLogView, setWorkLogView]);

  // Determine user configuration
  const userPaymentConfig = React.useMemo(() => {
      if (!currentUser) return null;
      const member = equipoData.find(m => m.username === currentUser.username || m.name === currentUser.name);
      if (!member) return null;
      
      const specialties = member.specialty ? member.specialty.split(' / ') : [];
      const levels = member.level ? member.level.split(' / ') : [];
      const supportedRoles = ['Locutor', 'Realizador de sonido', 'Director', 'Asesor'];
      
      const roles: { role: string, level: string }[] = [];
      
      specialties.forEach((spec: string, index: number) => {
          const matchedRole = supportedRoles.find(r => spec.toLowerCase().includes(r.toLowerCase()));
          if (matchedRole && roles.length < 3) {
              let levelStr = levels[index] || levels[0] || 'I';
              let level = 'I';
              if (levelStr.toLowerCase().includes('primer')) level = 'I';
              else if (levelStr.toLowerCase().includes('segundo')) level = 'II';
              else if (levelStr.toLowerCase().includes('tercer')) level = 'III';
              else if (levelStr.toLowerCase().includes('habilitado') || levelStr.toLowerCase().includes('no especificado')) level = 'SR';
              
              if (!roles.some(r => r.role === matchedRole)) {
                  roles.push({
                      role: matchedRole,
                      level: level
                  });
              }
          }
      });

      return {
          roles,
          baseSalary: 0
      };
  }, [currentUser, equipoData]);

  // Autogestion Date calculations
  const todayForState = new Date();
  
  const parseLocalDate = (dateString: string) => {
      const parts = dateString.split('-');
      if (parts.length === 3) {
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
      return new Date(dateString + 'T12:00:00');
  };
  
  const handlePrevDay = () => {
      const d = parseLocalDate(workLogDate);
      d.setDate(d.getDate() - 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setWorkLogDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleNextDay = () => {
      const d = parseLocalDate(workLogDate);
      d.setDate(d.getDate() + 1);
      const todayStripped = new Date(todayForState.getFullYear(), todayForState.getMonth(), todayForState.getDate());
      if (d > todayStripped) return;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setWorkLogDate(`${yyyy}-${mm}-${dd}`);
  };

  const getDates = () => {
      return [workLogDate];
  };

  const dates = getDates();

  const toggleWorkLog = (date: string, programName: string, role: string) => {
      if (!currentUser) return;

      // Rule: Director and Asesor cannot coincide in the same program on the same day
      const normalizedRole = normalize(role);
      const isDirector = normalizedRole.includes('director');
      const isAsesor = normalizedRole.includes('asesor');

      if (isDirector || isAsesor) {
          const otherRoleName = isDirector ? 'Asesor' : 'Director';
          const hasConflictingRole = workLogs.some(l => 
              l.userId === currentUser.username && 
              l.date === date && 
              l.programName === programName && 
              normalize(l.role).includes(otherRoleName.toLowerCase()) &&
              l.type !== 'manual_delete'
          );

          if (hasConflictingRole) {
              alert(`¡Conflicto de especialidades! Las especialidades de Director y Asesor no pueden coincidir en un mismo programa. Por favor, selecciona una sola para "${programName}".`);
              return;
          }

          // Check habitual conflict too
          const member = equipoData.find(m => m.username === currentUser.username || m.name === currentUser.name);
          const habitualPrograms = member?.habitualProgramsByRole || {};
          let otherRoleHabitualProgs: string[] = [];
          for (const [rName, plist] of Object.entries(habitualPrograms)) {
              if (normalize(rName).includes(otherRoleName.toLowerCase())) {
                  otherRoleHabitualProgs = plist as string[];
                  break;
              }
          }
          
          const isOtherRoleHabitual = otherRoleHabitualProgs.some(p => isMatch(p, programName)) && isProgramOnDay(programName, date);
          const otherRoleDeleted = workLogs.some(l => 
              l.userId === currentUser.username && 
              l.date === date && 
              l.programName === programName && 
              normalize(l.role).includes(otherRoleName.toLowerCase()) &&
              l.type === 'manual_delete'
          );

          if (isOtherRoleHabitual && !otherRoleDeleted) {
              alert(`¡Conflicto de especialidades! Este programa ya está asignado habitualmente como ${otherRoleName}. No puede ser marcado como ${isDirector ? 'Director' : 'Asesor'} simultáneamente.`);
              return;
          }
      }
      
      const member = equipoData.find(m => m.username === currentUser.username || m.name === currentUser.name);
      const habitualPrograms = member?.habitualProgramsByRole || {};
      let progsForRole: string[] = [];
      for (const [rName, plist] of Object.entries(habitualPrograms)) {
         if (rName.toLowerCase().includes(role.toLowerCase()) || role.toLowerCase().includes(rName.toLowerCase())) {
             progsForRole = plist as string[]; break;
         }
      }
      const isHabitualAssigned = progsForRole.some((p: string) => isMatch(p, programName));
      const isHabitual = isHabitualAssigned && isProgramOnDay(programName, date);

      const existingIndex = workLogs.findIndex(l => 
          l.userId === currentUser.username && 
          l.date === date && 
          l.programName === programName && 
          l.role === role
      );

      const existingLog = existingIndex >= 0 ? workLogs[existingIndex] : null;

      if (isHabitual) {
          if (existingLog && existingLog.type === 'manual_delete') {
              const newLogs = [...workLogs];
              newLogs.splice(existingIndex, 1);
              setWorkLogs(newLogs);
          } else if (!existingLog) {
              setWorkLogs([...workLogs, {
                  id: Date.now().toString(),
                  userId: currentUser.username,
                  date,
                  programName,
                  role,
                  hours: 0,
                  type: 'manual_delete',
                  syncStatus: 'pending'
              }]);
          }
      } else {
          if (existingLog && existingLog.type !== 'manual_delete') {
              const newLogs = [...workLogs];
              newLogs.splice(existingIndex, 1);
              setWorkLogs(newLogs);
          } else {
              setWorkLogs([...workLogs, {
                  id: Date.now().toString(),
                  userId: currentUser.username,
                  date,
                  programName,
                  role,
                  hours: 0,
                  type: 'habitual',
                  syncStatus: 'pending'
              }]);
          }
      }
  };

  const getProgramStartTime = (progName: string) => {
      const DEFAULT_PROGRAMS = [
          { name: "Noticiero Nacional", schedule: "13:00-13:30" },
          { name: "Noticiero Provincial", schedule: "12:00-12:28" }
      ];
      
      const allFichas = [...fichas, ...DEFAULT_PROGRAMS];
      
      let bestFicha = null;
      let bestDiff = Infinity;
      for (const f of allFichas) {
          if (isMatch(f.name, progName)) {
              const diff = Math.abs(f.name.length - progName.length);
              if (diff < bestDiff) {
                  bestDiff = diff;
                  bestFicha = f;
              }
          }
      }

      if (bestFicha && bestFicha.schedule) {
          const match = bestFicha.schedule.match(/(\d{1,2})[:.](\d{2})\s*(AM|PM)?/i);
          if (match) {
              let hours = parseInt(match[1]);
              const minutes = parseInt(match[2]);
              const ampm = match[3] ? match[3].toUpperCase() : null;
              if (ampm === 'PM' && hours < 12) hours += 12;
              if (ampm === 'AM' && hours === 12) hours = 0;
              return hours * 60 + minutes;
          }
      }
      
      // Fallback for Cabinas
      if (normalize(progName).includes('cabina')) {
          if (progName.includes('12:00') || progName.includes('12.00')) return 12 * 60;
          if (progName.includes('1:00') || progName.includes('1.00') || progName.includes('13:00')) return 13 * 60;
      }

      return 9999;
  };

  const isProgramOnDay = (programName: string, dateStr: string) => {
      const date = new Date(dateStr + 'T12:00:00');
      const day = date.getDay();
      const progNameLower = normalize(programName);

      // Cabina specific logic first
      if (progNameLower.includes('cabina')) {
          if (progNameLower.includes('12:00') || progNameLower.includes('12.00')) {
              // Noticiero Provincial: Mon-Sat
              return day !== 0;
          }
          if (progNameLower.includes('1:00') || progNameLower.includes('1.00') || progNameLower.includes('13:00')) {
              // Noticiero Nacional: Mon-Sun
              return true;
          }
      }

      // Name-based hints (override ficha if explicit in catalog name)
      if (progNameLower.includes('sabado') && day === 6) return true;
      if (progNameLower.includes('domingo') && day === 0) return true;
      if (progNameLower.includes('lunes a viernes') && day >= 1 && day <= 5) return true;
      if (progNameLower.includes('lunes a sabado') && day !== 0) return true;

      const DEFAULT_PROGRAMS = [
          { name: "Noticiero Nacional", duration: "28 min", frequency: "Lunes a Domingo", schedule: "13:00-13:30" },
          { name: "Noticiero Provincial", duration: "28 min", frequency: "Lunes a Sábado", schedule: "12:00-12:28" }
      ];
      
      const allFichas = [...fichas, ...DEFAULT_PROGRAMS];
      let ficha = allFichas.find(f => isMatch(f.name, programName));
      
      if (!ficha) return false;
      const freq = normalize(ficha.frequency || '');
      
      if (freq.includes('diario') || freq.includes('lunes a domingo') || freq.includes('lunes-domingo') || freq.includes('lunes - domingo')) return true;
      if ((freq.includes('lunes a sabado') || freq.includes('lunes-sabado') || freq.includes('lunes - sabado')) && day !== 0) return true;
      if ((freq.includes('lunes a viernes') || freq.includes('lunes-viernes') || freq.includes('lunes - viernes')) && day >= 1 && day <= 5) return true;
      if ((freq.includes('lunes a jueves') || freq.includes('lunes-jueves') || freq.includes('lunes - jueves')) && day >= 1 && day <= 4) return true;
      if ((freq.includes('lunes a miercoles') || freq.includes('lunes-miercoles') || freq.includes('lunes - miercoles')) && day >= 1 && day <= 3) return true;
      if ((freq.includes('martes a viernes') || freq.includes('martes-viernes') || freq.includes('martes - viernes')) && day >= 2 && day <= 5) return true;
      if ((freq.includes('martes a jueves') || freq.includes('martes-jueves') || freq.includes('martes - jueves')) && day >= 2 && day <= 4) return true;
      if ((freq.includes('miercoles a viernes') || freq.includes('miercoles-viernes') || freq.includes('miercoles - viernes')) && day >= 3 && day <= 5) return true;
      if ((freq.includes('jueves a domingo') || freq.includes('jueves-domingo') || freq.includes('jueves - domingo')) && (day >= 4 || day === 0)) return true;
      if ((freq.includes('viernes a domingo') || freq.includes('viernes-domingo') || freq.includes('viernes - domingo')) && (day >= 5 || day === 0)) return true;
      if ((freq.includes('fines de semana') || freq.includes('fin de semana')) && (day === 0 || day === 6)) return true;
      
      const daysMap: { [key: number]: string[] } = {
          0: ['domingo', 'dominical'],
          1: ['lunes'],
          2: ['martes'],
          3: ['miercoles'],
          4: ['jueves'],
          5: ['viernes'],
          6: ['sabado', 'sabatina']
      };

      const freqWords = freq.split(/[\s,y-]+/);
      return daysMap[day].some(d => freqWords.some(w => w.includes(d) || (d.includes(w) && w.length >= 3)));
  };

  const programsListRaw = React.useMemo(() => {
      const uniqueCanonical = new Map<string, string>();
      catalogo.forEach(c => {
          const norm = normalize(c.name);
          if (!uniqueCanonical.has(norm)) {
              uniqueCanonical.set(norm, c.name);
          }
      });
      return Array.from(uniqueCanonical.values());
  }, [catalogo, normalize]);

  const programsListFilteredByDay = React.useMemo(() => {
      return programsListRaw.filter(prog => dates.some(date => isProgramOnDay(prog, date)));
  }, [programsListRaw, dates, isProgramOnDay]);


  const sortedPrograms = (list: string[]) => {
      const newList = [...list];
      newList.sort((a, b) => {
          const timeA = getProgramStartTime(a);
          const timeB = getProgramStartTime(b);
          if (timeA !== timeB) return timeA - timeB;
          return a.localeCompare(b);
      });
      return newList;
  };

  const programsByRole = React.useMemo(() => {
      if (!currentUser || !userPaymentConfig) return [];
      return userPaymentConfig.roles.map((role, idx) => {
          const filtered = programsListFilteredByDay.filter(prog => {
              // Rate check
              const rate = getProgramRate(prog, role.role, role.level);
              if (rate <= 0) return false;

              // Cabina restrictions
              if (prog.toLowerCase().includes('cabina')) {
                  const rName = normalize(role.role);
                  const isRealizador = rName.includes('realizador');
                  const isLocutor = rName.includes('locutor');
                  if (!isRealizador && !isLocutor) return false;
              }

              return true;
          });
          return { ...role, programs: sortedPrograms(filtered), id: `${role.role}-${idx}` };
      });
  }, [currentUser, userPaymentConfig, programsListFilteredByDay, getProgramRate]);

  // Autogestion Calculation (Current Month)
  const autogestionMetrics = React.useMemo(() => {
    let income = 0;
    let count = 0;
    const currentMonthPrefix = workLogDate.substring(0, 7);
    const today = new Date();
    const [yearNow, monthNow] = [today.getFullYear(), today.getMonth() + 1];

    if (userPaymentConfig && currentUser) {
        const member = equipoData.find(m => m.username === currentUser.username || m.name === currentUser.name);
        const habitualPrograms = member?.habitualProgramsByRole || {};
        const allPossiblePrograms = programsListRaw;

        const parts = currentMonthPrefix.split('-');
        const yyyy = parseInt(parts[0]);
        const mm = parseInt(parts[1]);
        const daysInMonth = new Date(yyyy, mm, 0).getDate();

        // Rule: Calculate from day 1 to (current day - 1) for current month
        // For past months, do full month.
        let endDay = daysInMonth;
        if (yyyy === yearNow && mm === monthNow) {
            endDay = Math.max(0, today.getDate() - 1);
        }

        for (let day = 1; day <= endDay; day++) {
             const dateStr = `${yyyy}-${String(mm).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

             userPaymentConfig.roles.forEach(role => {
                 allPossiblePrograms.forEach(prog => {
                     const isManual = workLogs.some(l => l.userId === currentUser.username && l.role === role.role && isMatch(l.programName, prog) && l.date === dateStr && l.type !== 'manual_delete');
                     const isDeleted = workLogs.some(l => l.userId === currentUser.username && l.role === role.role && isMatch(l.programName, prog) && l.date === dateStr && l.type === 'manual_delete');
                     
                     let progsForRole: string[] = [];
                     for (const [rName, plist] of Object.entries(habitualPrograms)) {
                        if (normalize(rName).includes(normalize(role.role)) || normalize(role.role).includes(normalize(rName))) {
                            progsForRole = plist as string[]; break;
                        }
                     }

                     const isHabitualAssigned = progsForRole.some((p: string) => isMatch(p, prog));
                     const isHabitual = isHabitualAssigned && isProgramOnDay(prog, dateStr);
                     const isWorked = isManual || (isHabitual && !isDeleted);

                     if (isWorked) {
                         income += getProgramRate(prog, role.role, role.level || 'I');
                         count++;
                     }
                 });
             });
        }
    }
    const tax = calculateTax(income);
    return {
        bruto: income,
        tax: tax,
        neto: income - tax,
        count
    };
  }, [workLogs, userPaymentConfig, currentUser, workLogDate.substring(0, 7), getProgramRate, calculateTax, equipoData, catalogo, isMatch, normalize]);

  // Handle Autogestion Consolidate
  const handleConsolidateAutogestion = () => {
    // Only allow if today > last day of the shown month
    const currentDate = new Date();
    const currentMonthPrefix = currentDate.toISOString().substring(0, 7);
    const viewedMonthPrefix = workLogDate.substring(0, 7);
    
    if (viewedMonthPrefix >= currentMonthPrefix) {
        alert("Consolidar mes: Solo funcional a partir del día 1 del mes siguiente.");
        return;
    }

    if (!currentUser) return;

    const newConsolidated: ConsolidatedPayment = {
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.username,
        month: viewedMonthPrefix,
        amount: autogestionMetrics.neto,
        grossAmount: autogestionMetrics.bruto,
        taxAmount: autogestionMetrics.tax,
        reportCount: autogestionMetrics.count,
        dateConsolidated: new Date().toISOString(),
        calculationMode: 'autogestionado'
    };
    
    setConsolidatedPayments(prev => [...prev.filter(c => !(c.userId === currentUser.username && c.month === viewedMonthPrefix && c.calculationMode === 'autogestionado')), newConsolidated]);
    alert("Mes consolidado enviado a sus pagos autogestionados exitosamente.");
    setActiveTab('pagos');
  };

  // Oficiales Calculation (Current User Only)
  const oficialesMetrics = React.useMemo(() => {
      if (!currentUser) return null;
      let income = 0;
      let count = 0;
      
      const userReports = reports.filter(r => 
        r.mes === workLogDate.substring(0, 7) && 
        r.especialidades.some(esp => 
          isMatch(esp.nombre, currentUser.name) || 
          (currentUser.username && esp.nombre.toLowerCase().includes(currentUser.username.toLowerCase()))
        )
      );

      userReports.forEach(rep => {
          const esp = rep.especialidades.find(e => 
              isMatch(e.nombre, currentUser.name) || 
              (currentUser.username && e.nombre.toLowerCase().includes(currentUser.username.toLowerCase()))
          );
          if (esp) {
              const roleConfig = userPaymentConfig?.roles.find(r => normalize(r.role).includes(normalize(esp.rol)));
              income += getProgramRate(rep.programa, esp.rol, roleConfig?.level || 'I');
              count++;
          }
      });

      const tax = calculateTax(income);
      return {
          bruto: income,
          tax: tax,
          neto: income - tax,
          count
      }
  }, [reports, workLogDate, currentUser, userPaymentConfig, getProgramRate, calculateTax, isMatch]);

  const generateComparativa = () => {
      // Find differences in the current filterMonth between user insertions and official reports
      if (!currentUser) return;
      
      const officialLogs = reports
        .filter(r => r.mes === filterMonth && r.especialidades.some(esp => isMatch(esp.nombre, currentUser.name)))
        .map(r => {
            const esp = r.especialidades.find(e => isMatch(e.nombre, currentUser.name));
            return { date: r.fecha, program: r.programa, role: esp?.rol || '' };
        });

      const userLogs = workLogs.filter(l => l.userId === currentUser.username && l.date.startsWith(filterMonth));

      // Quick visual comparison in a docx
      const table = new DocTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new DocRow({
                    children: [
                        new DocCell({ children: [new Paragraph({ text: "Fecha", alignment: AlignmentType.CENTER })], shading: { fill: '5D3A24' } }),
                        new DocCell({ children: [new Paragraph({ text: "Programa", alignment: AlignmentType.CENTER })], shading: { fill: '5D3A24' } }),
                        new DocCell({ children: [new Paragraph({ text: "Autogestión", alignment: AlignmentType.CENTER })], shading: { fill: '5D3A24' } }),
                        new DocCell({ children: [new Paragraph({ text: "Oficial", alignment: AlignmentType.CENTER })], shading: { fill: '5D3A24' } })
                    ]
                }),
                // Group by date
                ...Array.from(new Set([...officialLogs.map(o => o.date), ...userLogs.map(u => u.date)])).sort().map(d => {
                    const uProgs = userLogs.filter(u => u.date === d).map(u => u.programName).join(', ');
                    const oProgs = officialLogs.filter(o => o.date === d).map(o => o.program).join(', ');
                    const isDiff = uProgs !== oProgs;

                    return new DocRow({
                        children: [
                            new DocCell({ children: [new Paragraph({ text: d, alignment: AlignmentType.CENTER })] }),
                            new DocCell({ children: [new Paragraph({ text: Array.from(new Set([...uProgs.split(', '), ...oProgs.split(', ')])).join(', '), alignment: AlignmentType.CENTER })] }),
                            new DocCell({ children: [new Paragraph({ text: uProgs || '-', alignment: AlignmentType.CENTER })] }),
                            new DocCell({ children: [new Paragraph({ text: oProgs || '-', alignment: AlignmentType.CENTER })], shading: isDiff ? { fill: 'FFEEEE' } : { fill: 'EEFFEE' } })
                        ]
                    });
                })
            ]
      });

      const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({ children: [new TextRun({ text: `COMPARATIVA MES: ${filterMonth} - ${currentUser.name}`, bold: true, size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                    table
                ]
            }]
      });

      Packer.toBlob(doc).then(blob => saveAs(blob, `Comparativa_${currentUser.username}_${filterMonth}.docx`));
  };

  const generateInforme = () => {
      // Basic Informe matching official and autogestion tables
      generateComparativa();
  };

  return (
      <div className="flex-1 w-full flex flex-col">
          <div className="flex gap-4 border-b border-[#9E7649]/30 mb-6 overflow-x-auto no-scrollbar justify-between">
              <button 
                className={`flex-1 min-w-[100px] text-center pb-2 px-2 font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'autogestion' ? 'border-[#9E7649] text-white' : 'border-transparent text-[#E8DCCF]/50 hover:text-[#E8DCCF]'}`}
                onClick={() => setActiveTab('autogestion')}
              >
                Autogestión
              </button>
              <button 
                className={`flex-1 min-w-[100px] text-center pb-2 px-2 font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'oficiales' ? 'border-[#9E7649] text-white' : 'border-transparent text-[#E8DCCF]/50 hover:text-[#E8DCCF]'}`}
                onClick={() => setActiveTab('oficiales')}
              >
                Oficial
              </button>
              <button 
                className={`flex-1 min-w-[100px] text-center pb-2 px-2 font-bold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'pagos' ? 'border-[#9E7649] text-white' : 'border-transparent text-[#E8DCCF]/50 hover:text-[#E8DCCF]'}`}
                onClick={() => setActiveTab('pagos')}
              >
                Pagos
              </button>
          </div>

          {activeTab === 'autogestion' && (
              <div className="space-y-6">
                 {/* Income Band */}
                 <div className="bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 shadow-xl">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                           <CalendarIcon size={20} className="text-[#9E7649]" />
                           <div className="flex flex-col">
                               <h3 className="text-white font-bold text-lg leading-tight">Registro mensual</h3>
                               <span className="text-[#9E7649] font-bold text-sm leading-none capitalize">
                                   {new Date(workLogDate + 'T12:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                               </span>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-[#9E7649]/30">
                                <button onClick={handlePrevDay} className="p-1 text-[#9E7649] hover:bg-[#9E7649]/20 rounded transition-colors"><ChevronLeft size={18} /></button>
                                <input 
                                    type="date" 
                                    className="bg-[#1A100C]/60 text-white text-sm font-bold w-32 border border-[#9E7649]/30 rounded-md focus:ring-2 focus:ring-[#9E7649]/50 p-1 text-center" 
                                    value={workLogDate}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val) {
                                            const d = new Date(val + 'T12:00:00');
                                            const todayStripped = new Date(todayForState.getFullYear(), todayForState.getMonth(), todayForState.getDate());
                                            if (d <= todayStripped) {
                                                setWorkLogDate(val);
                                            }
                                        }
                                    }}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                                <button onClick={handleNextDay} className="p-1 text-[#9E7649] hover:bg-[#9E7649]/20 rounded transition-colors"><ChevronRight size={18} /></button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#9E7649]/20 pt-4">
                         <div className="bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/10 relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ArrowRight size={48} /></div>
                             <p className="text-[10px] text-[#9E7649] uppercase font-bold tracking-wider mb-1">Ingresos Brutos</p>
                             <div className="text-3xl font-display font-bold text-white">${autogestionMetrics.bruto.toFixed(2)}</div>
                         </div>
                         <div className="bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/10 relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><ArrowRight size={48} /></div>
                             <p className="text-[10px] text-[#9E7649] uppercase font-bold tracking-wider mb-1">Impuestos a Descontar</p>
                             <div className="text-3xl font-display font-bold text-red-400">-${autogestionMetrics.tax.toFixed(2)}</div>
                         </div>
                         <div className="bg-[#1A100C] p-4 rounded-xl border border-green-500/20 relative overflow-hidden group">
                             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><CheckCircle2 size={48} /></div>
                             <p className="text-[10px] text-green-400 uppercase font-bold tracking-wider mb-1">Ingreso Neto (A Pagar)</p>
                             <div className="text-3xl font-display font-bold text-green-400">${autogestionMetrics.neto.toFixed(2)}</div>
                         </div>
                    </div>
                 </div>

                 {/* Work Logs Edition */}
                 <div className="bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 shadow-xl overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[10px] text-[#9E7649] uppercase tracking-widest bg-[#3E1E16] border-y border-[#9E7649]/10">
                            <tr>
                                <th className="px-4 py-3 border-r border-[#9E7649]/10 w-1/3">Programa (Parrilla)</th>
                                {dates.map(date => (
                                    <th key={date} className="px-2 py-3 text-center border-r border-[#9E7649]/10 last:border-r-0 min-w-[80px]">
                                        {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-[#9E7649]/10">
                            {programsByRole.map(roleData => {
                                const mem = equipoData.find(m => m.username === currentUser?.username || m.name === currentUser?.name);
                                const habitualPrograms = mem?.habitualProgramsByRole || {};
                                let progsForRole: string[] = [];
                                for (const [rName, plist] of Object.entries(habitualPrograms)) {
                                    if (normalize(rName).includes(normalize(roleData.role)) || normalize(roleData.role).includes(normalize(rName))) {
                                        progsForRole = plist as string[]; break;
                                    }
                                }

                                return (
                                    <React.Fragment key={roleData.id}>
                                        <tr className="bg-[#1A100C]">
                                            <td colSpan={dates.length + 1} className="px-4 py-2 text-xs font-bold text-[#9E7649] bg-[#3E1E16]/30 uppercase tracking-widest border-y border-[#9E7649]/20">
                                                Especialidad: {roleData.role} ({roleData.level})
                                            </td>
                                        </tr>
                                        {roleData.programs.map(prog => (
                                            <tr key={prog} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 font-medium text-white/90 border-r border-[#9E7649]/10">
                                                    <div>{prog}</div>
                                                    {progsForRole.some(p => isMatch(p, prog)) && (
                                                        <div className="text-[9px] text-green-500/70 font-bold uppercase mt-0.5">Habitual</div>
                                                    )}
                                                </td>
                                                {dates.map(date => {
                                                    const isHabitualAssigned = progsForRole.some((p: string) => isMatch(p, prog));
                                                    const isHabitual = isHabitualAssigned && isProgramOnDay(prog, date);
                                                    const hasManualEdit = workLogs.some(l => l.userId === currentUser?.username && l.role === roleData.role && isMatch(l.programName, prog) && l.date === date && l.type !== 'manual_delete');
                                                    const isDeleted = workLogs.some(l => l.userId === currentUser?.username && l.role === roleData.role && isMatch(l.programName, prog) && l.date === date && l.type === 'manual_delete');
                                                    const isWorked = hasManualEdit || (isHabitual && !isDeleted);
                                                    
                                                    return (
                                                        <td key={date} className="px-2 py-3 text-center border-r border-[#9E7649]/10 last:border-r-0">
                                                            <button 
                                                                onClick={() => toggleWorkLog(date, prog, roleData.role)}
                                                                className={`w-8 h-8 rounded flex items-center justify-center mx-auto transition-all ${isWorked ? 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-black/40 text-[#E8DCCF]/20 border border-[#9E7649]/20 hover:border-[#9E7649]/50 hover:text-[#E8DCCF]/50'}`}
                                                            >
                                                                {isWorked ? <CheckCircle2 size={18} /> : <div className="w-2 h-2 rounded-full bg-current opacity-50" />}
                                                            </button>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                 </div>

                 {/* Consolidate Button */}
                 <div className="flex justify-end">
                     <button 
                         onClick={handleConsolidateAutogestion}
                         className="flex items-center gap-2 px-6 py-3 bg-[#9E7649] text-white font-bold rounded-xl hover:bg-[#8B653D] shadow-lg transition-all"
                     >
                         <Save size={20} /> Consolidar Mes
                     </button>
                 </div>
              </div>
          )}

          {activeTab === 'oficiales' && (
              <div className="space-y-6">
                 {/* Income Band based on Official Reports */}
                 <div className="bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 shadow-xl animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-2 mb-6 border-b border-[#9E7649]/20 pb-4">
                        <CalendarIcon size={24} className="text-blue-400" />
                        <div className="flex flex-col">
                            <h3 className="text-white font-bold text-xl leading-tight">Pagos y Reportes Oficiales</h3>
                            <span className="text-blue-400 font-bold text-sm leading-none capitalize">
                                {new Date(workLogDate + 'T12:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                         <div className="bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/10">
                             <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wider mb-1">Total Entradas</p>
                             <div className="text-3xl font-display font-bold text-white">{oficialesMetrics?.count || 0}</div>
                         </div>
                         <div className="bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/10">
                             <p className="text-[10px] text-[#9E7649] uppercase font-bold tracking-wider mb-1">Ingresos Brutos</p>
                             <div className="text-3xl font-display font-bold text-white">${(oficialesMetrics?.bruto || 0).toFixed(2)}</div>
                         </div>
                         <div className="bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/10">
                             <p className="text-[10px] text-[#9E7649] uppercase font-bold tracking-wider mb-1">Impuestos a Descontar</p>
                             <div className="text-3xl font-display font-bold text-red-400">-${(oficialesMetrics?.tax || 0).toFixed(2)}</div>
                         </div>
                         <div className="bg-[#1A100C] p-4 rounded-xl border border-blue-500/20">
                             <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wider mb-1">Ingreso Neto (A Pagar)</p>
                             <div className="text-3xl font-display font-bold text-blue-400">${(oficialesMetrics?.neto || 0).toFixed(2)}</div>
                         </div>
                    </div>
                 </div>

                 {/* Display simple list of user's official reports */}
                 <div className="bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 shadow-xl">
                     <h4 className="text-[#E8DCCF] font-bold mb-4">Detalle de Inserciones Oficiales</h4>
                     <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                         {reports.filter(r => r.mes === workLogDate.substring(0, 7) && r.especialidades.some(esp => isMatch(esp.nombre, currentUser?.name || ''))).map(rep => {
                             const esp = rep.especialidades.find(e => isMatch(e.nombre, currentUser?.name || ''));
                             return (
                                 <div key={rep.id} className="flex justify-between items-center p-3 bg-black/20 rounded-lg border border-[#9E7649]/10">
                                     <div>
                                         <div className="text-white font-bold text-sm">{rep.programa}</div>
                                         <div className="text-[10px] text-[#9E7649] flex gap-2"><Clock size={12}/> {rep.fecha}</div>
                                     </div>
                                     <div className="text-sm font-medium text-[#E8DCCF]/80 bg-[#3E1E16] px-2 py-1 rounded">
                                         {esp?.rol}
                                     </div>
                                 </div>
                             );
                         })}
                         {reports.filter(r => r.mes === workLogDate.substring(0, 7) && r.especialidades.some(esp => isMatch(esp.nombre, currentUser?.name || ''))).length === 0 && (
                             <p className="text-center text-[#E8DCCF]/50 italic py-10">No hay reportes oficiales registrados para este mes.</p>
                         )}
                     </div>
                 </div>
              </div>
          )}

          {activeTab === 'pagos' && (
              <div className="space-y-6">
                  {/* Selector de Mes Governance */}
                  <div className="bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/20 flex justify-between items-center">
                     <div className="text-[#E8DCCF] font-bold">Consolidaciones Pagos</div>
                     <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-[#9E7649]/30">
                        <label className="text-[10px] text-[#9E7649] uppercase font-bold">Mes Consultar:</label>
                        <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-transparent text-white border-none focus:ring-0 text-sm" />
                     </div>
                  </div>

                  {/* Two Tables Side by Side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Autogestionados */}
                      <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 overflow-hidden shadow-xl">
                          <div className="p-4 border-b border-[#9E7649]/20 bg-[#3E1E16]/30">
                              <h4 className="text-white font-bold">Pagos Autogestionados</h4>
                          </div>
                          <div className="p-4">
                              <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-[#9E7649] uppercase tracking-widest bg-black/20">
                                    <tr>
                                        <th className="px-4 py-2">Mes</th>
                                        <th className="px-4 py-2 text-right">Bruto</th>
                                        <th className="px-4 py-2 text-right">Neto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {consolidatedPayments
                                        .filter(p => p.userId === currentUser?.username && p.calculationMode === 'autogestionado' && p.month === filterMonth)
                                        .map(p => (
                                            <tr key={p.id} className="border-b border-[#9E7649]/10">
                                                <td className="px-4 py-3 font-mono">{p.month}</td>
                                                <td className="px-4 py-3 text-right text-[#E8DCCF]/60">${p.grossAmount?.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-green-400">${p.amount.toFixed(2)}</td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                              </table>
                          </div>
                      </div>

                      {/* Oficiales */}
                      <div className="bg-[#2C1B15] rounded-2xl border border-blue-900/30 overflow-hidden shadow-xl">
                          <div className="p-4 border-b border-blue-900/30 bg-blue-900/10">
                              <h4 className="text-blue-400 font-bold">Pagos Oficiales</h4>
                          </div>
                          <div className="p-4">
                              <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-blue-400/70 uppercase tracking-widest bg-black/20">
                                    <tr>
                                        <th className="px-4 py-2">Mes</th>
                                        <th className="px-4 py-2 text-right">Bruto</th>
                                        <th className="px-4 py-2 text-right">Neto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {consolidatedPayments
                                        .filter(p => p.userId === currentUser?.username && p.calculationMode === 'oficial_from_reports' && p.month === filterMonth)
                                        .map(p => (
                                            <tr key={p.id} className="border-b border-blue-900/20">
                                                <td className="px-4 py-3 font-mono">{p.month}</td>
                                                <td className="px-4 py-3 text-right text-[#E8DCCF]/60">${p.grossAmount?.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-blue-400">${p.amount.toFixed(2)}</td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                              </table>
                          </div>
                      </div>
                  </div>

                  {/* Export Buttons */}
                  <div className="flex justify-end gap-4 mt-6">
                      <button onClick={generateInforme} className="flex items-center gap-2 px-6 py-3 border border-[#9E7649]/40 text-[#9E7649] font-bold rounded-xl hover:bg-[#9E7649]/10 transition-all">
                          <FileCode size={20} /> Informe 
                      </button>
                      <button onClick={generateComparativa} className="flex items-center gap-2 px-6 py-3 bg-blue-900/40 text-blue-400 border border-blue-900/50 font-bold rounded-xl hover:bg-blue-900/60 shadow-lg transition-all">
                          <Search size={20} /> Comparativa
                      </button>
                  </div>
              </div>
          )}
      </div>
  );
};
