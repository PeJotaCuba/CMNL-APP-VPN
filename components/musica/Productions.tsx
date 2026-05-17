import React, { useEffect, useState, useRef } from 'react';
import { Track, Production, DEFAULT_PROGRAMS_LIST } from './types';
import { openWhatsApp } from '../../utils/whatsappUtils';
import { GENRES_LIST, COUNTRIES_LIST } from './constants';
import { ProgramFicha } from '../../types';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { saveProductionToDB, loadProductionsFromDB, deleteProductionFromDB, bulkUpdateProductions } from './services/db';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from "docx";
import { ChevronDown, FileText, Database, Upload, Archive, Trash2, Activity, X, Download, Plus, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

interface ProductionsProps {
  onUpdateTracks: (updateFunc: (prev: Track[]) => Track[]) => void;
  allTracks?: Track[];
}

interface TempTrack {
    id: string;
    title: string;
    author: string;
    authorCountry: string;
    performer: string;
    performerCountry: string;
    genre: string;
}

type TabType = 'intro' | 'stock' | 'archive';

const Productions: React.FC<ProductionsProps> = ({ }) => {
  const now = new Date();
  const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const localMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [activeTab, setActiveTab] = useState<TabType>('intro');
  const [date, setDate] = useState(localDateStr);
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(localMonthStr);
  const [monthInputValue, setMonthInputValue] = useState(MONTH_NAMES[now.getMonth()]);
  const [program, setProgram] = useState(DEFAULT_PROGRAMS_LIST[0]);

  useEffect(() => {
      const monthIndex = parseInt(selectedMonthStr.split('-')[1], 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
          setMonthInputValue(MONTH_NAMES[monthIndex]);
      }
  }, [selectedMonthStr]);

  const handlePrevMonth = () => {
      const [year, month] = selectedMonthStr.split('-').map(Number);
      const d = new Date(year, month - 2, 1);
      setSelectedMonthStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
      const [year, month] = selectedMonthStr.split('-').map(Number);
      const d = new Date(year, month, 1);
      setSelectedMonthStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleMonthInputBlur = () => {
      const val = monthInputValue.toLowerCase().trim();
      const index = MONTH_NAMES.findIndex(m => m.toLowerCase().startsWith(val));
      if (index !== -1 && val.length >= 3) {
          const [year] = selectedMonthStr.split('-');
          setSelectedMonthStr(`${year}-${String(index + 1).padStart(2, '0')}`);
      } else {
          // Reset to current selected month if invalid
          const monthIndex = parseInt(selectedMonthStr.split('-')[1], 10) - 1;
          setMonthInputValue(MONTH_NAMES[monthIndex] || "");
      }
  };

  const handleMonthInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          handleMonthInputBlur();
      }
  };
  
  const [currentTrack, setCurrentTrack] = useState<TempTrack>({
      id: '',
      title: '',
      author: '',
      authorCountry: '',
      performer: '',
      performerCountry: '',
      genre: ''
  });

  const [sessionTracks, setSessionTracks] = useState<TempTrack[]>([]);
  const [editingTrackIndex, setEditingTrackIndex] = useState<number | null>(null);
  
  const [dbProductions, setDbProductions] = useState<Production[]>([]);
  const [importedProductions, setImportedProductions] = useState<Production[]>([]);

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedBalanceProgram, setSelectedBalanceProgram] = useState<string | null>(null);
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const [editingProgramIndex, setEditingProgramIndex] = useState<number | null>(null);

  const [balancePrograms, setBalancePrograms] = useState<string[]>(() => {
      const saved = localStorage.getItem('rcm_musica_balance_programs');
      if (saved) return JSON.parse(saved);
      return [
          "Buenos Días Bayamo",
          "La Cumbancha (Lunes a Viernes)",
          "La Cumbancha Sábado",
          "Todos en Casa",
          "Arte Bayamo",
          "Parada Joven",
          "Hablando con Juana",
          "Al Son de la Radio",
          "Sigue a tu Ritmo",
          "Cómplices",
          "Estación 95.3",
          "Palco de Domingo"
      ];
  });

  const [fichas, setFichas] = useState<ProgramFicha[]>([]);

  useEffect(() => {
      const savedFichas = localStorage.getItem('rcm_data_fichas');
      if (savedFichas) {
          setFichas(JSON.parse(savedFichas));
      }
  }, []);

  useEffect(() => {
      localStorage.setItem('rcm_musica_balance_programs', JSON.stringify(balancePrograms));
  }, [balancePrograms]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProductions = async () => {
      const prods = await loadProductionsFromDB();
      // Sort by date descending (most recent first)
      const sortedProds = [...prods].sort((a, b) => {
          const dateA = String(a?.date || '');
          const dateB = String(b?.date || '');
          return dateB.localeCompare(dateA);
      });
      setDbProductions(sortedProds);
  };

  useEffect(() => {
      fetchProductions();
  }, [activeTab]);

  const handleAddTrack = () => {
      if (!currentTrack?.title || !currentTrack?.author || !currentTrack?.performer) {
          alert("Título, Autor e Intérprete son obligatorios.");
          return;
      }
      
      if (editingTrackIndex !== null) {
          setSessionTracks(prev => {
              const newTracks = [...prev];
              newTracks[editingTrackIndex] = { ...currentTrack };
              return newTracks;
          });
          setEditingTrackIndex(null);
      } else {
          setSessionTracks(prev => [...prev, { ...currentTrack, id: `temp-${Date.now()}` }]);
      }
      
      setCurrentTrack({
          id: '',
          title: '',
          author: '',
          authorCountry: '',
          performer: '',
          performerCountry: '',
          genre: ''
      });
  };

  const handleEditTrack = (index: number) => {
      setCurrentTrack(sessionTracks[index] || {
          id: '',
          title: '',
          author: '',
          authorCountry: '',
          performer: '',
          performerCountry: '',
          genre: ''
      });
      setEditingTrackIndex(index);
      // Scroll to top
      const container = document.getElementById('productions-container');
      if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveProduction = async () => {
      if (sessionTracks.length === 0) return alert("No hay temas en esta producción.");

      // Check for duplicates
      const isDuplicate = dbProductions.some(p => p && p.date === date && p.program === program);
      if (isDuplicate) {
          alert(`Ya existe una producción para el programa "${program}" en la fecha ${date}.`);
          return;
      }

      const newProduction: Production = {
          id: `prod-${Date.now()}`,
          date,
          program,
          tracks: sessionTracks
      };

      try {
          await saveProductionToDB(newProduction);
          alert("Producción guardada correctamente en la base de datos.");
          setSessionTracks([]); 
          await fetchProductions();
      } catch (e) {
          alert("Error guardando producción.");
      }
  };

  const handleDeleteProduction = async (id: string) => {
      if (window.confirm("¿Estás seguro de que deseas eliminar esta producción?")) {
          await deleteProductionFromDB(id);
          fetchProductions();
      }
  };

  const handleSaveImportedProduction = async (index: number) => {
      const prod = importedProductions[index];
      
      // Check for duplicates
      const isDuplicate = dbProductions.some(p => p && p.date === prod.date && p.program === prod.program);
      if (isDuplicate) {
          alert(`Ya existe una producción para el programa "${prod.program}" en la fecha ${prod.date}.`);
          return;
      }

      try {
          await saveProductionToDB(prod);
          setImportedProductions(prev => prev.filter((_, i) => i !== index));
          await fetchProductions();
      } catch (e) {
          alert("Error guardando producción.");
      }
  };

  const handleRemoveImportedProduction = (index: number) => {
      setImportedProductions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveAllImported = async () => {
      if (importedProductions.length === 0) return;
      
      // Filter out productions that already exist in DB and within the list itself
      const toSave: Production[] = [];
      const seen = new Set<string>();
      
      importedProductions.forEach(imp => {
          const key = `${imp.date}-${imp.program}`;
          const existsInDB = dbProductions.some(dbP => dbP && dbP.date === imp.date && dbP.program === imp.program);
          if (!existsInDB && !seen.has(key)) {
              toSave.push(imp);
              seen.add(key);
          }
      });

      if (toSave.length === 0) {
          alert("Todas las producciones seleccionadas ya existen en el stock o están duplicadas en la lista.");
          setImportedProductions([]);
          return;
      }

      const skippedCount = importedProductions.length - toSave.length;

      try {
          await bulkUpdateProductions(toSave);
          setImportedProductions([]);
          await fetchProductions();
          if (skippedCount > 0) {
              alert(`Se guardaron ${toSave.length} producciones. ${skippedCount} fueron omitidas por estar duplicadas.`);
          } else {
              alert("Todas las producciones han sido guardadas.");
          }
      } catch (e) {
          console.error("Error saving all productions:", e);
          alert("Error guardando las producciones. Por favor, intente de nuevo.");
      }
  };

  const handleImportTxt = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const files = Array.from(e.target.files) as File[];
      
      const newImportedProds: Production[] = [];

      for (const file of files) {
          const text = await file.text();
          const lines = text.split('\n');
          
          let fileTracks: any[] = [];
          let current: any = {};
          let fileDate = date;
          let fileProgram = program;

          const saveCurrent = () => {
              if (current.title && (current.author || current.performer)) {
                  fileTracks.push({
                      title: current.title,
                      author: current.author || '',
                      authorCountry: current.authorCountry || '',
                      performer: current.performer || '',
                      performerCountry: current.performerCountry || '',
                      genre: current.genre || ''
                  });
              }
              current = {};
          };

          lines.forEach(line => {
              const l = line.trim();
              if (!l) return;
              const lower = l.toLowerCase();

              if (lower.startsWith('fecha:')) {
                  let d = l.substring(6).trim();
                  if (d.includes('/')) {
                      const parts = d.split('/');
                      if (parts.length === 3) {
                          let year = parts[2];
                          if (year.length === 2) year = `20${year}`;
                          d = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                      }
                  }
                  fileDate = d;
              } else if (lower.startsWith('programa:')) {
                  fileProgram = l.substring(9).trim();
              } else if (/^\[\d+\]\s+/.test(l) || /\d+\.\s*titulo:/.test(lower) || lower.startsWith('titulo:')) {
                  saveCurrent();
                  let val = l;
                  if (/^\[\d+\]\s+/.test(l)) {
                      val = l.replace(/^\[\d+\]\s+/, '').trim();
                  } else {
                      val = l.replace(/^\d+\.\s*/, '').replace(/^titulo:\s*/i, '').trim();
                  }
                  current.title = val;
              } else if (lower.startsWith('autor:')) {
                  const val = l.substring(6).trim();
                  const match = val.match(/^(.*?)\s*\((.*?)\)$/);
                  if (match) {
                      current.author = match[1].trim();
                      current.authorCountry = match[2].trim() !== '-' ? match[2].trim() : '';
                  } else {
                      current.author = val;
                  }
                  if (current.author === '[No encontrado]') current.author = '';
              } else if (lower.startsWith('intérprete:') || lower.startsWith('interprete:')) {
                   const val = l.substring(l.indexOf(':') + 1).trim();
                   const match = val.match(/^(.*?)\s*\((.*?)\)$/);
                   if (match) {
                       current.performer = match[1].trim();
                       current.performerCountry = match[2].trim() !== '-' ? match[2].trim() : '';
                   } else {
                       current.performer = val;
                   }
                   if (current.performer === '[No encontrado]') current.performer = '';
              } else if (lower.startsWith('país:') || lower.startsWith('pais:')) {
                   const val = l.substring(5).trim();
                   if (current.performer && !current.performerCountry) {
                       current.performerCountry = val !== '-' ? val : '';
                   } else if (current.author && !current.authorCountry) {
                       current.authorCountry = val !== '-' ? val : '';
                   }
              } else if (lower.startsWith('género:') || lower.startsWith('genero:')) {
                   const val = l.substring(l.indexOf(':') + 1).trim();
                   current.genre = val !== '---' ? val : '';
              }
          });
          saveCurrent();

          if (fileTracks.length > 0) {
              newImportedProds.push({
                  id: `imp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${newImportedProds.length}`,
                  date: fileDate,
                  program: fileProgram,
                  tracks: fileTracks
              });
          }
      }

      // Filter out productions that already exist in DB or in current imported list
      const filteredNewProds = newImportedProds.filter(newP => {
          const existsInDB = dbProductions.some(dbP => dbP && dbP.date === newP.date && dbP.program === newP.program);
          const existsInImported = importedProductions.some(impP => impP && impP.date === newP.date && impP.program === newP.program);
          return !existsInDB && !existsInImported;
      });

      if (filteredNewProds.length === 0 && newImportedProds.length > 0) {
          alert("Todas las producciones en los archivos ya existen en el stock o en la lista de introducción.");
          e.target.value = '';
          return;
      }

      if (filteredNewProds.length === 0) {
          alert("No se encontraron temas válidos en los archivos TXT.");
          e.target.value = '';
          return;
      }

      const skipped = newImportedProds.length - filteredNewProds.length;
      setImportedProductions(prev => [...prev, ...filteredNewProds]);
      
      if (skipped > 0) {
          alert(`Se han cargado ${filteredNewProds.length} producciones. ${skipped} fueron omitidas por estar duplicadas.`);
      } else {
          alert(`Se han cargado ${filteredNewProds.length} producciones independientes.`);
      }
      e.target.value = ''; 
  };

  const handleExportHistoryCSV = async () => {
      const history = await loadProductionsFromDB();
      if (history.length === 0) return alert("No hay historial de producciones.");

      const rows: any[] = [];
      history.forEach(prod => {
          if (!prod) return;
          (prod.tracks || []).forEach(t => {
              if (!t) return;
              rows.push({
                  Fecha: prod.date || '',
                  Programa: prod.program || '',
                  Título: t.title || '',
                  Autor: t.author || '',
                  "País Autor": t.authorCountry || '',
                  Intérprete: t.performer || '',
                  "País Intérprete": t.performerCountry || '',
                  Género: t.genre || ''
              });
          });
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Historial_Producciones");
      XLSX.writeFile(wb, `RCM_Historial_Producciones_${date}.csv`);
  };

  const handleGenerateDOCX = async () => {
    if (sessionTracks.length === 0) return alert("Agregue temas para generar el informe DOCX.");

    const tableRows = [
        new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ text: "Título", style: "Strong" })] }),
                new TableCell({ children: [new Paragraph({ text: "Aut/Int", style: "Strong" })] }),
                new TableCell({ children: [new Paragraph({ text: "Países", style: "Strong" })] }),
                new TableCell({ children: [new Paragraph({ text: "Género", style: "Strong" })] }),
            ],
        }),
        ...sessionTracks.filter(Boolean).map(t => new TableRow({
            children: [
                new TableCell({ children: [new Paragraph(t?.title || '')] }),
                new TableCell({ children: [new Paragraph(`${t?.author || ''} / ${t?.performer || ''}`)] }),
                new TableCell({ children: [new Paragraph(`${t?.authorCountry || ''} / ${t?.performerCountry || ''}`)] }),
                new TableCell({ children: [new Paragraph(t?.genre || '')] }),
            ],
        }))
    ];

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({ text: "REPORTE DE PRODUCCIÓN MUSICAL - RCM", heading: "Heading1", alignment: AlignmentType.CENTER }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: `Fecha: ${date}` }),
                new Paragraph({ text: `Programa: ${program}` }),
                new Paragraph({ text: "" }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: tableRows,
                }),
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Produccion_${program}_${date}.docx`);
  };

  const handleMoveToArchive = async () => {
      if (stockMensual.length === 0) return alert("No hay producciones en el stock mensual para archivar.");
      if (!window.confirm("¿Estás seguro de que deseas mover todas las producciones del mes al archivo?")) return;

      const updatedProductions = stockMensual.map(p => ({ ...p, archived: true }));
      try {
          await bulkUpdateProductions(updatedProductions);
          await fetchProductions();
          alert("Todas las producciones del mes han sido movidas al archivo.");
      } catch (error) {
          alert("Error al archivar producciones.");
      }
  };

  const handleGenerateDetailedStatsDOCX = async () => {
    if (stockMensual.length === 0) return alert("No hay producciones en el mes actual para generar estadísticas.");

    const allTracks = stockMensual.flatMap(p => p.tracks || []).filter(Boolean);
    
    // Stats calculations
    const cubanWorks = allTracks.filter(t => (t.authorCountry || '').toLowerCase() === 'cuba' || (t.performerCountry || '').toLowerCase() === 'cuba').length;
    const foreignWorks = allTracks.length - cubanWorks;

    const authors = allTracks.map(t => ({ name: t.author, country: t.authorCountry || '' }));
    const performers = allTracks.map(t => ({ name: t.performer, country: t.performerCountry || '' }));
    
    const uniqueAuthors = Array.from(new Set(authors.map(a => a.name)));
    const uniquePerformers = Array.from(new Set(performers.map(p => p.name)));

    const cubanAuthors = uniqueAuthors.filter(name => authors.find(a => a.name === name)?.country.toLowerCase() === 'cuba').length;
    const foreignAuthors = uniqueAuthors.length - cubanAuthors;

    const cubanPerformers = uniquePerformers.filter(name => performers.find(p => p.name === name)?.country.toLowerCase() === 'cuba').length;
    const foreignPerformers = uniquePerformers.length - cubanPerformers;

    // Geographic breakdown for foreigners
    const regions: Record<string, string[]> = {
        'América Latina': ['mexico', 'colombia', 'argentina', 'venezuela', 'puerto rico', 'republica dominicana', 'panama', 'chile', 'peru', 'ecuador', 'bolivia', 'uruguay', 'paraguay', 'costa rica', 'guatemala', 'honduras', 'el salvador', 'nicaragua'],
        'Norteamérica': ['estados unidos', 'usa', 'canada'],
        'Europa': ['españa', 'espana', 'francia', 'italia', 'reino unido', 'alemania', 'portugal', 'holanda', 'belgica', 'suiza', 'austria', 'suecia', 'noruega', 'dinamarca'],
        'Asia': ['china', 'japon', 'corea', 'india']
    };

    const getRegion = (country: string) => {
        const c = country.toLowerCase();
        for (const [region, countries] of Object.entries(regions)) {
            if (countries.includes(c)) return region;
        }
        return 'Otros';
    };

    const foreignTalentRegions: Record<string, number> = { 'América Latina': 0, 'Norteamérica': 0, 'Europa': 0, 'Asia': 0, 'Otros': 0 };
    [...authors, ...performers].forEach(t => {
        if (t.country && t.country.toLowerCase() !== 'cuba') {
            const region = getRegion(t.country);
            foreignTalentRegions[region]++;
        }
    });

    // Rankings
    const getTop5 = (items: string[]) => {
        const counts: Record<string, number> = {};
        items.forEach(i => { if(i) counts[i] = (counts[i] || 0) + 1; });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    };

    const topSongs = getTop5(allTracks.map(t => t.title));
    const topAuthors = getTop5(allTracks.map(t => t.author));
    const topPerformers = getTop5(allTracks.map(t => t.performer));
    const topGenres = getTop5(allTracks.map(t => t.genre));

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({ text: "ESTADÍSTICAS DE DIFUSIÓN MUSICAL - RCM", heading: "Heading1", alignment: AlignmentType.CENTER }),
                new Paragraph({ text: `Mes: ${selectedMonthName} ${selectedYear}`, alignment: AlignmentType.CENTER }),
                new Paragraph({ text: "" }),

                new Paragraph({ text: "1. Resumen de Obras", heading: "Heading2" }),
                new Paragraph({ text: `Total de obras difundidas: ${allTracks.length}` }),
                new Paragraph({ text: `Obras de autores/intérpretes cubanos: ${cubanWorks}` }),
                new Paragraph({ text: `Obras de autores/intérpretes extranjeros: ${foreignWorks}` }),
                new Paragraph({ text: "" }),

                new Paragraph({ text: "2. Registro de Talento", heading: "Heading2" }),
                new Paragraph({ text: `Autores Cubanos: ${cubanAuthors}` }),
                new Paragraph({ text: `Autores Extranjeros: ${foreignAuthors}` }),
                new Paragraph({ text: `Intérpretes Cubanos: ${cubanPerformers}` }),
                new Paragraph({ text: `Intérpretes Extranjeros: ${foreignPerformers}` }),
                new Paragraph({ text: "" }),

                new Paragraph({ text: "3. Desglose Geográfico (Extranjeros)", heading: "Heading2" }),
                ...Object.entries(foreignTalentRegions).map(([region, count]) => 
                    new Paragraph({ text: `${region}: ${count}` })
                ),
                new Paragraph({ text: "" }),

                new Paragraph({ text: "4. Rankings (Top 5)", heading: "Heading2" }),
                new Paragraph({ text: "Canciones más difundidas:", style: "Strong" }),
                ...topSongs.map(([name, count]) => new Paragraph({ text: `• ${name} (${count})` })),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "Autores más registrados:", style: "Strong" }),
                ...topAuthors.map(([name, count]) => new Paragraph({ text: `• ${name} (${count})` })),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "Intérpretes más registrados:", style: "Strong" }),
                ...topPerformers.map(([name, count]) => new Paragraph({ text: `• ${name} (${count})` })),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "Géneros más difundidos:", style: "Strong" }),
                ...topGenres.map(([name, count]) => new Paragraph({ text: `• ${name} (${count})` })),
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Estadisticas_Musica_${selectedMonthStr}.docx`);
  };

  const getMonthName = (monthNum: number) => {
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return months[monthNum - 1] || "Desconocido";
  };

  const selectedYear = parseInt(selectedMonthStr.split('-')[0], 10);
  const selectedMonth = parseInt(selectedMonthStr.split('-')[1], 10);
  const selectedMonthName = getMonthName(selectedMonth);

  const getYearMonth = (dateStr?: string) => {
      if (!dateStr || typeof dateStr !== 'string') return { year: 0, month: 0, key: 'Desconocido' };
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          return { year, month, key: `${year}-${String(month).padStart(2, '0')}` };
      }
      return { year: 0, month: 0, key: 'Desconocido' };
  };

  const stockMensual = (dbProductions || []).filter(p => {
      if (!p) return false;
      const { year, month } = getYearMonth(p.date);
      return year === selectedYear && month === selectedMonth && !p.archived;
  });
  
  const archivo = (dbProductions || []).filter(p => {
      if (!p) return false;
      const { year, month } = getYearMonth(p.date);
      return !(year === selectedYear && month === selectedMonth) || p.archived;
  });

  // Agrupar archivo por mes (usando el formato normalizado YYYY-MM)
  const archivoPorMes: Record<string, Production[]> = {};
  archivo.forEach(p => {
      if (!p) return;
      const { key } = getYearMonth(p.date);
      if (!archivoPorMes[key]) archivoPorMes[key] = [];
      archivoPorMes[key].push(p);
  });

  const handleExportDB = async () => {
      const history = await loadProductionsFromDB();
      if (history.length === 0) return alert("No hay producciones para exportar.");
      const dataStr = JSON.stringify(history, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      saveAs(blob, `RCM_Producciones_BD_${selectedMonthStr}.json`);
      setShowActionsMenu(false);
  };

  const handleLoadDB = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const text = await file.text();
      try {
          const parsed = JSON.parse(text) as Production[];
          if (!Array.isArray(parsed)) throw new Error("Invalid format");
          for (const prod of parsed) {
              await saveProductionToDB(prod);
          }
          await fetchProductions();
          alert("Base de datos cargada correctamente.");
      } catch (err) {
          alert("Error al cargar la base de datos. Asegúrese de que sea un archivo JSON válido.");
      }
      e.target.value = '';
      setShowActionsMenu(false);
  };

  const handleClearAll = async () => {
      if (stockMensual.length === 0) return alert("No hay producciones en el stock mensual para limpiar.");
      if (window.confirm("¿Estás seguro de que deseas eliminar TODAS las producciones del mes actual? Esta acción no se puede deshacer.")) {
          for (const prod of stockMensual) {
              await deleteProductionFromDB(prod.id);
          }
          await fetchProductions();
          alert("Todas las producciones del mes han sido eliminadas.");
      }
      setShowActionsMenu(false);
  };

  const isProgramOnDay = (programFicha: ProgramFicha, dateStr: string) => {
      const date = new Date(dateStr + 'T12:00:00');
      const day = date.getDay();
      const freq = programFicha.frequency.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      if (freq.includes('diario') || freq.includes('lunes a domingo') || freq.includes('lunes-domingo')) return true;
      if ((freq.includes('lunes a sabado') || freq.includes('lunes-sabado')) && day !== 0) return true;
      if ((freq.includes('lunes a viernes') || freq.includes('lunes-viernes')) && day >= 1 && day <= 5) return true;
      if ((freq.includes('lunes a jueves') || freq.includes('lunes-jueves')) && day >= 1 && day <= 4) return true;
      if ((freq.includes('fines de semana') || freq.includes('fin de semana')) && (day === 0 || day === 6)) return true;
      
      const daysMap: { [key: number]: string[] } = {
          0: ['domingo', 'dominical'],
          1: ['lunes'],
          2: ['martes'],
          3: ['miercoles'],
          4: ['jueves'],
          5: ['viernes'],
          6: ['sabado']
      };
      return daysMap[day].some(d => freq.includes(d));
  };

  const getExpectedDaysForProgram = (programName: string, year: number, month: number) => {
      const daysInMonth = new Date(year, month, 0).getDate();
      const expectedDates: string[] = [];
      
      const ficha = fichas.find(f => f.name.toLowerCase() === programName.toLowerCase() || 
                                    (programName.includes("(") && f.name.toLowerCase() === programName.split("(")[0].trim().toLowerCase()));

      for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const d = new Date(dateStr + 'T12:00:00');
          
          if (ficha) {
              if (isProgramOnDay(ficha, dateStr)) {
                  // Special handling for programs that might have "Lunes a Viernes" or "Sábado" in their balance name
                  if (programName.toLowerCase().includes("lunes a viernes") && (d.getDay() < 1 || d.getDay() > 5)) continue;
                  if (programName.toLowerCase().includes("sabado") && d.getDay() !== 6) continue;
                  expectedDates.push(dateStr);
              }
          } else {
              // Fallback to old logic if no ficha found
              let allowedDays: number[] = [];
              if (programName.includes("Lunes a Viernes")) {
                  allowedDays = [1, 2, 3, 4, 5];
              } else if (programName.toLowerCase().includes("sábado") || 
                         programName.toLowerCase().includes("sabado") ||
                         ["al son de la radio", "sigue a tu ritmo"].includes(programName.toLowerCase())) {
                  allowedDays = [6];
              } else if (["buenos días bayamo", "buenos días, bayamo"].includes(programName.toLowerCase())) {
                  allowedDays = [1, 2, 3, 4, 5, 6];
              } else if (["Cómplices", "Estación 95.3", "Palco de Domingo", "Coloreando Melodías", "Alba y Crisol"].includes(programName)) {
                  allowedDays = [0];
              } else {
                  allowedDays = [1, 2, 3, 4, 5, 6, 0];
              }

              if (allowedDays.includes(d.getDay())) {
                  expectedDates.push(dateStr);
              }
          }
      }
      return expectedDates;
  };

  const getBalanceData = () => {
      return balancePrograms.map(prog => {
          const expectedDates = getExpectedDaysForProgram(prog, selectedYear, selectedMonth);
          
          const prods = stockMensual.filter(p => {
              if (!p) return false;
              const pName = (p.program || '').toString().toLowerCase();
              const progLower = prog.toLowerCase();
              if (progLower === "buenos días bayamo" && pName === "buenos días, bayamo") return true;
              if (progLower === "la cumbancha (lunes a viernes)" && pName === "la cumbancha") {
                  const d = new Date((p.date || '') + 'T12:00:00');
                  return !isNaN(d.getTime()) && d.getDay() >= 1 && d.getDay() <= 5;
              }
              if (progLower === "la cumbancha sábado" && pName === "la cumbancha") {
                  const d = new Date((p.date || '') + 'T12:00:00');
                  return !isNaN(d.getTime()) && d.getDay() === 6;
              }
              return pName === progLower;
          });

          const uniqueCompletedDates = [...new Set(prods.map(p => p.date).filter(Boolean))];
          const missingDates = expectedDates.filter(d => !uniqueCompletedDates.includes(d));

          return {
              program: prog,
              required: expectedDates.length,
              completed: prods.length,
              missing: Math.max(0, expectedDates.length - prods.length),
              missingDates
          };
      });
  };

  const handleExportAuditDOCX = async (programData: any) => {
      const doc = new Document({
          sections: [{
              properties: {},
              children: [
                  new Paragraph({ text: `AUDITORÍA DE METAS - ${programData.program}`, heading: "Heading1", alignment: AlignmentType.CENTER }),
                  new Paragraph({ text: `Mes: ${selectedMonthName} ${selectedYear}`, alignment: AlignmentType.CENTER }),
                  new Paragraph({ text: "" }),
                  new Paragraph({ text: `Producciones Requeridas: ${programData.required}` }),
                  new Paragraph({ text: `Producciones Realizadas: ${programData.completed}` }),
                  new Paragraph({ text: `Producciones Faltantes: ${programData.missing}` }),
                  new Paragraph({ text: "" }),
                  new Paragraph({ text: "Fechas Faltantes:", heading: "Heading2" }),
                  ...programData.missingDates.map((d: string) => new Paragraph({ text: `• ${d}` }))
              ]
          }]
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Auditoria_${programData.program.replace(/[^a-z0-9]/gi, '_')}_${selectedMonthStr}.docx`);
  };

  return (
    <div id="productions-container" className="flex flex-col h-full bg-[#1A100C] p-6 overflow-y-auto pb-24">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <span className="material-symbols-outlined text-[#9E7649]">playlist_add</span> 
            Control de Producciones
        </h2>

        {/* Tabs */}
        <div className="flex bg-[#2C1B15] rounded-xl p-1 mb-6">
            <button 
                onClick={() => setActiveTab('intro')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'intro' ? 'bg-[#9E7649] text-white shadow' : 'text-[#E8DCCF]/60 hover:text-white'}`}
            >
                Introducción
            </button>
            <button 
                onClick={() => setActiveTab('stock')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'stock' ? 'bg-[#9E7649] text-white shadow' : 'text-[#E8DCCF]/60 hover:text-white'}`}
            >
                Stock Mensual
            </button>
            <button 
                onClick={() => setActiveTab('archive')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === 'archive' ? 'bg-[#9E7649] text-white shadow' : 'text-[#E8DCCF]/60 hover:text-white'}`}
            >
                Archivo
            </button>
        </div>

        {activeTab === 'intro' && (
            <>
                <div className="bg-[#2C1B15] p-6 rounded-2xl shadow-sm border border-[#9E7649]/20 mb-6">
                    <h3 className="font-bold text-white mb-4 border-b border-[#9E7649]/20 pb-2">Datos del Programa</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-[#E8DCCF]/60 mb-1">Fecha</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={e => setDate(e.target.value)} 
                                className="w-full p-2 border border-[#9E7649]/30 rounded-lg bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#E8DCCF]/60 mb-1">Programa</label>
                            <select 
                                value={program} 
                                onChange={e => setProgram(e.target.value)} 
                                className="w-full p-2 border border-[#9E7649]/30 rounded-lg bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649]"
                            >
                                {DEFAULT_PROGRAMS_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>

                    <h3 className="font-bold text-white mb-4 border-b border-[#9E7649]/20 pb-2">
                        {editingTrackIndex !== null ? 'Editando Créditos' : 'Créditos de Archivo'}
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Título</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#1A100C] text-white text-sm" value={currentTrack?.title || ''} onChange={e => setCurrentTrack({...currentTrack, title: e.target.value})} placeholder="Nombre del tema" />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Género</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#1A100C] text-white text-sm" list="genre-options" value={currentTrack?.genre || ''} onChange={e => setCurrentTrack({...currentTrack, genre: e.target.value})} placeholder="Ej: Salsa" />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-12 gap-3 bg-[#1A100C] p-3 rounded-xl border border-dashed border-[#9E7649]/30">
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Autor</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#2C1B15] text-white text-sm" value={currentTrack?.author || ''} onChange={e => setCurrentTrack({...currentTrack, author: e.target.value})} />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">País Autor</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#2C1B15] text-white text-sm" list="country-options" value={currentTrack?.authorCountry || ''} onChange={e => setCurrentTrack({...currentTrack, authorCountry: e.target.value})} />
                            </div>
                            
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Intérprete</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#2C1B15] text-white text-sm" value={currentTrack?.performer || ''} onChange={e => setCurrentTrack({...currentTrack, performer: e.target.value})} />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                 <label className="block text-[10px] font-bold text-[#E8DCCF]/60 uppercase">País Intérprete</label>
                                 <input className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#2C1B15] text-white text-sm" list="country-options" value={currentTrack?.performerCountry || ''} onChange={e => setCurrentTrack({...currentTrack, performerCountry: e.target.value})} />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-2">
                            <button onClick={handleAddTrack} className="flex-1 bg-[#9E7649] hover:bg-[#8B653D] text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">{editingTrackIndex !== null ? 'save' : 'add_circle'}</span> 
                                {editingTrackIndex !== null ? 'Guardar Cambios' : 'Agregar Tema'}
                            </button>
                            {editingTrackIndex !== null && (
                                <button onClick={() => {
                                    setEditingTrackIndex(null);
                                    setCurrentTrack({id: '', title: '', author: '', authorCountry: '', performer: '', performerCountry: '', genre: ''});
                                }} className="bg-[#2C1B15] hover:bg-[#3E1E16] text-[#E8DCCF] font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center">
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 mb-6">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <h4 className="text-xs font-bold text-[#E8DCCF]/60 uppercase tracking-widest">Temas en esta producción ({sessionTracks.length})</h4>
                        {sessionTracks.length > 0 && <button onClick={() => setSessionTracks([])} className="text-xs text-red-400 hover:underline">Limpiar todo</button>}
                    </div>
                    
                    <div className="space-y-2">
                        {sessionTracks.map((t, idx) => {
                            if (!t) return null;
                            return (
                            <div key={idx} className={`bg-[#2C1B15] p-3 rounded-xl border flex items-center justify-between shadow-sm ${editingTrackIndex === idx ? 'border-[#9E7649]' : 'border-[#9E7649]/20'}`}>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm truncate text-white">{t.title || 'Sin título'}</p>
                                    <p className="text-[10px] text-[#E8DCCF]/60 truncate">{t.performer || 'Desconocido'} • {t.genre || 'Sin género'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleEditTrack(idx)} className="text-[#E8DCCF]/60 hover:text-[#9E7649] p-1">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <button onClick={() => setSessionTracks(prev => prev.filter((_, i) => i !== idx))} className="text-[#E8DCCF]/40 hover:text-red-400 p-1">
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                            </div>
                        )})}
                        {sessionTracks.length === 0 && (
                            <div className="p-8 border-2 border-dashed border-[#9E7649]/20 rounded-2xl text-center text-[#E8DCCF]/40 text-xs">
                                Agrega temas arriba para comenzar la producción.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                     <label className="w-full bg-[#2C1B15] border border-[#9E7649]/30 text-white font-bold py-3 rounded-xl shadow-sm hover:bg-[#3E1E16] flex items-center justify-center gap-2 cursor-pointer transition-colors">
                        <span className="material-symbols-outlined text-[#9E7649]">upload_file</span> Cargar Producción desde TXT
                        <input type="file" accept=".txt" multiple onChange={handleImportTxt} className="hidden" />
                     </label>

                     <button onClick={handleSaveProduction} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-green-700 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">save</span> Guardar Producción (DB)
                     </button>
                </div>

                {importedProductions.length > 0 && (
                    <div className="mt-8 space-y-4 border-t border-[#9E7649]/20 pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white text-sm uppercase tracking-widest">Producciones Importadas ({importedProductions.length})</h3>
                            <button onClick={handleSaveAllImported} className="text-[10px] bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-bold transition-colors uppercase tracking-wider">Guardar Todas</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {importedProductions.map((prod, idx) => (
                                <div key={prod.id} className="bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/30 shadow-md">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold text-[#9E7649] uppercase">{prod.date}</p>
                                            <h4 className="font-bold text-white text-sm truncate">{prod.program}</h4>
                                            <p className="text-[10px] text-[#E8DCCF]/60">{prod.tracks.length} temas</p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={() => handleSaveImportedProduction(idx)} className="text-green-400 hover:text-green-300 p-1" title="Guardar esta producción">
                                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                            </button>
                                            <button onClick={() => handleRemoveImportedProduction(idx)} className="text-red-400 hover:text-red-300 p-1" title="Eliminar de la lista">
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                                        {prod.tracks.map((t, i) => (
                                            <p key={i} className="text-[9px] text-[#E8DCCF]/80 truncate">• {t.title} - {t.performer}</p>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </>
        )}

        {activeTab === 'stock' && (
            <div className="space-y-4">
                <div className="bg-[#2C1B15] p-5 rounded-2xl border border-[#9E7649]/20 shadow-inner">
                    <h3 className="font-bold text-[#9E7649] text-[10px] uppercase tracking-widest mb-4 border-b border-[#9E7649]/10 pb-2 text-center sm:text-left">Resumen Mensual</h3>
                    <div className="grid grid-cols-4 gap-2 sm:gap-6">
                        <div className="flex flex-col items-center sm:items-start gap-1">
                            <p className="text-[9px] font-bold text-[#E8DCCF]/40 uppercase tracking-tighter">Mes</p>
                            <div className="flex items-center gap-1 w-full justify-center sm:justify-start">
                                <button onClick={handlePrevMonth} className="text-[#9E7649] hover:text-white transition-colors">
                                    <ChevronLeft size={16} />
                                </button>
                                <input 
                                    type="text" 
                                    value={monthInputValue} 
                                    onChange={(e) => setMonthInputValue(e.target.value)}
                                    onBlur={handleMonthInputBlur}
                                    onKeyDown={handleMonthInputKeyDown}
                                    className="bg-transparent border-b border-[#9E7649]/30 text-white font-bold text-sm sm:text-lg focus:outline-none focus:border-[#9E7649] w-24 text-center"
                                />
                                <button onClick={handleNextMonth} className="text-[#9E7649] hover:text-white transition-colors">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col items-center sm:items-start gap-1">
                            <p className="text-[9px] font-bold text-[#E8DCCF]/40 uppercase tracking-tighter">Plan</p>
                            <p className="font-bold text-white text-sm sm:text-lg">{getBalanceData().reduce((acc, curr) => acc + curr.required, 0)}</p>
                        </div>
                        <div className="flex flex-col items-center sm:items-start gap-1">
                            <p className="text-[9px] font-bold text-[#E8DCCF]/40 uppercase tracking-tighter">Real</p>
                            <p className="font-bold text-green-400 text-sm sm:text-lg">{stockMensual.length}</p>
                        </div>
                        <div className="flex flex-col items-center sm:items-start gap-1">
                            <p className="text-[9px] font-bold text-[#E8DCCF]/40 uppercase tracking-tighter">Resto</p>
                            <p className="font-bold text-red-400 text-sm sm:text-lg">{Math.max(0, getBalanceData().reduce((acc, curr) => acc + curr.required, 0) - stockMensual.length)}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-6 border-b border-[#9E7649]/20 pb-6">
                    <h3 className="font-bold text-white text-xs uppercase tracking-widest hidden sm:block">En Stock</h3>
                    <div className="flex gap-4 w-full sm:w-auto justify-center px-2">
                        <button 
                            onClick={() => setShowBalanceModal(true)} 
                            className="flex-1 sm:flex-none bg-[#9E7649] text-white font-bold py-3 px-6 rounded-xl hover:bg-[#8B653D] flex items-center justify-center gap-2 text-xs shadow-lg transition-all active:scale-95"
                        >
                            <Activity size={18} /> Balance
                        </button>
                        
                        <div className="relative flex-1 sm:flex-none">
                            <button 
                                onClick={() => setShowActionsMenu(!showActionsMenu)} 
                                className="w-full bg-[#2C1B15] border border-[#9E7649]/30 text-white font-bold py-3 px-6 rounded-xl hover:bg-[#3E1E16] flex items-center justify-center gap-2 text-xs transition-all active:scale-95"
                            >
                                Acciones <ChevronDown size={18} />
                            </button>
                            
                            {showActionsMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-[#2C1B15] border border-[#9E7649]/30 rounded-xl shadow-xl z-50 overflow-hidden">
                                    <button onClick={() => { handleGenerateDetailedStatsDOCX(); setShowActionsMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-[#3E1E16] flex items-center gap-2">
                                        <FileText size={14} className="text-blue-400" /> Informe
                                    </button>
                                    <button onClick={handleExportDB} className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-[#3E1E16] flex items-center gap-2">
                                        <Database size={14} className="text-green-400" /> Exportar BD
                                    </button>
                                    <button onClick={() => { fileInputRef.current?.click(); }} className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-[#3E1E16] flex items-center gap-2">
                                        <Upload size={14} className="text-yellow-400" /> Cargar BD
                                    </button>
                                    <button onClick={() => { handleMoveToArchive(); setShowActionsMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-[#3E1E16] flex items-center gap-2">
                                        <Archive size={14} className="text-purple-400" /> Pasar Archivo
                                    </button>
                                    <div className="border-t border-[#9E7649]/20 my-1"></div>
                                    <button onClick={handleClearAll} className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-900/30 flex items-center gap-2">
                                        <Trash2 size={14} /> Limpiar Todo
                                    </button>
                                </div>
                            )}
                        </div>
                        <input type="file" accept=".json" ref={fileInputRef} onChange={handleLoadDB} className="hidden" />
                    </div>
                </div>
                {stockMensual.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-[#9E7649]/20 rounded-2xl text-center text-[#E8DCCF]/40 text-xs">
                        No hay producciones guardadas en este mes.
                    </div>
                ) : (
                    stockMensual.map(prod => {
                        if (!prod) return null;
                        return (
                        <div key={prod.id || Math.random()} className="bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/20 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-white text-sm">{prod.program || 'Sin programa'}</h4>
                                    <p className="text-xs text-[#E8DCCF]/60">{prod.date || 'Sin fecha'} • {prod.tracks?.length || 0} temas</p>
                                </div>
                                <button onClick={() => prod.id && handleDeleteProduction(prod.id)} className="text-red-400 hover:text-red-300 p-1">
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                            <div className="mt-3 space-y-1">
                                {(prod.tracks || []).slice(0, 3).map((t, i) => (
                                    <p key={i} className="text-[10px] text-[#E8DCCF]/80 truncate">• {t?.title || 'Sin título'} - {t?.author || 'Desconocido'}</p>
                                ))}
                                {(prod.tracks || []).length > 3 && (
                                    <p className="text-[10px] text-[#9E7649] italic">...y {(prod.tracks || []).length - 3} temas más</p>
                                )}
                            </div>
                        </div>
                    )})
                )}
            </div>
        )}

        {activeTab === 'archive' && (
            <div className="space-y-6">
                <h3 className="font-bold text-white mb-4 border-b border-[#9E7649]/20 pb-2">Archivo Histórico</h3>
                {Object.keys(archivoPorMes).length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-[#9E7649]/20 rounded-2xl text-center text-[#E8DCCF]/40 text-xs">
                        No hay producciones archivadas de meses anteriores.
                    </div>
                ) : (
                    Object.keys(archivoPorMes).sort().reverse().map(month => (
                        <div key={month} className="space-y-3">
                            <h4 className="text-xs font-bold text-[#E8DCCF]/60 uppercase tracking-widest sticky top-0 bg-[#1A100C] py-2 z-10">{month}</h4>
                            {archivoPorMes[month].map(prod => {
                                if (!prod) return null;
                                return (
                                <div key={prod.id || Math.random()} className="bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/20 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-white text-sm">{prod.program || 'Sin programa'}</h4>
                                            <p className="text-xs text-[#E8DCCF]/60">{prod.date || 'Sin fecha'} • {prod.tracks?.length || 0} temas</p>
                                        </div>
                                        <button onClick={() => prod.id && handleDeleteProduction(prod.id)} className="text-red-400 hover:text-red-300 p-1">
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    ))
                )}
            </div>
        )}

        <datalist id="genre-options">
            {GENRES_LIST.map(g => <option key={g} value={g} />)}
        </datalist>
        <datalist id="country-options">
            {COUNTRIES_LIST.map(c => <option key={c} value={c} />)}
        </datalist>

        {showAddProgramModal && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <div className="bg-[#1A100C] border border-[#9E7649]/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-[#9E7649]/20 flex justify-between items-center bg-[#2C1B15]">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            {editingProgramIndex !== null ? 'Editar Programa' : 'Agregar Programa al Balance'}
                        </h3>
                        <button onClick={() => setShowAddProgramModal(false)} className="text-[#E8DCCF]/60 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-[#9E7649] uppercase tracking-wider mb-2">Nombre del Programa</label>
                            <input 
                                type="text"
                                className="w-full bg-black/40 border border-[#9E7649]/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#9E7649]"
                                placeholder="Ej: Buenos Días Bayamo"
                                value={newProgramName}
                                onChange={e => setNewProgramName(e.target.value)}
                            />
                            <p className="text-[10px] text-[#E8DCCF]/40 mt-2">
                                * Debe coincidir con el nombre en la ficha de programa para sincronizar los días.
                            </p>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button 
                                onClick={() => setShowAddProgramModal(false)}
                                className="flex-1 py-3 rounded-xl border border-[#9E7649]/30 text-[#E8DCCF] hover:bg-white/5 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => {
                                    if (!newProgramName.trim()) return alert("El nombre es obligatorio");
                                    if (editingProgramIndex !== null) {
                                        setBalancePrograms(prev => {
                                            const next = [...prev];
                                            next[editingProgramIndex] = newProgramName.trim();
                                            return next;
                                        });
                                        setSelectedBalanceProgram(newProgramName.trim());
                                    } else {
                                        if (balancePrograms.includes(newProgramName.trim())) return alert("Este programa ya está en el balance");
                                        setBalancePrograms(prev => [...prev, newProgramName.trim()]);
                                        setSelectedBalanceProgram(newProgramName.trim());
                                    }
                                    setShowAddProgramModal(false);
                                }}
                                className="flex-1 py-3 rounded-xl bg-[#9E7649] text-white font-bold hover:bg-[#8A653D] transition-colors"
                            >
                                {editingProgramIndex !== null ? 'Guardar Cambios' : 'Agregar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {showBalanceModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
                <div className="bg-[#1A100C] border border-[#9E7649]/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                    <div className="flex justify-between items-center p-6 border-b border-[#9E7649]/20">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Activity className="text-[#9E7649]" /> Balance Mensual de Producción ({selectedMonthStr})
                        </h2>
                        <button onClick={() => setShowBalanceModal(false)} className="text-[#E8DCCF]/60 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1">
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-[#9E7649] uppercase tracking-wider mb-2">Seleccionar Programa</label>
                                <div className="flex gap-2">
                                    <select 
                                        className="flex-1 bg-black/40 border border-[#9E7649]/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#9E7649] transition-colors"
                                        value={selectedBalanceProgram || ''} 
                                        onChange={e => setSelectedBalanceProgram(e.target.value)} 
                                    >
                                        <option value="">Seleccione un programa...</option>
                                        {balancePrograms.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                    <button 
                                        onClick={() => {
                                            setEditingProgramIndex(null);
                                            setNewProgramName('');
                                            setShowAddProgramModal(true);
                                        }}
                                        className="p-2 bg-[#9E7649]/20 text-[#9E7649] rounded-lg hover:bg-[#9E7649]/30 transition-colors"
                                        title="Agregar Programa"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>
                            {selectedBalanceProgram && (
                                <div className="flex items-end gap-2">
                                    <button 
                                        onClick={() => {
                                            if (confirm(`¿Eliminar "${selectedBalanceProgram}" del balance?`)) {
                                                setBalancePrograms(prev => prev.filter(p => p !== selectedBalanceProgram));
                                                setSelectedBalanceProgram(null);
                                            }
                                        }}
                                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                                        title="Eliminar Programa"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {selectedBalanceProgram && getBalanceData().filter(d => d.program === selectedBalanceProgram).map((data, idx) => (
                            <div key={idx} className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-[#2C1B15] p-4 rounded-lg text-center">
                                        <p className="text-xs text-[#E8DCCF]/60 uppercase">Plan</p>
                                        <p className="text-2xl font-bold text-white">{data.required}</p>
                                    </div>
                                    <div className="bg-[#2C1B15] p-4 rounded-lg text-center">
                                        <p className="text-xs text-[#E8DCCF]/60 uppercase">Real</p>
                                        <p className="text-2xl font-bold text-green-400">{data.completed}</p>
                                    </div>
                                    <div className="bg-[#2C1B15] p-4 rounded-lg text-center">
                                        <p className="text-xs text-[#E8DCCF]/60 uppercase">Resto</p>
                                        <p className="text-2xl font-bold text-red-400">{data.missing}</p>
                                    </div>
                                </div>

                                <div className="bg-[#2C1B15] p-4 rounded-lg">
                                    <p className="text-sm font-bold text-[#E8DCCF]/60 mb-2">Días faltantes:</p>
                                    <div className="text-sm text-white space-y-1">
                                        {data.missingDates.map(d => <p key={d}>{d}</p>)}
                                    </div>
                                </div>
                                
                                <div className="flex justify-between mt-6">
                                    <button onClick={() => handleExportAuditDOCX(data)} className="bg-[#9E7649] text-white px-4 py-2 rounded-lg text-sm font-bold">Generar DOCX</button>
                                    <button onClick={() => {
                                        let message = `*BALANCE ${data.program} - ${selectedMonthStr}*\n\n*Plan:* ${data.required}\n*Real:* ${data.completed}\n*Resto:* ${data.missing}\n\n*Días faltantes:*\n${data.missingDates.join('\n')}`;
                                        openWhatsApp(message);
                                    }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold">Compartir WhatsApp</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Productions;
