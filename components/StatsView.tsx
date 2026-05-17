import React, { useState, useEffect, useMemo } from 'react';
import { Script, User } from '../types';
import { 
  FileDown, Calendar, Layers, Repeat, BarChart3, X, Check, Filter, FileText
} from 'lucide-react';
import { parseSpanishDate } from './GuionesApp';

interface StatsViewProps {
  onClose?: () => void;
  programs: Array<{ name: string; file: string }>;
  currentUser: User;
}

type ReportType = 'month' | 'repeated' | 'program' | 'year_ago' | 'monthly_txt' | null;

interface FilterConfig {
  programs: string[];
  year: string;
  years: string[];
  month: string;
  week: string;
}

export const StatsView: React.FC<StatsViewProps> = ({ onClose, programs, currentUser }) => {
  const [allScripts, setAllScripts] = useState<Script[]>([]);
  const [activeReport, setActiveReport] = useState<ReportType>(null);
  
  const [filters, setFilters] = useState<FilterConfig>({
    programs: [],
    year: new Date().getFullYear().toString(),
    years: [new Date().getFullYear().toString()],
    month: (new Date().getMonth() + 1).toString(),
    week: '1'
  });

  const [startDay, setStartDay] = useState<number>(1);
  const [endDay, setEndDay] = useState<number>(new Date().getDate());

  const canAccessMonthlyReport = ['Administrador', 'Director', 'Asesor', 'admin'].includes(currentUser.classification || currentUser.role);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeReport) {
          setActiveReport(null);
        } else if (onClose) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, activeReport]);

  useEffect(() => {
    let gathered: Script[] = [];
    programs.forEach(prog => {
      const key = `guionbd_data_${prog.file}`;
      const data = localStorage.getItem(key);
      if (data) {
        gathered = [...gathered, ...JSON.parse(data)];
      }
    });
    setAllScripts(gathered);
  }, [programs]);

  useEffect(() => {
    if (activeReport === 'monthly_txt') {
        const now = new Date();
        const currentYear = now.getFullYear().toString();
        const currentMonth = (now.getMonth() + 1).toString();
        
        setFilters(prev => ({
            ...prev,
            year: currentYear,
            month: currentMonth
        }));
        setStartDay(1);
        setEndDay(now.getDate());
    }
  }, [activeReport]);

  useEffect(() => {
      if (activeReport === 'monthly_txt') {
          const now = new Date();
          const selectedYear = parseInt(filters.year);
          const selectedMonth = parseInt(filters.month);
          
          if (selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1)) {
              setEndDay(now.getDate());
          } else {
              setEndDay(new Date(selectedYear, selectedMonth, 0).getDate());
          }
      }
  }, [filters.year, filters.month, activeReport]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    yearsSet.add(new Date().getFullYear().toString()); // Always include current year
    allScripts.forEach(s => {
        const d = parseSpanishDate(s.dateAdded);
        if (!isNaN(d.getTime())) {
            yearsSet.add(d.getFullYear().toString());
        }
    });
    
    return Array.from(yearsSet).sort().reverse();
  }, [allScripts]);

  const toggleProgram = (progName: string) => {
    setFilters(prev => {
      const exists = prev.programs.includes(progName);
      let newProgs = exists 
        ? prev.programs.filter(p => p !== progName)
        : [...prev.programs, progName];
      return { ...prev, programs: newProgs };
    });
  };

  const selectAllPrograms = () => {
    if (filters.programs.length === programs.length) {
      setFilters(prev => ({ ...prev, programs: [] }));
    } else {
      setFilters(prev => ({ ...prev, programs: programs.map(p => p.name) }));
    }
  };

  const toggleYear = (y: string) => {
    setFilters(prev => {
      const exists = prev.years.includes(y);
      const newYears = exists 
        ? prev.years.filter(yr => yr !== y) 
        : [...prev.years, y];
      return { ...prev, years: newYears };
    });
  };

  const selectAllYears = () => {
    if (filters.years.length === availableYears.length) {
      setFilters(prev => ({ ...prev, years: [] }));
    } else {
      setFilters(prev => ({ ...prev, years: [...availableYears] }));
    }
  };

  const getMonthDay = (dateStr: string) => {
    const d = parseSpanishDate(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const getNormalizedFingerprint = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, '')
      .trim()
      .split(/\s+/)
      .sort()
      .join(' ');
  };

  const downloadReport = (
    filename: string, 
    title: string, 
    subTitle: string, 
    headers: string[], 
    rows: (string | number)[][],
    columnWidths?: string[]
  ) => {
    const tableHeader = headers.map((h, index) => {
      const widthStyle = columnWidths && columnWidths[index] ? `width: ${columnWidths[index]};` : '';
      return `<th style="border:1px solid #000; padding: 8px; background-color: #f3f4f6; text-align: left; font-size: 11px; ${widthStyle}">${h}</th>`;
    }).join('');
    
    const tableBody = rows.map(row => 
      `<tr>${row.map(cell => 
        `<td style="border:1px solid #000; padding: 8px; vertical-align: top; word-wrap: break-word; font-size: 11px;">${cell}</td>`
      ).join('')}</tr>`
    ).join('');

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${title}</title></head>
      <body style="font-family: Arial, sans-serif;">
        <h2 style="text-align:center; color: #4338ca; margin-bottom: 5px;">${title}</h2>
        <h4 style="text-align:center; color: #666; margin-top: 0;">${subTitle}</h4>
        <p style="text-align:center; font-size: 10px; color: #888;">Generado el ${new Date().toLocaleDateString()}</p>
        <br/>
        <table style="width:100%; border-collapse: collapse; border: 1px solid #000; table-layout: fixed;">
          <thead><tr>${tableHeader}</tr></thead>
          <tbody>${tableBody}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActiveReport(null);
  };

  const handleGenerateTxt = () => {
    let selectedScripts = allScripts.filter(s => {
       return filters.programs.includes(s.genre) || filters.programs.some(p => s.genre.includes(p));
    });

    selectedScripts = selectedScripts.filter(s => {
        const d = parseSpanishDate(s.dateAdded);
        return d.getFullYear().toString() === filters.year && (d.getMonth() + 1).toString() === filters.month;
    });

    selectedScripts = selectedScripts.filter(s => {
        const d = parseSpanishDate(s.dateAdded);
        const day = d.getDate();
        return day >= startDay && day <= endDay;
    });

    selectedScripts = selectedScripts.filter(s => {
         const w = (s.writer || "").toUpperCase();
         const a = (s.advisor || "").toUpperCase();
         
         const validWriter = w.trim().length > 0 && !w.includes("NO ESPECIFICADO") && !w.includes("PECIFICADO");
         const validAdvisor = a.trim().length > 0 && !a.includes("NO ESPECIFICADO") && !a.includes("PECIFICADO");
         
         return validWriter && validAdvisor;
    });

    selectedScripts.sort((a, b) => parseSpanishDate(a.dateAdded).getTime() - parseSpanishDate(b.dateAdded).getTime());

    if (selectedScripts.length === 0) {
        alert("No hay guiones válidos (con escritor y asesor) para el período y programas seleccionados.");
        return;
    }

    let content = "";
    selectedScripts.forEach(s => {
        const dateStr = parseSpanishDate(s.dateAdded).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        content += `Programa: ${s.genre}\nFecha: ${dateStr}\nEscritor: ${s.writer || 'No especificado'}\n-----------------------------------\n`;
    });

    const monthName = new Date(parseInt(filters.year), parseInt(filters.month) - 1).toLocaleString('es-ES', { month: 'long' });
    const filename = `Reporte_Mensual_${monthName}_${filters.year}.txt`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setActiveReport(null);
  };

  const handleGenerate = () => {
    if (activeReport === 'monthly_txt') {
        handleGenerateTxt();
        return;
    }

    let selectedScripts = allScripts.filter(s => {
       return filters.programs.includes(s.genre) || filters.programs.some(p => s.genre.includes(p));
    });

    const programsLabel = filters.programs.length === programs.length 
        ? "Todos los Programas" 
        : filters.programs.join(", ");
    
    const safeProgramsName = filters.programs.length > 1 ? "Multiples_Programas" : filters.programs[0].replace(/\s+/g, '_');

    if (activeReport === 'month') {
        selectedScripts = selectedScripts.filter(s => parseSpanishDate(s.dateAdded).getFullYear().toString() === filters.year);

        const rows = selectedScripts.map(s => {
            const d = parseSpanishDate(s.dateAdded);
            const monthName = d.toLocaleString('es-ES', { month: 'long' });
            return [
                monthName.charAt(0).toUpperCase() + monthName.slice(1),
                d.getDate(),
                s.genre,
                s.writer || 'No especificado',
                s.title
            ];
        }).sort((a, b) => {
            return a[2].toString().localeCompare(b[2].toString()) || a[0].toString().localeCompare(b[0].toString());
        }); 
        
        const fileName = `Temas_Por_Mes_${safeProgramsName}_${filters.year}`;
        const title = `Informe de Temas por Mes - ${filters.year}`;
        const subTitle = `Programas: ${programsLabel}`;

        downloadReport(fileName, title, subTitle, ['Mes', 'Día', 'Programa', 'Autor', 'Temática'], rows);
    } 
    
    else if (activeReport === 'repeated') {
        const yearScripts = selectedScripts.filter(s => 
          filters.years.includes(parseSpanishDate(s.dateAdded).getFullYear().toString())
        );
        
        const titleCounts: Record<string, number> = {};
        
        yearScripts.forEach(s => {
            const fingerprint = getNormalizedFingerprint(s.title);
            if (fingerprint.length > 3) {
                titleCounts[fingerprint] = (titleCounts[fingerprint] || 0) + 1;
            }
        });

        const repeatedFingerprints = Object.keys(titleCounts).filter(fp => titleCounts[fp] > 1);
        
        const rows: string[][] = [];
        
        yearScripts.forEach(s => {
            const fingerprint = getNormalizedFingerprint(s.title);
            if (repeatedFingerprints.includes(fingerprint)) {
                rows.push([
                    getMonthDay(s.dateAdded),
                    s.genre, 
                    s.writer || 'No especificado',
                    s.title
                ]);
            }
        });

        rows.sort((a, b) => {
             const fpA = getNormalizedFingerprint(a[3].toString());
             const fpB = getNormalizedFingerprint(b[3].toString());
             return fpA.localeCompare(fpB) || a[0].localeCompare(b[0]);
        });
        
        const yearsLabel = filters.years.length === availableYears.length 
            ? "Todos los años" 
            : filters.years.sort().join(", ");
        
        const safeYears = filters.years.length === availableYears.length 
            ? 'Todos' 
            : filters.years.sort().join('_');

        const fileName = `Repetidos_${safeProgramsName}_${safeYears}`;
        downloadReport(
          fileName, 
          `Temáticas Repetidas (${yearsLabel})`, 
          `Programas: ${programsLabel}`, 
          ['Fecha', 'Programa', 'Autor', 'Temática'], 
          rows,
          ['12%', '18%', '20%', '50%'] 
        );
    }

    else if (activeReport === 'program') {
        let filtered = selectedScripts.filter(s => {
            const d = parseSpanishDate(s.dateAdded);
            return d.getFullYear().toString() === filters.year;
        });

        if (filters.month !== "") {
          filtered = filtered.filter(s => {
             const d = parseSpanishDate(s.dateAdded);
             return (d.getMonth() + 1).toString() === filters.month;
          });
        }
        
        let weekLabel = "";
        if(filters.week) {
             filtered = filtered.filter(s => {
                 const d = parseSpanishDate(s.dateAdded);
                 const weekNum = Math.ceil(d.getDate() / 7);
                 return weekNum.toString() === filters.week;
             });
             weekLabel = `_Semana${filters.week}`;
        }

        const rows = filtered.map(s => [
            s.genre,
            getMonthDay(s.dateAdded),
            s.writer || 'No especificado',
            s.title
        ]).sort((a, b) => a[0].localeCompare(b[0]));

        let periodName = filters.year;
        if (filters.month !== "") {
           const monthName = new Date(parseInt(filters.year), parseInt(filters.month)-1).toLocaleString('es-ES', {month: 'long'});
           periodName = `${monthName} ${filters.year}`;
        } else {
           periodName = `Todo el año ${filters.year}`;
        }

        const fileName = `Detallado_${safeProgramsName}_${periodName.replace(/\s+/g, '_')}${weekLabel}`;
        const subTitle = `Programas: ${programsLabel} | Periodo: ${periodName} ${filters.week ? `- Semana ${filters.week}` : ''}`;

        downloadReport(fileName, `Informe Detallado`, subTitle, ['Programa', 'Fecha', 'Autor', 'Temática'], rows);
    }

    else if (activeReport === 'year_ago') {
        const today = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        
        const startRange = new Date(oneYearAgo);
        startRange.setDate(oneYearAgo.getDate() - 3);
        startRange.setHours(0, 0, 0, 0);

        const endRange = new Date(oneYearAgo);
        endRange.setDate(oneYearAgo.getDate() + 3);
        endRange.setHours(23, 59, 59, 999);

        const rows = selectedScripts
            .filter(s => {
                const sDate = parseSpanishDate(s.dateAdded);
                return sDate >= startRange && sDate <= endRange;
            })
            .map(s => [
                getMonthDay(s.dateAdded),
                s.genre,
                s.writer || 'No especificado',
                s.title
            ]).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

        const rangeStr = `${startRange.toLocaleDateString()} al ${endRange.toLocaleDateString()}`;
        const fileName = `Historico_${safeProgramsName}_Hace_1_Ano`;
        
        downloadReport(fileName, `Temas hace un año (± 3 días)`, `Programas: ${programsLabel} | Rango: ${rangeStr}`, ['Fecha', 'Programa', 'Autor', 'Tema'], rows);
    }
  };

  const getDaysInMonth = (year: string, month: string) => {
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  };

  const renderModal = () => {
    if (!activeReport) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-[#2C1B15] rounded-2xl w-full max-w-2xl shadow-2xl border border-[#9E7649]/30 flex flex-col max-h-[90vh]">
          
          <div className="px-8 py-5 border-b border-[#9E7649]/20 flex justify-between items-center bg-[#1A100C]/50 rounded-t-2xl">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Filter size={20} className="text-[#9E7649]" />
              Configurar Informe
            </h2>
            <button onClick={() => setActiveReport(null)} className="p-2 rounded-full hover:bg-white/10 transition-colors text-[#E8DCCF]/70">
              <X size={20} />
            </button>
          </div>

          <div className="p-8 overflow-y-auto space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#9E7649] uppercase tracking-wider">Programas</label>
                <button onClick={selectAllPrograms} className="text-xs font-bold text-[#E8DCCF] hover:text-white">
                  {filters.programs.length === programs.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {programs.map(prog => (
                  <button
                    key={prog.name}
                    onClick={() => toggleProgram(prog.name)}
                    className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                      filters.programs.includes(prog.name)
                        ? 'bg-[#9E7649]/20 border-[#9E7649] text-white'
                        : 'bg-[#1A100C] border-[#9E7649]/20 text-[#E8DCCF]/70 hover:border-[#9E7649]/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full flex items-center justify-center border ${filters.programs.includes(prog.name) ? 'bg-[#9E7649] border-[#9E7649]' : 'border-[#9E7649]/30'}`}>
                        {filters.programs.includes(prog.name) && <Check size={8} className="text-[#2C1B15]" />}
                      </div>
                      <span className="truncate">{prog.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {(activeReport === 'program' || activeReport === 'month' || activeReport === 'monthly_txt') && (
               <div className="space-y-2">
                 <label className="text-xs font-bold text-[#9E7649] uppercase tracking-wider">Año</label>
                 <select 
                   value={filters.year} 
                   onChange={(e) => setFilters({...filters, year: e.target.value})}
                   className="w-full px-4 py-3 bg-[#1A100C] border border-[#9E7649]/20 rounded-xl outline-none text-white focus:border-[#9E7649]"
                 >
                   {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                 </select>
               </div>
            )}

            {activeReport === 'repeated' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#9E7649] uppercase tracking-wider">Años</label>
                    <button onClick={selectAllYears} className="text-xs font-bold text-[#E8DCCF] hover:text-white">
                      {filters.years.length === availableYears.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {availableYears.map(y => (
                      <button
                        key={y}
                        onClick={() => toggleYear(y)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                          filters.years.includes(y)
                            ? 'bg-[#9E7649]/20 border-[#9E7649] text-white'
                            : 'bg-[#1A100C] border-[#9E7649]/20 text-[#E8DCCF]/70 hover:border-[#9E7649]/50'
                        }`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
            )}

            {activeReport === 'program' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#9E7649] uppercase tracking-wider">Mes</label>
                  <select 
                    value={filters.month}
                    onChange={(e) => setFilters({...filters, month: e.target.value})}
                    className="w-full px-4 py-3 bg-[#1A100C] border border-[#9E7649]/20 rounded-xl outline-none text-white focus:border-[#9E7649]"
                  >
                    <option value="">Todos</option>
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{new Date(0, m-1).toLocaleString('es-ES', {month: 'long'})}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#9E7649] uppercase tracking-wider">Semana</label>
                  <select 
                    value={filters.week}
                    onChange={(e) => setFilters({...filters, week: e.target.value})}
                    className="w-full px-4 py-3 bg-[#1A100C] border border-[#9E7649]/20 rounded-xl outline-none text-white focus:border-[#9E7649]"
                  >
                    <option value="">Todas</option>
                    {[1,2,3,4,5].map(w => <option key={w} value={w}>Semana {w}</option>)}
                  </select>
                </div>
              </div>
            )}

            {activeReport === 'monthly_txt' && (
              <>
                 <div className="space-y-2">
                  <label className="text-xs font-bold text-[#9E7649] uppercase tracking-wider">Mes</label>
                  <select 
                    value={filters.month}
                    onChange={(e) => setFilters({...filters, month: e.target.value})}
                    className="w-full px-4 py-3 bg-[#1A100C] border border-[#9E7649]/20 rounded-xl outline-none text-white focus:border-[#9E7649]"
                  >
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{new Date(0, m-1).toLocaleString('es-ES', {month: 'long'})}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#9E7649] uppercase tracking-wider">Día Inicio</label>
                        <select 
                            value={startDay}
                            onChange={(e) => setStartDay(parseInt(e.target.value))}
                            className="w-full px-4 py-3 bg-[#1A100C] border border-[#9E7649]/20 rounded-xl outline-none text-white focus:border-[#9E7649]"
                        >
                            {Array.from({length: getDaysInMonth(filters.year, filters.month)}, (_, i) => i + 1).map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#9E7649] uppercase tracking-wider">Día Final</label>
                        <select 
                            value={endDay}
                            onChange={(e) => setEndDay(parseInt(e.target.value))}
                            className="w-full px-4 py-3 bg-[#1A100C] border border-[#9E7649]/20 rounded-xl outline-none text-white focus:border-[#9E7649]"
                        >
                            {Array.from({length: getDaysInMonth(filters.year, filters.month)}, (_, i) => i + 1).map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="p-4 bg-[#9E7649]/10 rounded-xl border border-[#9E7649]/30">
                    <p className="text-sm text-[#E8DCCF] text-center">
                        Se generará un archivo de texto plano (.txt) con la estructura solicitada para los días seleccionados.
                    </p>
                </div>
              </>
            )}

            {activeReport === 'year_ago' && (
                <div className="p-4 bg-[#9E7649]/10 rounded-xl border border-[#9E7649]/30">
                    <p className="text-sm text-[#E8DCCF] text-center">
                        Este informe generará datos de hace exactamente un año (fecha actual), incluyendo un rango de <strong>3 días antes y 3 días después</strong>.
                    </p>
                </div>
            )}

          </div>

          <div className="p-6 border-t border-[#9E7649]/20 bg-[#1A100C]/50 rounded-b-2xl flex gap-3">
            <button 
              onClick={() => setActiveReport(null)}
              className="flex-1 py-3.5 rounded-xl font-bold text-[#E8DCCF] hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleGenerate}
              disabled={filters.programs.length === 0 || (activeReport === 'repeated' && filters.years.length === 0)}
              className="flex-[2] py-3.5 rounded-xl font-bold bg-[#9E7649] hover:bg-[#8B653D] text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown size={18} /> Generar Informe
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20 animate-in fade-in duration-300">
      <div className="text-center mb-10 space-y-2">
        <h2 className="text-3xl font-bold text-white tracking-tight">Centro de Informes Globales</h2>
        <p className="text-[#E8DCCF]/60">Genera documentos detallados de toda la programación.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {canAccessMonthlyReport && (
            <button onClick={() => setActiveReport('monthly_txt')} className="group bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 hover:border-[#9E7649] shadow-sm hover:shadow-xl transition-all text-left">
              <div className="bg-[#9E7649]/20 w-12 h-12 rounded-xl flex items-center justify-center text-[#9E7649] mb-4 group-hover:scale-110 transition-transform">
                <FileText size={24} />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Reporte Mensual (TXT)</h3>
              <p className="text-sm text-[#E8DCCF]/60">Genera listado de guiones del mes en formato de texto. Incluye Programa, Fecha y Escritor.</p>
            </button>
        )}

        <button onClick={() => setActiveReport('month')} className="group bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 hover:border-[#9E7649] shadow-sm hover:shadow-xl transition-all text-left">
          <div className="bg-[#9E7649]/20 w-12 h-12 rounded-xl flex items-center justify-center text-[#9E7649] mb-4 group-hover:scale-110 transition-transform">
            <Calendar size={24} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Temas por Mes</h3>
          <p className="text-sm text-[#E8DCCF]/60">Resumen mensual de temáticas abordadas. Filtra por año y programas.</p>
        </button>

        <button onClick={() => setActiveReport('repeated')} className="group bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 hover:border-[#9E7649] shadow-sm hover:shadow-xl transition-all text-left">
          <div className="bg-[#9E7649]/20 w-12 h-12 rounded-xl flex items-center justify-center text-[#9E7649] mb-4 group-hover:scale-110 transition-transform">
            <Repeat size={24} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Temáticas Repetidas</h3>
          <p className="text-sm text-[#E8DCCF]/60">Detecta repeticiones de temas en un año específico entre programas seleccionados.</p>
        </button>

        <button onClick={() => setActiveReport('program')} className="group bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 hover:border-[#9E7649] shadow-sm hover:shadow-xl transition-all text-left">
          <div className="bg-[#9E7649]/20 w-12 h-12 rounded-xl flex items-center justify-center text-[#9E7649] mb-4 group-hover:scale-110 transition-transform">
            <Layers size={24} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Temas por Programas</h3>
          <p className="text-sm text-[#E8DCCF]/60">Informe detallado filtrado por programa, año, mes y semana.</p>
        </button>

        <button onClick={() => setActiveReport('year_ago')} className="group bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 hover:border-[#9E7649] shadow-sm hover:shadow-xl transition-all text-left">
          <div className="bg-[#9E7649]/20 w-12 h-12 rounded-xl flex items-center justify-center text-[#9E7649] mb-4 group-hover:scale-110 transition-transform">
            <BarChart3 size={24} />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Temas un año atrás</h3>
          <p className="text-sm text-[#E8DCCF]/60">Consulta histórica del día en curso hace un año (+/- 3 días).</p>
        </button>
      </div>

      {renderModal()}
    </div>
  );
};
