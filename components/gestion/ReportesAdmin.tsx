import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, Filter, FileCode, Search, FileDown, Trash2, Save, Upload, Edit2, Plus } from 'lucide-react';
import { User, FP02Report, ProgramFicha, ConsolidatedPayment, ProgramCatalog } from '../../types';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table as DocTable, TableRow as DocRow, TableCell as DocCell, TextRun, AlignmentType, WidthType } from 'docx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';

// [NOTE]: Extracted Admin section to preserve all existing logic safely
interface Props {
  currentUser: User | null;
  fichas: ProgramFicha[];
  equipoData: any[]; // The array from 'rcm_equipo_cmnl'
  catalogo: ProgramCatalog[];
  consolidatedPayments: ConsolidatedPayment[];
  setConsolidatedPayments: React.Dispatch<React.SetStateAction<ConsolidatedPayment[]>>;
  getProgramRate: (name: string, role: string, level: string) => number;
  calculateTax: (amount: number) => number;
  reports: FP02Report[];
  setReports: React.Dispatch<React.SetStateAction<FP02Report[]>>;
  isMatch: (name1: string, name2: string) => boolean;
  normalize: (s: string) => string;
}

export const ReportesAdmin: React.FC<Props> = ({
  currentUser, fichas, equipoData, catalogo,
  consolidatedPayments, setConsolidatedPayments,
  getProgramRate, calculateTax, reports, setReports, isMatch, normalize
}) => {
  const [activeTab, setActiveTab] = useState<'registro' | 'reportes' | 'pagosRealizados'>('registro');
  const [inputMethod, setInputMethod] = useState<'manual' | 'archivo' | 'pegar'>('manual');
  
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState<Partial<FP02Report>>({
    fecha: getLocalDateString(),
    emisora: 'CMNL',
    programa: '',
    especialidades: [
      { rol: 'Director', nombre: '' },
      { rol: 'Asesor', nombre: '' },
      { rol: 'Locutor', nombre: '' },
      { rol: 'Realizador de Sonido', nombre: '' },
    ]
  });

  const [textareaData, setTextareaData] = useState('');
  
  const [filterProgram, setFilterProgram] = useState('Todos');
  const [duplicateConflicts, setDuplicateConflicts] = useState<{ existing: FP02Report, newReport: FP02Report }[]>([]);
  const [safeReportsToAdd, setSafeReportsToAdd] = useState<FP02Report[]>([]);
  const [reportsToRemove, setReportsToRemove] = useState<string[]>([]);
  const [loadResult, setLoadResult] = useState<{ message: string, success: boolean } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [isManualProcessing, setIsManualProcessing] = useState(false);

  const isProgramOnDay = (program: ProgramFicha, dateStr: string) => {
      const date = new Date(dateStr + 'T12:00:00');
      const day = date.getDay(); 
      const freq = program.frequency.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
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
      
      const daysMap: Record<number, string[]> = {
          0: ['domingo', 'dominical'], 1: ['lunes'], 2: ['martes'], 3: ['miercoles'],
          4: ['jueves'], 5: ['viernes'], 6: ['sabado', 'sabatina']
      };
      const freqWords = freq.split(/[\s,y-]+/);
      return daysMap[day].some(d => freqWords.some(w => w.includes(d) || (d.includes(w) && w.length >= 3)));
  };

  const parseStartTime = (schedule: string) => {
      const match = schedule.match(/(\d{1,2}):(\d{2})/);
      if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
      return 0;
  };

  const getNextProgramForDate = (dateStr: string) => {
      const progsOnDay = fichas.filter(f => isProgramOnDay(f, dateStr));
      progsOnDay.sort((a, b) => parseStartTime(a.schedule) - parseStartTime(b.schedule));
      const existingReports = reports.filter(r => r.fecha === dateStr);
      for (const p of progsOnDay) {
          if (!existingReports.some(r => r.programa === p.name)) {
              return p.name;
          }
      }
      return '';
  };

  useEffect(() => {
      if (inputMethod === 'manual' && formData.fecha) {
          const nextProg = getNextProgramForDate(formData.fecha);
          if (nextProg && formData.programa !== nextProg) {
              handleProgramSelect(nextProg);
          }
      }
  }, [formData.fecha, inputMethod, reports]);

  const clearManualForm = () => {
    const nextProg = getNextProgramForDate(getLocalDateString());
    setFormData({
      fecha: getLocalDateString(),
      emisora: 'CMNL',
      programa: nextProg,
      especialidades: [
        { rol: 'Director', nombre: '' },
        { rol: 'Asesor', nombre: '' },
        { rol: 'Locutor', nombre: '' },
        { rol: 'Realizador de Sonido', nombre: '' },
      ]
    });
    if (nextProg) {
      setTimeout(() => handleProgramSelect(nextProg), 100);
    }
  };

  const processNewReports = (newReports: FP02Report[], manual = false) => {
    const conflicts: { existing: FP02Report, newReport: FP02Report }[] = [];
    const okReports: FP02Report[] = [];

    newReports.forEach(nR => {
       const existing = reports.find(r => r.fecha === nR.fecha && r.programa === nR.programa);
       if (existing) {
          conflicts.push({ existing, newReport: nR });
       } else {
          okReports.push(nR);
       }
    });

    if (conflicts.length > 0) {
       setDuplicateConflicts(conflicts);
       setSafeReportsToAdd(okReports);
       setReportsToRemove([]);
       setIsManualProcessing(manual);
    } else {
       if (okReports.length > 0) {
          setReports(prev => [...prev, ...okReports]);
          setLoadResult({ message: manual ? "Reporte guardado exitosamente." : `Se cargaron ${okReports.length} reportes exitosamente.`, success: true });
          if (!manual) setTextareaData('');
          if (manual) clearManualForm();
       } else {
          setLoadResult({ message: "No se extrajeron reportes válidos del texto.", success: false });
       }
    }
  };

  const resolveConflict = (action: 'keep_existing' | 'replace_new') => {
      const conflict = duplicateConflicts[0];
      const remaining = duplicateConflicts.slice(1);
      
      let newOk = [...safeReportsToAdd];
      let newToRemove = [...reportsToRemove];

      if (action === 'replace_new') {
          newOk.push(conflict.newReport);
          newToRemove.push(conflict.existing.id);
      }

      setSafeReportsToAdd(newOk);
      setReportsToRemove(newToRemove);

      if (remaining.length === 0) {
          if (newOk.length > 0 || newToRemove.length > 0) {
              setReports(prev => {
                  const filtered = prev.filter(r => !newToRemove.includes(r.id));
                  return [...filtered, ...newOk];
              });
          }
          setDuplicateConflicts([]);
          const stored = newOk.length;
          setLoadResult({ message: isManualProcessing ? "Reporte procesado exitosamente." : `Proceso finalizado. Se guardaron/actualizaron ${stored} reportes en total.`, success: true });
          if (!isManualProcessing) setTextareaData('');
          if (isManualProcessing && stored > 0) clearManualForm();
      } else {
          setDuplicateConflicts(remaining);
      }
  };
  const [filterDate, setFilterDate] = useState('Todos');
  const [filterMember, setFilterMember] = useState('Todos');
  const [filterMonth, setFilterMonth] = useState(new Date().toLocaleDateString('sv').substring(0, 7));

  const getMemberRoleLevel = (member: any, role: string) => {
    if (!member) return 'I';
    const specialties = member.specialty ? member.specialty.split(' / ') : [];
    const levels = member.level ? member.level.split(' / ') : [];
    
    const roleIndex = specialties.findIndex((s: string) => normalize(s).includes(normalize(role)));
    const levelStr = (roleIndex >= 0 ? (levels[roleIndex] || levels[0]) : (member.level || 'I')).toLowerCase();
    
    if (levelStr.includes('primer')) return 'I';
    if (levelStr.includes('segundo')) return 'II';
    if (levelStr.includes('tercer')) return 'III';
    if (levelStr.includes('habilitado') || levelStr.includes('no especificado')) return 'SR';
    return 'I';
  };

  const metrics = React.useMemo(() => {
    if (filterMember === 'Todos' || !filterMember) return null;
    
    const memberData = equipoData.find(m => isMatch(m.name, filterMember) || (m.username && isMatch(m.username, filterMember)));
    
    const userReportsInMonth = reports.filter(r => 
        r.mes === filterMonth && 
        r.especialidades.some(esp => isMatch(esp.nombre, filterMember))
    );

    let bruto = 0;
    userReportsInMonth.forEach(rep => {
        const esp = rep.especialidades.find(e => isMatch(e.nombre, filterMember));
        if (esp) {
            const level = getMemberRoleLevel(memberData, esp.rol);
            bruto += getProgramRate(rep.programa, esp.rol, level);
        }
    });

    const tax = calculateTax(bruto);
    return {
        bruto,
        tax,
        neto: bruto - tax,
        count: userReportsInMonth.length
    };
  }, [filterMember, filterMonth, reports, equipoData, getProgramRate, calculateTax, isMatch]);

  const handleConsolidate = () => {
    if (!metrics || filterMember === 'Todos') return;
    
    setConfirmAction({
        message: `¿Consolidar el pago de ${filterMember} para el mes ${filterMonth}?`,
        onConfirm: () => {
            const user = equipoData.find(m => m.name === filterMember);
            const newConsolidated: ConsolidatedPayment = {
                id: Math.random().toString(36).substr(2, 9),
                userId: user?.username || filterMember,
                month: filterMonth,
                amount: metrics.neto,
                grossAmount: metrics.bruto,
                taxAmount: metrics.tax,
                reportCount: metrics.count,
                dateConsolidated: new Date().toISOString(),
                calculationMode: 'oficial_from_reports'
            };
            
            setConsolidatedPayments(prev => [...prev.filter(c => !(c.userId === newConsolidated.userId && c.month === filterMonth)), newConsolidated]);
            setLoadResult({ message: "Pago consolidado exitosamente. Puede verlo en la pestaña Pagos.", success: true });
            setConfirmAction(null);
        }
    });
  };

  const exportPaymentsTable = (format: 'docx' | 'pdf' | 'xlsx') => {
    const data = consolidatedPayments
      .filter(p => p.month === filterMonth)
      .map(p => {
          const user = equipoData.find(m => m.username === p.userId || m.name === p.userId);
          return {
              nombre: user?.name || p.userId,
              mes: p.month,
              reportes: p.reportCount || 0,
              bruto: p.grossAmount || 0,
              impuestos: p.taxAmount || 0,
              neto: p.amount
          };
      });

    if (format === 'xlsx') {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pagos");
        XLSX.writeFile(wb, `Pagos_CMNL_${filterMonth}.xlsx`);
    } else if (format === 'pdf') {
        const doc = new jsPDF();
        doc.text(`Pagos Realizados - CMNL - ${filterMonth}`, 14, 15);
        autoTable(doc, {
            startY: 20,
            head: [['Nombre', 'Mes', 'Reportes', 'Bruto', 'Impuestos', 'Neto']],
            body: data.map(d => [d.nombre, d.mes, d.reportes.toString(), `$${d.bruto.toFixed(2)}`, `$${d.impuestos.toFixed(2)}`, `$${d.neto.toFixed(2)}`]),
        });
        doc.save(`Pagos_CMNL_${filterMonth}.pdf`);
    } else if (format === 'docx') {
        const table = new DocTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new DocRow({
                    children: ['Nombre', 'Mes', 'Reps', 'Bruto', 'Imp.', 'Neto'].map(text => 
                        new DocCell({ 
                            children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
                            shading: { fill: '5D3A24' }
                        })
                    )
                }),
                ...data.map(d => new DocRow({
                    children: [
                        d.nombre, d.mes, d.reportes.toString(), `$${d.bruto.toFixed(2)}`, `$${d.impuestos.toFixed(2)}`, `$${d.neto.toFixed(2)}`
                    ].map(text => new DocCell({ children: [new Paragraph({ text, alignment: AlignmentType.CENTER })] }))
                }))
            ]
        });

        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({ children: [new TextRun({ text: `PAGOS CONSOLIDADOS - CMNL - ${filterMonth}`, bold: true, size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                    table
                ]
            }]
        });

        Packer.toBlob(doc).then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Pagos_CMNL_${filterMonth}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        });
    }
  };

  const handleProgramSelect = (progName: string) => {
    const matchRole = (r1: string, r2: string) => {
        const n1 = normalize(r1);
        const n2 = normalize(r2);
        if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;
        if (n1.includes('sonido') && n2.includes('sonido')) return true;
        if (n1.includes('locut') && n2.includes('locut')) return true;
        if (n1.includes('asesor') && n2.includes('asesor')) return true;
        if (n1.includes('direc') && n2.includes('direc')) return true;
        return false;
    };

    setFormData(prev => {
      const newEspecialidades = [...(prev.especialidades || [])];

      newEspecialidades.forEach(esp => {
        const assigned = equipoData.find(m => {
          // Check days system (newest)
          const daysObj = m.habitualProgramsDays || {};
          for (const [rName, progsObj] of Object.entries(daysObj)) {
              if (matchRole(rName, esp.rol)) {
                  if (Object.keys(progsObj).some(p => isMatch(p, progName))) {
                      return true;
                  }
              }
          }
          
          // Check array system (new)
          const rolesObj = m.habitualProgramsByRole || {};
          for (const [rName, progs] of Object.entries(rolesObj)) {
              if (matchRole(rName, esp.rol)) {
                  if ((progs as string[]).some((p: string) => isMatch(p, progName))) {
                      return true;
                  }
              }
          }
          
          // Check legacy system
          const hab = m.habitualPrograms || [];
          if (hab.some((p: string) => isMatch(p, progName))) {
              const specialties = m.specialty ? m.specialty.split(' / ') : [];
              if (specialties.some((s: string) => matchRole(s, esp.rol))) {
                  return true;
              }
          }
          return false;
        });

        if (assigned) {
          esp.nombre = assigned.name;
        } else {
          esp.nombre = ''; 
        }
      });

      return {
        ...prev,
        programa: progName,
        especialidades: newEspecialidades
      };
    });
  };

  const handleParseText = (text: string) => {
    let parsedReports: FP02Report[] = [];
    
    // Detect multiple blocks using '_____' or 'Fecha:' as delimiter
    let blocks: string[][] = [];
    if (text.includes('____')) {
      const parts = text.split(/_{4,}/);
      blocks = parts.map(p => p.split('\n'));
    } else {
      const parts = text.split(/(?=Fecha:\s*|fecha:\s*)/i);
      blocks = parts.map(p => p.split('\n'));
    }

    blocks.forEach(lines => {
      let fecha = getLocalDateString();
      let prog = '';
      let especialidades: { rol: string, nombre: string, isFixed?: boolean }[] = [];
      
      lines.forEach(line => {
        const lower = line.toLowerCase().trim();
        if (lower.startsWith('fecha:')) {
           const dateStr = line.substring(6).trim();
           // Intenta parsear "27 de abril de 2026"
           const match = dateStr.match(/(\d+)\s+de\s+([a-z]+)\s+de\s+(\d+)/i);
           if (match) {
             const [_, d, mName, y] = match;
             const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
             const mIdx = months.indexOf(mName.toLowerCase()) + 1;
             if (mIdx > 0) {
               fecha = `${y}-${mIdx.toString().padStart(2, '0')}-${d.padStart(2, '0')}`;
             }
           } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
               fecha = dateStr;
           }
        }
        else if (lower.startsWith('programa:')) prog = line.substring(9).trim();
        else if (lower.startsWith('director:')) especialidades.push({ rol: 'Director', nombre: line.substring(9).trim(), isFixed: true });
        else if (lower.startsWith('asesor:')) especialidades.push({ rol: 'Asesor', nombre: line.substring(7).trim(), isFixed: true });
        else if (lower.startsWith('locutor:')) especialidades.push({ rol: 'Locutor', nombre: line.substring(8).trim(), isFixed: true });
        else if (lower.startsWith('realizador:') || lower.startsWith('realizador de sonido:') || lower.startsWith('sonido:')) {
           const idx = lower.indexOf(':');
           especialidades.push({ rol: 'Realizador de Sonido', nombre: line.substring(idx + 1).trim(), isFixed: true });
        }
      });

      if (prog) {
         parsedReports.push({
           id: Date.now().toString() + Math.random().toString(),
           fecha,
           emisora: 'CMNL',
           programa: prog,
           especialidades,
           mes: fecha.substring(0, 7)
         });
      }
    });

    if (parsedReports.length > 0) {
       processNewReports(parsedReports, false);
    } else {
       setLoadResult({ message: "No se pudieron extraer reportes válidos del texto.", success: false });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        handleParseText(content);
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleSave = () => {
    if (!formData.programa || !formData.fecha) {
      alert("Programa y Fecha son obligatorios.");
      return;
    }
    
    const mes = formData.fecha.substring(0, 7); 
    
    const newReport: FP02Report = {
      id: Date.now().toString(),
      fecha: formData.fecha,
      emisora: formData.emisora || 'CMNL',
      programa: formData.programa,
      especialidades: formData.especialidades || [],
      mes: mes
    };

    processNewReports([newReport], true);
  };

  const exportDoc = async (report: FP02Report) => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: "Modelo FP-02", alignment: AlignmentType.CENTER, heading: "Heading1" }),
          new Paragraph({ text: `Fecha: ${report.fecha}` }),
          new Paragraph({ text: `Emisora: ${report.emisora}` }),
          new Paragraph({ text: `Programa: ${report.programa}` }),
          new Paragraph({ text: "" }),
          new DocTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new DocRow({
                children: [
                   new DocCell({ children: [new Paragraph("Especialidad")] }),
                   new DocCell({ children: [new Paragraph("Nombre y Apellidos")] }),
                ]
              }),
              ...report.especialidades.map(esp => new DocRow({
                children: [
                  new DocCell({ children: [new Paragraph(esp.rol)] }),
                  new DocCell({ children: [new Paragraph(esp.nombre)] }),
                ]
              }))
            ]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Reporte_FP02_${report.programa}_${report.fecha}.docx`);
  };

  const exportPDF = (report: FP02Report) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Modelo FP-02", 14, 22);
    doc.setFontSize(12);
    doc.text(`Fecha: ${report.fecha}`, 14, 32);
    doc.text(`Emisora: ${report.emisora}`, 14, 40);
    doc.text(`Programa: ${report.programa}`, 14, 48);

    const tableData = report.especialidades.map(esp => [esp.rol, esp.nombre]);

    autoTable(doc, {
      startY: 55,
      head: [['Especialidad', 'Nombre y Apellidos']],
      body: tableData,
    });
    doc.save(`Reporte_FP02_${report.programa}_${report.fecha}.pdf`);
  };

  const handleEditReport = (report: FP02Report) => {
    setFormData(report);
    setActiveTab('registro');
    setInputMethod('manual');
  };

  const filteredForInforme = reports.filter(r => {
    if (filterProgram !== 'Todos' && r.programa !== filterProgram) return false;
    if (filterDate !== 'Todos' && r.fecha !== filterDate) return false;
    if (filterMember !== 'Todos') {
        const hasMember = r.especialidades.some(esp => isMatch(esp.nombre, filterMember));
        if (!hasMember) return false;
    }
    return true;
  });

  return (
      <div className="flex-1 w-full flex flex-col">
          <div className="flex gap-4 border-b border-[#9E7649]/30 mb-6 overflow-x-auto no-scrollbar">
              <button 
                className={`pb-2 px-4 font-bold text-xs md:text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'registro' ? 'border-[#9E7649] text-white' : 'border-transparent text-[#E8DCCF]/50 hover:text-[#E8DCCF]'}`}
                onClick={() => setActiveTab('registro')}
              >
                Registro
              </button>
              <button 
                className={`pb-2 px-4 font-bold text-xs md:text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'reportes' ? 'border-[#9E7649] text-white' : 'border-transparent text-[#E8DCCF]/50 hover:text-[#E8DCCF]'}`}
                onClick={() => setActiveTab('reportes')}
              >
                Reportes
              </button>
              <button 
                className={`pb-2 px-4 font-bold text-xs md:text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === 'pagosRealizados' ? 'border-[#9E7649] text-white' : 'border-transparent text-[#E8DCCF]/50 hover:text-[#E8DCCF]'}`}
                onClick={() => setActiveTab('pagosRealizados')}
              >
                Pagos
              </button>
          </div>

          {activeTab === 'reportes' && (
          <div className="space-y-6">
            <div className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 p-4 space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                   <div className="flex-1 min-w-[150px]">
                     <label className="block text-[10px] text-[#9E7649] uppercase mb-1">Mes</label>
                     <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full bg-black/20 p-2 rounded text-sm text-white border border-[#9E7649]/20" />
                   </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[10px] text-[#9E7649] uppercase mb-1">Filtrar por Miembro</label>
                      <select value={filterMember} onChange={e => setFilterMember(e.target.value)} className="w-full bg-black/20 p-2 rounded text-sm text-white border border-[#9E7649]/20">
                        <option value="Todos">Todos los Miembros</option>
                        {equipoData
                            .sort((a,b) => a.name.localeCompare(b.name))
                            .map(m => <option key={m.id} value={m.name}>{m.name}</option>)
                        }
                      </select>
                    </div>
                   <div className="flex-1 min-w-[200px]">
                     <label className="block text-[10px] text-[#9E7649] uppercase mb-1">Filtrar por Programa</label>
                     <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} className="w-full bg-black/20 p-2 rounded text-sm text-white border border-[#9E7649]/20">
                       <option value="Todos">Favoritos/Todos</option>
                       {Array.from(new Set(reports.map(r => r.programa))).map(p => <option key={p} value={p as string}>{p}</option>)}
                     </select>
                   </div>
                </div>

                {metrics && (
                    <div className="mt-4 p-4 bg-[#3E1E16] rounded-xl border border-[#9E7649]/30 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-1">
                        <div className="p-2">
                            <p className="text-[10px] text-[#9E7649] uppercase">Pagos y Reportes</p>
                            <p className="text-xl font-bold text-white">{metrics.count}</p>
                        </div>
                        <div className="p-2">
                            <p className="text-[10px] text-[#9E7649] uppercase">Ingreso Bruto</p>
                            <p className="text-xl font-bold text-white">${metrics.bruto.toFixed(2)}</p>
                        </div>
                        <div className="p-2">
                            <p className="text-[10px] text-[#9E7649] uppercase">Impuestos</p>
                            <p className="text-xl font-bold text-red-400">-${metrics.tax.toFixed(2)}</p>
                        </div>
                        <div className="p-2">
                            <p className="text-[10px] text-[#9E7649] uppercase">Pago Neto</p>
                            <p className="text-xl font-bold text-green-400">${metrics.neto.toFixed(2)}</p>
                        </div>
                        <div className="col-span-full border-t border-[#9E7649]/20 pt-4 flex justify-end">
                            <button 
                                onClick={handleConsolidate}
                                className="flex items-center gap-2 bg-[#9E7649] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#8B653D] shadow-lg transition-all"
                            >
                                <Save size={18} /> Consolidar Pago Mes
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center bg-[#1A100C] p-2 rounded-lg">
               <span className="text-sm text-[#9E7649]">
                 Mostrando {filteredForInforme.filter(r => r.mes === filterMonth).length} reportes
               </span>
               <button 
                 onClick={() => {
                   setConfirmAction({
                     message: '¿Está seguro que desea eliminar TODOS los reportes en el sistema? Esta acción no se puede deshacer.',
                     onConfirm: () => {
                        setReports([]);
                        setConfirmAction(null);
                     }
                   });
                 }}
                 className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-500 rounded-lg md:text-sm text-xs font-bold hover:bg-red-500/40 transition-colors border border-red-500/20"
               >
                 <Trash2 size={16}/> Limpiar todo
               </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
               {filteredForInforme.filter(r => r.mes === filterMonth).map(rep => (
                 <div key={rep.id} className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/20 relative group hover:border-[#9E7649]/40 transition-all">
                     <div className="flex justify-between items-start mb-4">
                     <div>
                       <h3 className="font-bold text-white text-lg">{rep.programa}</h3>
                       <div className="flex items-center gap-2 text-xs text-[#9E7649]">
                           <Calendar size={12} />
                           <span>{rep.fecha}</span>
                       </div>
                     </div>
                     <div className="flex items-center gap-1">
                       <button 
                           onClick={() => exportPDF(rep)}
                           className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-full transition-all"
                           title="Descargar PDF"
                        >
                           <Download size={18} />
                        </button>
                       <button 
                           onClick={() => handleEditReport(rep)}
                           className="p-2 text-yellow-400 hover:bg-yellow-400/10 rounded-full transition-all"
                           title="Editar Reporte"
                        >
                           <Edit2 size={18} />
                        </button>
                       <button 
                           onClick={() => { 
                             setConfirmAction({
                               message: '¿Eliminar reporte?',
                               onConfirm: () => {
                                 setReports(reports.filter(r => r.id !== rep.id));
                                 setConfirmAction(null);
                               }
                             });
                           }} 
                           className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                           title="Eliminar Reporte"
                        >
                           <Trash2 size={18} />
                        </button>
                     </div>
                   </div>
                   <div className="text-sm border-t border-[#9E7649]/10 pt-3 space-y-1">
                      {rep.especialidades.filter(e => e.nombre).map(e => {
                        return (
                          <div key={e.rol} className="flex justify-between items-center py-1 bg-black/10 px-2 rounded">
                            <span className="text-[#E8DCCF]/60 text-[10px] uppercase font-bold">{e.rol}</span>
                            <span className="text-white text-sm font-medium">{e.nombre}</span>
                          </div>
                        );
                      })}
                    </div>
                 </div>
               ))}
               {filteredForInforme.filter(r => r.mes === filterMonth).length === 0 && <p className="col-span-2 text-center text-[#E8DCCF]/50 py-20 border border-dashed border-[#9E7649]/20 rounded-xl italic">No hay reportes para este mes y filtros.</p>}
            </div>
          </div>
          )}

          {activeTab === 'pagosRealizados' && (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 shadow-xl overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h3 className="text-xl md:text-2xl font-bold text-white">Pagos</h3>
                        <p className="text-xs md:text-sm text-[#9E7649]">Listado completo de consolidaciones mensuales ({filterMonth})</p>
                    </div>
                    <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
                         <div className="bg-black/40 border border-[#9E7649]/20 p-2 rounded-lg flex items-center gap-2 flex-grow sm:flex-grow-0">
                            <label className="text-[10px] text-[#9E7649] uppercase font-bold">Mes:</label>
                            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-transparent border-none text-white text-sm focus:ring-0 w-full sm:w-32" />
                        </div>
                        <div className="flex gap-2 justify-center sm:justify-start">
                            <button onClick={() => exportPaymentsTable('xlsx')} className="flex-1 sm:flex-none p-2.5 bg-green-900/40 text-green-400 rounded-lg border border-green-900/40 hover:bg-green-800 transition-all shadow-lg" title="Exportar Excel"><FileDown size={20} className="mx-auto" /></button>
                            <button onClick={() => exportPaymentsTable('pdf')} className="flex-1 sm:flex-none p-2.5 bg-red-900/40 text-red-400 rounded-lg border border-red-900/40 hover:bg-red-800 transition-all shadow-lg" title="Exportar PDF"><FileDown size={20} className="mx-auto" /></button>
                            <button onClick={() => exportPaymentsTable('docx')} className="flex-1 sm:flex-none p-2.5 bg-blue-900/40 text-blue-400 rounded-lg border border-blue-900/40 hover:bg-blue-800 transition-all shadow-lg" title="Exportar Word"><FileCode size={20} className="mx-auto" /></button>
                        </div>
                    </div>
                </div>

                    <div className="overflow-x-auto -mx-6">
                        <table className="w-full text-sm text-left">
                            <thead className="text-[10px] text-[#9E7649] uppercase tracking-widest bg-[#3E1E16] border-y border-[#9E7649]/10">
                                <tr>
                                    <th className="px-6 py-4">Miembro</th>
                                    <th className="px-6 py-4 text-center">Mes</th>
                                    <th className="px-6 py-4 text-center">Pagos y Reportes</th>
                                    <th className="px-6 py-4 text-right">Bruto</th>
                                    <th className="px-6 py-4 text-right">Impuestos</th>
                                    <th className="px-6 py-4 text-right">Pago Neto</th>
                                    <th className="px-6 py-4 text-center">Consolidado</th>
                                    <th className="px-6 py-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#9E7649]/10">
                                {consolidatedPayments
                                    .filter(p => p.month === filterMonth)
                                    .map(p => {
                                        const user = equipoData.find(m => m.username === p.userId || m.name === p.userId);
                                        return (
                                            <tr key={p.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-white">{user?.name || p.userId}</div>
                                                    <div className="text-[10px] text-[#9E7649]">{user?.classification}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-mono">{p.month}</td>
                                                <td className="px-6 py-4 text-center font-bold text-blue-400">{p.reportCount || '-'}</td>
                                                <td className="px-6 py-4 text-right text-[#E8DCCF]/60 font-mono">${(p.grossAmount || 0).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right text-red-400 font-mono">-${(p.taxAmount || 0).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-right text-green-400 font-mono font-bold text-lg">${p.amount.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-center text-[10px] text-[#9E7649] whitespace-nowrap">
                                                    {new Date(p.dateConsolidated).toLocaleDateString()}<br/>
                                                    {new Date(p.dateConsolidated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </td>
                                                <td className="px-6 py-4 text-center space-x-2">
                                                    <button onClick={() => { 
                                                        setConfirmAction({
                                                            message: '¿Eliminar registro consolidado?',
                                                            onConfirm: () => {
                                                                setConsolidatedPayments(prev => prev.filter(x => x.id !== p.id));
                                                                setConfirmAction(null);
                                                            }
                                                        });
                                                    }} className="text-red-500/50 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                }
                                {consolidatedPayments.filter(p => p.month === filterMonth).length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-20 text-center text-[#E8DCCF]/20 italic">No se han encontrado pagos consolidados para este mes.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'registro' && (
          <div className="space-y-6">
             <div className="flex gap-2 p-1 bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 w-fit">
               <button onClick={() => setInputMethod('manual')} className={`px-4 py-2 rounded-lg text-sm font-bold ${inputMethod === 'manual' ? 'bg-[#9E7649] text-white' : 'text-[#E8DCCF]/60'}`}>Manual</button>
               <button onClick={() => setInputMethod('archivo')} className={`px-4 py-2 rounded-lg text-sm font-bold ${inputMethod === 'archivo' ? 'bg-[#9E7649] text-white' : 'text-[#E8DCCF]/60'}`}>TXT</button>
               <button onClick={() => setInputMethod('pegar')} className={`px-4 py-2 rounded-lg text-sm font-bold ${inputMethod === 'pegar' ? 'bg-[#9E7649] text-white' : 'text-[#E8DCCF]/60'}`}>Pegar Texto</button>
             </div>

             {inputMethod === 'archivo' && (
               <div className="border-2 border-dashed border-[#9E7649]/40 rounded-xl p-10 text-center hover:bg-[#9E7649]/5 transition-colors cursor-pointer relative">
                 <input type="file" accept=".txt" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                 <Upload size={32} className="mx-auto text-[#9E7649] mb-4" />
                 <p className="text-[#E8DCCF] font-bold">Cargar archivo TXT</p>
                 <p className="text-sm text-[#E8DCCF]/50 mt-1">El sistema identificará palabras clave como Programa:, Director:, etc.</p>
               </div>
             )}

             {inputMethod === 'pegar' && (
               <div className="space-y-3">
                 <textarea 
                   rows={6}
                   value={textareaData}
                   onChange={e => setTextareaData(e.target.value)}
                   className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-lg p-3 text-white"
                   placeholder="Pega el contenido aquí. Ejemplo:&#10;Programa: Noticiero&#10;Director: Juan"
                 />
                 <button 
                   onClick={() => handleParseText(textareaData)}
                   className="px-4 py-2 bg-[#9E7649] text-white font-bold rounded-lg"
                 >
                   Procesar Texto
                 </button>
               </div>
             )}

             <div className="bg-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/20 space-y-6 mt-6">
                <h3 className="font-bold text-lg md:text-xl text-white border-b border-[#9E7649]/20 pb-3">Registro</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-xs text-[#9E7649] mb-1 uppercase tracking-wider">Emisora</label>
                    <input type="text" value={formData.emisora} readOnly className="w-full bg-black/40 border border-transparent rounded-lg p-3 text-[#E8DCCF]/60 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-[#9E7649] mb-1 uppercase tracking-wider">Fecha</label>
                    <input type="date" value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} className="w-full bg-black/20 border border-[#9E7649]/30 rounded-lg p-3 text-white text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-[#9E7649] mb-1 uppercase tracking-wider">Programa</label>
                    <select 
                      value={formData.programa} 
                      onChange={e => handleProgramSelect(e.target.value)}
                      className="w-full bg-black/20 border border-[#9E7649]/30 rounded-lg p-3 text-white text-sm"
                    >
                      <option value="">Seleccionar...</option>
                      {[...fichas.map(f => f.name), 'Trabajos Periodísticos', 'Propaganda', 'Cabina 12:00 a 12:30', 'Cabina 1:00 a 1:30'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-8 border-t border-[#9E7649]/20 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-[#E8DCCF]">Especialidades</h4>
                    <button 
                      onClick={() => {
                        const newEspecs = [...(formData.especialidades || [])];
                        newEspecs.push({ rol: 'Locutor', nombre: '' });
                        setFormData({...formData, especialidades: newEspecs});
                      }}
                      className="flex items-center gap-1 text-xs text-[#9E7649] hover:text-white transition-colors border border-[#9E7649]/30 px-2 py-1 rounded-md"
                    >
                      <Plus size={14} /> Añadir Locutor
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formData.especialidades?.map((esp, i) => (
                      <div key={`${esp.rol}-${i}`} className="flex flex-col sm:flex-row gap-2 sm:items-center relative">
                         <div className="w-40 text-sm font-bold text-[#9E7649]">{esp.rol} {i > 3 && esp.rol === 'Locutor' ? 'Adicional' : ''}</div>
                         <input 
                           type="text" 
                           list={`datalist-${esp.rol.replace(/\s+/g,'-')}-${i}`}
                           value={esp.nombre}
                           onChange={e => {
                             const newEspecs = [...(formData.especialidades || [])];
                             newEspecs[i].nombre = e.target.value;
                             setFormData({...formData, especialidades: newEspecs});
                           }}
                           className="flex-1 bg-black/20 border border-[#9E7649]/30 rounded-lg p-2 text-white text-sm"
                           placeholder="Nombre y Apellidos"
                         />
                         <datalist id={`datalist-${esp.rol.replace(/\s+/g,'-')}-${i}`}>
                           {equipoData.filter(m => m.specialty && normalize(m.specialty).includes(normalize(esp.rol === 'Realizador de Sonido' ? 'Realizador' : esp.rol))).map(m => (
                             <option key={m.id} value={m.name} />
                           ))}
                         </datalist>
                         {i > 3 && (
                            <button 
                              onClick={() => {
                                const newEspecs = formData.especialidades!.filter((_, idx) => idx !== i);
                                setFormData({...formData, especialidades: newEspecs});
                              }}
                              className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                              title="Eliminar especialidad adicional"
                            >
                              <Trash2 size={16} />
                            </button>
                         )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={handleSave}
                    className="bg-[#5D3A24] text-white font-bold py-3 px-8 rounded-lg hover:bg-[#4A2E1D] transition-colors shadow-lg"
                  >
                    Guardar Reporte
                  </button>
                </div>
             </div>
          </div>
          )}

      {loadResult && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] animate-in fade-in">
          <div className="bg-[#2C1B15] border border-[#9E7649]/30 rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">{loadResult.success ? '¡Proceso completado!' : 'Aviso'}</h3>
            <p className="text-[#E8DCCF]/80 mb-6">{loadResult.message}</p>
            <button 
              onClick={() => { setLoadResult(null); if (activeTab === 'registro' && isManualProcessing) setActiveTab('reportes'); }}
              className="bg-[#9E7649] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#8B653D] transition-colors"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {duplicateConflicts.length > 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] animate-in fade-in">
          <div className="bg-[#2C1B15] border border-[#9E7649]/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center justify-center gap-2">
              Reporte Duplicado ({duplicateConflicts.length} pendientes)
            </h3>
            <p className="text-[#E8DCCF]/80 mb-4 text-center text-sm">
              Ya existe un reporte para <strong>{duplicateConflicts[0].newReport.programa}</strong> el día <strong>{duplicateConflicts[0].newReport.fecha}</strong>.
            </p>
            <div className="flex flex-col gap-4">
              <div className="bg-black/40 p-4 rounded-lg border border-[#9E7649]/20">
                <h4 className="font-bold text-[#9E7649] mb-2 text-sm">Reporte Existente:</h4>
                <ul className="text-xs text-stone-300 space-y-1">
                  {duplicateConflicts[0].existing.especialidades.filter((e:any) => e.nombre).map((e:any, i:number) => (
                    <li key={i}>{e.rol}: {e.nombre}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-black/40 p-4 rounded-lg border border-red-500/30">
                <h4 className="font-bold text-red-400 mb-2 text-sm">Nuevo Reporte:</h4>
                <ul className="text-xs text-stone-300 space-y-1">
                  {duplicateConflicts[0].newReport.especialidades.filter((e:any) => e.nombre).map((e:any, i:number) => (
                    <li key={i}>{e.rol}: {e.nombre}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="flex justify-between gap-4 mt-6">
              <button 
                onClick={() => resolveConflict('keep_existing')}
                className="flex-1 bg-[#2C1B15] border border-stone-500 text-stone-300 py-2 rounded-lg font-bold hover:bg-stone-800 transition-colors mr-2"
              >
                Mantener
              </button>
              <button 
                onClick={() => resolveConflict('replace_new')}
                className="flex-1 bg-[#9E7649] text-white py-2 rounded-lg font-bold hover:bg-[#8B653D] transition-colors ml-2"
              >
                Reemplazar
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] animate-in fade-in">
          <div className="bg-[#2C1B15] border border-[#9E7649]/30 rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Confirmación</h3>
            <p className="text-[#E8DCCF]/80 mb-6">{confirmAction.message}</p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => setConfirmAction(null)}
                className="bg-[#2C1B15] border border-stone-500 text-stone-300 px-4 py-2 rounded-lg font-bold hover:bg-stone-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmAction.onConfirm}
                className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg font-bold hover:bg-red-500/40 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
  );
};
