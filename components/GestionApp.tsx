import React, { useState, useEffect } from 'react';
import { ArrowLeft, Radio, FileBarChart, Library, FileText, Users, CreditCard, Upload, Save, X, Edit2, Check, CalendarCheck, ChevronLeft, ChevronRight, Trash2, FileDown, Plus, Settings, AlertTriangle, RefreshCw } from 'lucide-react';
import { ProgramFicha, ProgramSection, User, ProgramCatalog, RolePaymentInfo, NewsItem, FP02Report, ConsolidatedPayment, WorkLog } from '../types';
import CMNLHeader from './CMNLHeader';
import { INITIAL_FICHAS } from '../utils/fichasData';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAccumulatedData, getMonthlyTotalData, getDayMinutesConfig, saveDayMinutesConfig, DayType, TransmissionBreakdown, getDayType } from '../src/services/transmissionService';
import * as XLSX from 'xlsx-js-style';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import { InterruptionModal } from './InterruptionModal';
import EquipoSection from './gestion/EquipoSection';
import ReportesSection from './gestion/ReportesSection';
import FichasSection from './gestion/FichasSection';
import CatalogoSection from './gestion/CatalogoSection';

const normalize = (s: string) => s ? s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

const isMatch = (name1: string, name2: string) => {
    const norm1 = normalize(name1);
    const norm2 = normalize(name2);
    if (!norm1 || !norm2) return false;
    if (norm1 === norm2) return true;
    
    // Strictness: if one is very short, require exact match or word-boundary match
    if (norm1.length <= 3 || norm2.length <= 3) return norm1 === norm2;

    const getWords = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(w => w.length > 2);
    const words1 = getWords(name1);
    const words2 = getWords(name2);
    
    if (words1.length === 0 || words2.length === 0) {
        return norm1.includes(norm2) || norm2.includes(norm1);
    }
    
    const [shorter, longer] = words1.length < words2.length ? [words1, words2] : [words2, words1];
    // Must match at least 75% of words or be a very strong intersection
    const matches = shorter.filter(w => longer.some(lw => lw === w || lw.includes(w) || w.includes(lw))).length;
    return matches >= Math.ceil(shorter.length * 0.75);
};

interface Props {
  onBack: () => void;
  onMenuClick?: () => void;
  currentUser: User | null;
  onDirtyChange: (dirty: boolean) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  historyContent: string;
  setHistoryContent: React.Dispatch<React.SetStateAction<string>>;
  aboutContent: string;
  setAboutContent: React.Dispatch<React.SetStateAction<string>>;
  news: NewsItem[];
  setNews: React.Dispatch<React.SetStateAction<NewsItem[]>>;
  setImpersonatedUser: React.Dispatch<React.SetStateAction<User | null>>;
}



/* ConsolidatedPayment interface removed since it's now in types.ts */

interface RoleConfig {
    id: string;
    role: string;
    level: string;
}

interface UserPaymentConfig {
    roles: RoleConfig[];
}

interface Interruption {
    id: string;
    date: string;
    programName: string;
    category: keyof TransmissionBreakdown;
    affectedMinutes: number;
    percentage: number;
    startTime: string;
    endTime: string;
}

interface ConsolidatedMonth {
    id: string;
    month: string; // YYYY-MM
    accumulated: TransmissionBreakdown;
    interruptions: Record<keyof TransmissionBreakdown, number>;
    totalRealMinutes: number;
    dateConsolidated: string;
    interruptionDetails?: Interruption[];
}

const GestionApp: React.FC<Props> = ({ onBack, onMenuClick, currentUser, onDirtyChange, users, setUsers, historyContent, setHistoryContent, aboutContent, setAboutContent, news, setNews, setImpersonatedUser }) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const isInitialMount = React.useRef(true);

  const [fichas, setFichas] = useState<ProgramFicha[]>(() => {
      const saved = localStorage.getItem('rcm_data_fichas');
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                  return parsed;
              }
          } catch (e) {
              console.error("Error parsing fichas from localStorage", e);
          }
      }
      return INITIAL_FICHAS;
  });
  const [catalogo, setCatalogo] = useState<ProgramCatalog[]>(() => {
      const saved = localStorage.getItem('rcm_data_catalogo');
      return saved ? JSON.parse(saved) : [];
  });
  const [workLogs, setWorkLogs] = useState<WorkLog[]>(() => {
      const saved = localStorage.getItem(`user_${currentUser?.username || 'default'}_rcm_data_worklogs`);
      return saved ? JSON.parse(saved) : [];
  });
  const [consolidatedPayments, setConsolidatedPayments] = useState<ConsolidatedPayment[]>(() => {
      const saved = localStorage.getItem('rcm_all_consolidated_payments');
      return saved ? JSON.parse(saved) : [];
  });
  const [interruptions, setInterruptions] = useState<Interruption[]>(() => {
      const globalSaved = localStorage.getItem('rcm_transmission_interruptions');
      if (globalSaved) return JSON.parse(globalSaved);
      const userSaved = localStorage.getItem(`user_${currentUser?.username || 'default'}_rcm_interruptions`);
      return userSaved ? JSON.parse(userSaved) : [];
  });
  const [consolidatedMonths, setConsolidatedMonths] = useState<ConsolidatedMonth[]>(() => {
      const globalSaved = localStorage.getItem('rcm_transmission_historical');
      if (globalSaved) return JSON.parse(globalSaved);
      const userSaved = localStorage.getItem(`user_${currentUser?.username || 'default'}_rcm_consolidated_months`);
      return userSaved ? JSON.parse(userSaved) : [];
  });
  const [teamData, setTeamData] = useState<any[]>(() => {
      const saved = localStorage.getItem('rcm_equipo_cmnl');
      return saved ? JSON.parse(saved) : [];
  });

  const getProgrammedMinutesForMonth = (cat: keyof TransmissionBreakdown, month: number, year: number) => {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let total = 0;
      for (let d = 1; d <= daysInMonth; d++) {
          const current = new Date(year, month, d);
          const dayType = getDayType(current);
          total += calculateCategoryMinutes(cat, dayType, fichas, transmissionConfig.categoryPrograms || {});
      }
      return total;
  };

  const [pagosTab, setPagosTab] = useState<'registro' | 'consolidacion'>('registro');
  const [calculationMode, setCalculationMode] = useState<'oficial' | 'habitual' | 'manual'>(() => {
      const savedMode = localStorage.getItem(`user_${currentUser?.username || 'default'}_calc_mode`);
      if (savedMode && (savedMode === 'oficial' || savedMode === 'habitual' || savedMode === 'manual')) return savedMode as any;
      const savedHabitual = localStorage.getItem(`user_${currentUser?.username || 'default'}_habitual_mode`) === 'true';
      return savedHabitual ? 'habitual' : 'manual';
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [habitualMode, setHabitualMode] = useState<boolean>(() => {
      const saved = localStorage.getItem(`user_${currentUser?.username || 'default'}_habitual_mode`);
      return saved === 'true';
  });
  const [habitualExclusions, setHabitualExclusions] = useState<any[]>(() => {
      const saved = localStorage.getItem(`user_${currentUser?.username || 'default'}_habitual_exclusions`);
      return saved ? JSON.parse(saved) : [];
  });
  const [showMonthClosingModal, setShowMonthClosingModal] = useState(false);
  const [pendingConsolidationMonth, setPendingConsolidationMonth] = useState<string | null>(null);

  useEffect(() => {
    // Month closing check
    const today = new Date();
    if (today.getDate() === 1 && habitualMode && currentUser?.role !== 'admin' && currentUser?.role !== 'coordinator') {
        const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonth = formatDateToISO(prevMonthDate).slice(0, 7);
        
        // Check if there are logs or habitual data for the previous month that hasn't been consolidated
        const hasData = workLogs.some(l => l.userId === currentUser.username && l.date.startsWith(prevMonth));
        const alreadyConsolidated = consolidatedPayments.some(c => c.userId === currentUser.username && c.month === prevMonth);
        
        if (hasData && !alreadyConsolidated) {
            setPendingConsolidationMonth(prevMonth);
            setShowMonthClosingModal(true);
        }
    }
  }, [habitualMode, currentUser, workLogs, consolidatedPayments]);

  // Hash Navigation Logic
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['pagos', 'catalogo', 'fichas', 'transmision', 'equipo', 'reportes'].includes(hash)) {
        setActiveSection(hash);
      } else {
        setActiveSection(null);
      }
    };

    // Set initial hash if empty
    if (!window.location.hash) {
         window.history.replaceState(null, '', '#menu');
    } else {
        handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync state to hash
  useEffect(() => {
    const targetHash = activeSection ? `#${activeSection}` : '#menu';
    if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
    }
  }, [activeSection]);

  useEffect(() => {
      if (currentUser) {
          const username = currentUser.username;
          const savedWorkLogs = localStorage.getItem(`user_${username}_rcm_data_worklogs`);
          setWorkLogs(savedWorkLogs ? JSON.parse(savedWorkLogs) : []);

          const savedConsolidated = localStorage.getItem(`user_${username}_rcm_data_consolidated`);
          setConsolidatedPayments(savedConsolidated ? JSON.parse(savedConsolidated) : []);

          const globalInterruptions = localStorage.getItem('rcm_transmission_interruptions');
          if (globalInterruptions) {
              setInterruptions(JSON.parse(globalInterruptions));
          } else {
              const savedInterruptions = localStorage.getItem(`user_${username}_rcm_interruptions`);
              if (savedInterruptions) setInterruptions(JSON.parse(savedInterruptions));
          }

          const globalHistorical = localStorage.getItem('rcm_transmission_historical');
          if (globalHistorical) {
              setConsolidatedMonths(JSON.parse(globalHistorical));
          } else {
              const savedConsolidatedMonths = localStorage.getItem(`user_${username}_rcm_consolidated_months`);
              if (savedConsolidatedMonths) setConsolidatedMonths(JSON.parse(savedConsolidatedMonths));
          }

          const savedHabitualMode = localStorage.getItem(`user_${username}_habitual_mode`);
          setHabitualMode(savedHabitualMode === 'true');

          const savedHabitualExclusions = localStorage.getItem(`user_${username}_habitual_exclusions`);
          setHabitualExclusions(savedHabitualExclusions ? JSON.parse(savedHabitualExclusions) : []);
      }
  }, [currentUser]);

  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }
    onDirtyChange(true);
  }, [workLogs, consolidatedPayments, interruptions, consolidatedMonths, fichas, catalogo, habitualMode, habitualExclusions, onDirtyChange]);

  useEffect(() => {
      if (currentUser) {
          const username = currentUser.username;
          localStorage.setItem(`user_${username}_rcm_data_worklogs`, JSON.stringify(workLogs));
          localStorage.setItem('rcm_all_consolidated_payments', JSON.stringify(consolidatedPayments));
          localStorage.setItem(`user_${username}_calc_mode`, calculationMode);
          localStorage.setItem(`user_${username}_habitual_mode`, String(habitualMode));
          localStorage.setItem(`user_${username}_habitual_exclusions`, JSON.stringify(habitualExclusions));
      }
      localStorage.setItem('rcm_transmission_interruptions', JSON.stringify(interruptions));
      localStorage.setItem('rcm_transmission_historical', JSON.stringify(consolidatedMonths));
      localStorage.setItem('rcm_data_fichas', JSON.stringify(fichas));
      localStorage.setItem('rcm_data_catalogo', JSON.stringify(catalogo));
  }, [workLogs, consolidatedPayments, interruptions, consolidatedMonths, fichas, catalogo, habitualMode, habitualExclusions, currentUser]);

  useEffect(() => {
      const fetchTeamData = async () => {
          // Only fetch if we don't have local data or if it's explicitly requested
          const saved = localStorage.getItem('rcm_equipo_cmnl');
          if (saved) {
              try {
                  const parsed = JSON.parse(saved);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                      setTeamData(parsed);
                      return; // Don't fetch if we have data
                  }
              } catch (e) {}
          }

          try {
              const response = await fetch(`https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/equipocmnl.json?t=${new Date().getTime()}`, { cache: "no-store" });
              if (response.ok) {
                  const data = await response.json();
                  if (Array.isArray(data)) {
                      setTeamData(data);
                      localStorage.setItem('rcm_equipo_cmnl', JSON.stringify(data));
                  }
              }
          } catch (error) {
              console.error("Error fetching team data:", error);
          }
      };

      fetchTeamData();

      const fetchCatalogData = async () => {
          const saved = localStorage.getItem('rcm_data_catalogo');
          if (saved) {
              try {
                  const parsed = JSON.parse(saved);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                      setCatalogo(parsed);
                      return;
                  }
              } catch (e) {}
          }

          try {
              const response = await fetch(`https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/actualcmnl.json?t=${new Date().getTime()}`, { cache: "no-store" });
              if (response.ok) {
                  const data = await response.json();
                  if (data && Array.isArray(data.catalogo)) {
                      setCatalogo(data.catalogo);
                      localStorage.setItem('rcm_data_catalogo', JSON.stringify(data.catalogo));
                  }
              }
          } catch (error) {
              console.error("Error fetching catalog data:", error);
          }
      };
      
      fetchCatalogData();
  }, []);

  const userPaymentConfig = React.useMemo<UserPaymentConfig | null>(() => {
      if (!currentUser) return null;
      
      const normalizeName = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
      const getWords = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(w => w.length > 1);
      
      let member = teamData.find(m => normalizeName(m.name) === normalizeName(currentUser.name));
      
      if (!member) {
          // Fallback: try to match by at least 2 significant words (e.g. first name and last name)
          const userWords = getWords(currentUser.name);
          member = teamData.find(m => {
              const memberWords = getWords(m.name);
              const matchCount = userWords.filter(w => memberWords.includes(w)).length;
              return matchCount >= 2;
          });
      }
      
      if (!member) return { roles: [] };

      const specialties = member.specialty ? member.specialty.split(' / ') : [];
      const levels = member.level ? member.level.split(' / ') : [];

      const supportedRoles = ['Locutor', 'Realizador de sonido', 'Director', 'Asesor'];
      
      const roles: RoleConfig[] = [];
      
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
                      id: Date.now().toString() + index,
                      role: matchedRole,
                      level: level
                  });
              }
          }
      });

      return { roles };
  }, [currentUser, teamData]);

  // Work Log State
  const [workLogDate, setWorkLogDate] = useState(() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  });

  const parseLocalDate = (dateStr: string) => {
      if (!dateStr) return new Date();
      // Handle YYYY-MM-DD format
      if (dateStr.length === 10 && dateStr.includes('-')) {
          return new Date(dateStr + 'T12:00:00');
      }
      return new Date(dateStr);
  };

  const formatDateToISO = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };
  const [workLogView, setWorkLogView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [showAccumulated, setShowAccumulated] = useState(false);
  const [showMonthlyPayments, setShowMonthlyPayments] = useState(false);
  
  // Payment Config State


  // Transmission State
  const [transmissionConfig, setTransmissionConfig] = useState(getDayMinutesConfig());

  useEffect(() => {
      const newConfig = { 
          ...transmissionConfig,
          MONDAY: { ...transmissionConfig.MONDAY },
          TUESDAY: { ...transmissionConfig.TUESDAY },
          WEDNESDAY: { ...transmissionConfig.WEDNESDAY },
          THURSDAY: { ...transmissionConfig.THURSDAY },
          FRIDAY: { ...transmissionConfig.FRIDAY },
          SATURDAY: { ...transmissionConfig.SATURDAY },
          SUNDAY: { ...transmissionConfig.SUNDAY },
          categoryPrograms: { ...(transmissionConfig.categoryPrograms || {}) }
      };
      let changed = false;

      const categories: (keyof TransmissionBreakdown)[] = [
          'informativos', 'boletines', 'publicidad', 'educativos', 'orientacion', 'cienciaTecnica',
          'variados', 'variadoInfantilGrabado', 'historicosGrabado', 'dramatizados', 'literaturaArte', 'musicales', 'deportivos', 'reposiciones'
      ];

      const dayTypes: DayType[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

      dayTypes.forEach(dayType => {
          let dayTotal = 0;
          categories.forEach(cat => {
              const calculatedMinutes = calculateCategoryMinutes(cat, dayType, fichas, newConfig.categoryPrograms || {});
              newConfig[dayType][cat] = calculatedMinutes;
              dayTotal += calculatedMinutes;
          });

          // Ensure 8-hour rule (480 minutes)
          if (dayTotal !== 480 && dayTotal > 0) {
              const diff = 480 - dayTotal;
              // Adjust musicales as the buffer category, or variados if musicales is 0
              if (newConfig[dayType].musicales > 0) {
                  newConfig[dayType].musicales += diff;
              } else {
                  newConfig[dayType].variados += diff;
              }
              dayTotal = 480;
          }
          newConfig[dayType].total = dayTotal;
      });

      // Check if anything actually changed compared to transmissionConfig
      dayTypes.forEach(dayType => {
          categories.forEach(cat => {
              if (newConfig[dayType][cat] !== transmissionConfig[dayType][cat]) {
                  changed = true;
              }
          });
          if (newConfig[dayType].total !== transmissionConfig[dayType].total) {
              changed = true;
          }
      });

      if (changed) {
          setTransmissionConfig(newConfig);
          saveDayMinutesConfig(newConfig);
      }
  }, [fichas, transmissionConfig.categoryPrograms]);

  const [showInterruptionsModal, setShowInterruptionsModal] = useState(false);
  const [showConsolidateModal, setShowConsolidateModal] = useState(false);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [showAccumulatedMonths, setShowAccumulatedMonths] = useState(false);
  const [editingHistoricalMonthId, setEditingHistoricalMonthId] = useState<string | null>(null);
  const [historicalEditData, setHistoricalEditData] = useState<ConsolidatedMonth | null>(null);
  const [showInterruptionChoiceModal, setShowInterruptionChoiceModal] = useState(false);
  const [showEditInterruptionsModal, setShowEditInterruptionsModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<keyof TransmissionBreakdown | null>(null);
  const [categoryEditForm, setCategoryEditForm] = useState({ programs: [] as string[] });
  
  const [dialog, setDialog] = useState<{isOpen: boolean, title: string, message: string, type: 'alert' | 'confirm', onConfirm?: () => void}>({
      isOpen: false, title: '', message: '', type: 'alert'
  });
  
  const todayForState = new Date();
  const [manualMonth, setManualMonth] = useState(todayForState.getMonth() === 0 ? 11 : todayForState.getMonth() - 1);
  const [manualYear, setManualYear] = useState(todayForState.getMonth() === 0 ? todayForState.getFullYear() - 1 : todayForState.getFullYear());
  const [manualInterruptions, setManualInterruptions] = useState(0);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('rcm_transmission_interruptions', JSON.stringify(interruptions));
  }, [interruptions]);

  useEffect(() => {
    localStorage.setItem('rcm_transmission_historical', JSON.stringify(consolidatedMonths));
  }, [consolidatedMonths]);

  useEffect(() => {
    localStorage.setItem('rcm_data_fichas', JSON.stringify(fichas));
  }, [fichas]);

  useEffect(() => {
    localStorage.setItem('rcm_data_catalogo', JSON.stringify(catalogo));
  }, [catalogo]);

  useEffect(() => {
      localStorage.setItem(`user_${currentUser?.username || 'default'}_rcm_data_worklogs`, JSON.stringify(workLogs));
  }, [workLogs, currentUser]);

  useEffect(() => {
      localStorage.setItem(`user_${currentUser?.username || 'default'}_rcm_data_consolidated`, JSON.stringify(consolidatedPayments));
  }, [consolidatedPayments, currentUser]);

  const menuItems = [
    { id: 'reportes', icon: <FileBarChart size={32} />, label: 'Pagos y Reportes', color: 'bg-blue-900/40 text-blue-400 border-blue-500/30' },
    { id: 'transmision', icon: <Radio size={32} />, label: 'Transmisión', color: 'bg-red-900/40 text-red-400 border-red-500/30' },
    { id: 'equipo', icon: <Users size={32} />, label: 'Equipo', color: 'bg-purple-900/40 text-purple-400 border-purple-500/30' },
    { id: 'fichas', icon: <FileText size={32} />, label: 'Fichas', color: 'bg-emerald-900/40 text-emerald-400 border-emerald-500/30' },
    { id: 'catalogo', icon: <Library size={32} />, label: 'Catálogo', color: 'bg-amber-900/40 text-amber-400 border-amber-500/30' },
  ];

  const isGlobalAdmin = currentUser?.classification === 'Administrador' || (currentUser?.role === 'admin' && currentUser?.classification !== 'Coordinador');
  const canManageGestion = isGlobalAdmin || (currentUser?.classification === 'Coordinador' && (currentUser?.coordinatorSections || []).includes('Gestión'));
  const canManageProgramacion = isGlobalAdmin || (currentUser?.classification === 'Coordinador' && (currentUser?.coordinatorSections || []).includes('Programación'));
  const isAdmin = canManageGestion || canManageProgramacion;

  const formatPercentage = (value: string) => {
      if (!value) return '';
      const num = parseFloat(value);
      if (isNaN(num)) return value;
      if (num <= 1 && num > 0) return `${Math.round(num * 100)}%`;
      return `${num}%`;
  };

  const isProgramOnDay = (program: ProgramFicha, dateStr: string) => {
      // Use T12:00:00 to avoid timezone issues with YYYY-MM-DD
      const date = new Date(dateStr + 'T12:00:00');
      const day = date.getDay(); // 0 = Sunday, 1 = Monday, ...
      
      // Check for manual override first
      const manualData = localStorage.getItem('rcm_manual_programming');
      if (manualData && manualData !== '[]') {
          try {
              const manualPrograms: any[] = JSON.parse(manualData);
              const onDay = manualPrograms.find(p => p.name.toLowerCase() === program.name.toLowerCase() && p.days.includes(day));
              return !!onDay;
          } catch (e) {
              console.error("Error parsing manual programming", e);
          }
      }

      const freq = program.frequency.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      // Normalize frequency string
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

  const DEFAULT_PROGRAMS = [
      { name: "Noticiero Nacional", duration: "28 min", frequency: "Lunes a Domingo", schedule: "13:00-13:30" },
      { name: "Noticiero Provincial", duration: "28 min", frequency: "Lunes a Sábado", schedule: "12:00-12:28" }
  ];

  const calculateCategoryMinutes = (
      cat: keyof TransmissionBreakdown,
      dayType: DayType,
      fichas: ProgramFicha[],
      categoryPrograms: Record<string, string[]>
  ): number => {
      let dummyDateStr = '2024-01-01'; // Monday
      if (dayType === 'TUESDAY') dummyDateStr = '2024-01-02';
      if (dayType === 'WEDNESDAY') dummyDateStr = '2024-01-03';
      if (dayType === 'THURSDAY') dummyDateStr = '2024-01-04';
      if (dayType === 'FRIDAY') dummyDateStr = '2024-01-05';
      if (dayType === 'SATURDAY') dummyDateStr = '2024-01-06';
      if (dayType === 'SUNDAY') dummyDateStr = '2024-01-07';

      const allPrograms = [...fichas, ...DEFAULT_PROGRAMS];

      const getBoletinesMinutes = (f: any): number => {
          const fName = f.name.toLowerCase();
          if (fName.includes('buenos días bayamo') || fName.includes('buenos dias bayamo')) return 12;
          if (fName.includes('hablando con juana')) return 3;
          if (fName.includes('cómplices') || fName.includes('complices')) return 6;
          if (fName.includes('estación 95.3') || fName.includes('estacion 95.3')) return 3;
          if (fName.includes('palco de domingo')) return 3;

          let programTotal = 0;
          const profile = f.profile?.toLowerCase() || '';
          
          // Check for "boletín (n)" or "boletin (n)"
          const boletinMatch = profile.match(/bolet[ií]n\s*\((\d+)\)/);
          if (boletinMatch) {
              programTotal += parseInt(boletinMatch[1], 10) * 3;
          } else {
              // Check for "n boletines"
              const boletinesCountMatch = profile.match(/(\d+)\s*bolet[ií]nes/);
              if (boletinesCountMatch) {
                  programTotal += parseInt(boletinesCountMatch[1], 10) * 3;
              } else if (profile.includes('tres boletines')) {
                  programTotal += 9;
              } else if (profile.includes('dos boletines')) {
                  programTotal += 6;
              } else if (profile.includes('un boletín') || profile.includes('un boletin') || profile.includes('el boletín') || profile.includes('el boletin')) {
                  programTotal += 3;
              }
          }
          
          if (profile.includes('un resumen informativo') || profile.includes('el resumen informativo') || profile.includes('resumen informativo')) {
              programTotal += 3; // Summary is 3 mins as per user logic
          }
          
          f.sections?.forEach((s: any) => {
              const sName = s.name.toLowerCase();
              const sDesc = s.description?.toLowerCase() || '';
              if (sName.includes('boletín') || sName.includes('boletin') || sDesc.includes('boletín') || sDesc.includes('boletin')) {
                  const dur = parseDuration(s.duration);
                  programTotal += dur > 0 ? dur : 3;
              }
          });
          return programTotal;
      };

      const getCienciaTecnicaMinutes = (f: any, day: string): number => {
          const fName = f.name.toLowerCase();
          const profile = f.profile?.toLowerCase() || '';
          
          // Specific programs
          if (fName.includes('buenos días bayamo') || fName.includes('buenos dias bayamo')) {
              if (['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].includes(day)) return 3;
          }
          if (fName.includes('parada joven')) {
              if (['TUESDAY', 'FRIDAY'].includes(day)) return 3;
          }
          
          // General check in profile
          if (profile.includes('ciencia y técnica') || profile.includes('ciencia y tecnica')) {
              // If it's a daily program, it might be every day or specific days
              // For now, we assume if it's in the profile and not handled above, we might need more info
              // But let's check if it specifies a day
              if (profile.includes('lunes') && day === 'MONDAY') return 3;
              if (profile.includes('martes') && day === 'TUESDAY') return 3;
              if (profile.includes('miércoles') && day === 'WEDNESDAY') return 3;
              if (profile.includes('jueves') && day === 'THURSDAY') return 3;
              if (profile.includes('viernes') && day === 'FRIDAY') return 3;
              if (profile.includes('sábado') && day === 'SATURDAY') return 3;
              if (profile.includes('domingo') && day === 'SUNDAY') return 3;
          }
          
          return 0;
      };

      const parseDuration = (dur: string): number => {
          if (!dur) return 0;
          const str = dur.toLowerCase().trim();
          const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
          if (timeMatch) return parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
          const minMatch = str.match(/(\d+)\s*(?:min|m)/);
          if (minMatch) return parseInt(minMatch[1], 10);
          const hourMatch = str.match(/(\d+)\s*(?:hora|h)/);
          if (hourMatch) return parseInt(hourMatch[1], 10) * 60;
          const numMatch = str.match(/^(\d+)$/);
          if (numMatch) return parseInt(numMatch[1], 10);
          return 0;
      };

      if (cat === 'boletines') {
          let total = 0;
          allPrograms.forEach(f => {
              if (isProgramOnDay(f as any, dummyDateStr)) {
                  const fName = f.name.toLowerCase();
                  if (fName.includes('alba y crisol') || fName.includes('coloreando melodías')) return;
                  total += getBoletinesMinutes(f);
              }
          });
          return total;
      }

      if (cat === 'cienciaTecnica') {
          let total = 0;
          allPrograms.forEach(f => {
              if (isProgramOnDay(f as any, dummyDateStr)) {
                  total += getCienciaTecnicaMinutes(f, dayType);
              }
          });
          return total;
      }

      if (cat === 'publicidad') {
          if (dayType === 'SUNDAY') return 10;
          if (dayType === 'SATURDAY') return 16;
          return 20;
      }

      const assignedProgramNames = categoryPrograms[cat] || [];
      let total = 0;
      assignedProgramNames.forEach(progName => {
          const ficha = allPrograms.find(f => f.name === progName);
          if (ficha && isProgramOnDay(ficha as any, dummyDateStr)) {
              const fName = ficha.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              let duration = parseDuration(ficha.duration);
              
              // Subtract 26 minutes from Cómplices (Alba y Crisol + Coloreando Melodías)
              if (fName.includes('complices')) {
                  duration = Math.max(0, duration - 26);
              }
              
              // Subtract Boletines and Ciencia y Técnica
              duration -= getBoletinesMinutes(ficha);
              duration -= getCienciaTecnicaMinutes(ficha, dayType);
              
              // Special case for Buenos Días Bayamo: User says 101 mins
              if (fName.includes('buenos días bayamo') || fName.includes('buenos dias bayamo')) {
                  duration = 101;
              }
              
              // Special case for Sigue a tu ritmo: 103 mins total - 28 mins news = 75 mins
              if (fName.includes('sigue a tu ritmo')) {
                  duration = 75;
              }
              
              total += Math.max(0, duration);
          }
      });
      return total;
  };

  const getProgramRate = React.useCallback((programName: string, role: string, level: string) => {
      if (!programName || !role || !level) return 0;
      
      const program = catalogo.find(p => isMatch(p.name, programName));
      if (!program) return 0;

      let total = 0;
      
      // Normalize role for matching
      let searchRole = role;
      if (normalize(role).includes('realizador de sonido')) searchRole = 'Realizador';
      else if (normalize(role).includes('director')) searchRole = 'Director';
      else if (normalize(role).includes('asesor')) searchRole = 'Asesor';
      else if (normalize(role).includes('locutor')) searchRole = 'Locutor';

      // Find main role rate
      const roleInfo = program.roles.find(r => normalize(r.role).includes(normalize(searchRole)));
      
      if (roleInfo) {
           const rateObj = roleInfo.rates.find(r => r.level === level);
           if (rateObj) {
               total += parseFloat(rateObj.amount) || 0;
           }
      }

      // Feature: If role is Director, add "Producción Musical" if available in the catalog for this program
      if (normalize(role).includes('director')) {
          const musicRole = program.roles.find(r => normalize(r.role).includes('produccion musical'));
          if (musicRole) {
              const musicRate = musicRole.rates.find(r => r.level === level);
              if (musicRate) {
                  total += parseFloat(musicRate.amount) || 0;
              }
          }
      }
      
      return total;
  }, [catalogo]);

  const generatePDF = () => {
      if (!currentUser || !userPaymentConfig) return;
      
      const doc = new jsPDF();
      const title = `Reporte de Pagos - ${currentUser.name}`;
      const subtitle = `Cargos: ${userPaymentConfig.roles.map(r => `${r.role} (${r.level})`).join(', ')}`;
      const date = `Fecha de emisión: ${new Date().toLocaleDateString()}`;

      doc.setFontSize(18);
      doc.text(title, 14, 22);
      doc.setFontSize(12);
      doc.text(subtitle, 14, 30);
      doc.setFontSize(10);
      doc.text(date, 14, 36);

      const tableColumn = ["Fecha", "Cargo", "Programa", "Monto"];
      const tableRows: any[] = [];

      // Filter logs for current user and roles
      const userLogs = workLogs.filter(l => 
          l.userId === currentUser.username && 
          userPaymentConfig.roles.some(r => r.role === l.role)
      ).sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());

      let totalAmount = 0;

      userLogs.forEach(log => {
          const logData = [
              log.date,
              log.role,
              log.programName,
              `$${log.amount.toFixed(2)}`
          ];
          tableRows.push(logData);
          totalAmount += log.amount;
      });

      // Add total row
      tableRows.push(["", "", "TOTAL", `$${totalAmount.toFixed(2)}`]);

      autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 40,
      });

      doc.save(`reporte_pagos_${currentUser.username}_${formatDateToISO(new Date())}.pdf`);
  };

  const getHabitualStatus = (programName: string, role: string, dateStr: string) => {
    if (!currentUser || !habitualMode) return { isHabitual: false, isAutoMarked: false, isExcluded: false };

    // Palco de Domingo logic: Only habitual on Sundays
    if (programName === "Palco de Domingo") {
      const date = new Date(dateStr);
      if (date.getDay() !== 0) return { isHabitual: false, isAutoMarked: false, isExcluded: false };
    }

    const normalizeName = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
    const getWords = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(w => w.length > 1);
    
    let userTeamInfo = teamData.find(m => normalizeName(m.name) === normalizeName(currentUser.name));
    if (!userTeamInfo) {
      const userWords = getWords(currentUser.name);
      userTeamInfo = teamData.find(m => {
        const memberWords = getWords(m.name);
        const matchCount = userWords.filter(w => memberWords.includes(w)).length;
        return matchCount >= 2;
      });
    }

    const habitualProgramsByRole = userTeamInfo?.habitualProgramsByRole || {};
    const legacyHabitualPrograms = userTeamInfo?.habitualPrograms || [];
    const roleNorm = normalize(role);
    const roleKey = Object.keys(habitualProgramsByRole).find(k => normalize(k) === roleNorm || roleNorm.includes(normalize(k)) || normalize(k).includes(roleNorm));
    
    const progNorm = normalize(programName);
    
    let isHabitual = false;
    if (roleKey) {
      isHabitual = (habitualProgramsByRole[roleKey] || []).some(p => isMatch(p, programName));
    } else {
      isHabitual = (legacyHabitualPrograms || []).some(p => isMatch(p, programName));
    }

    if (!isHabitual) return { isHabitual: false, isAutoMarked: false, isExcluded: false };

    const isExcluded = habitualExclusions.some(ex => ex.date === dateStr && ex.programName === programName && ex.role === role);
    
    // Auto-marking logic: Day 1 to Day-1 of current month
    const today = new Date();
    const currentMonth = formatDateToISO(today).slice(0, 7);
    const currentDay = today.getDate();
    
    const isCurrentMonth = dateStr.startsWith(currentMonth);
    const dayOfDate = parseInt(dateStr.split('-')[2]);
    
    const isAutoMarked = isCurrentMonth && dayOfDate < currentDay && !isExcluded;

    return { isHabitual, isAutoMarked, isExcluded };
  };

  const toggleWorkLog = (programName: string, date: string, role: string) => {
    if (!currentUser || !userPaymentConfig) return;
    const userId = currentUser.username;
    
    const roleConfig = userPaymentConfig.roles.find(r => r.role === role);
    if (!roleConfig) return;

    const { isHabitual } = getHabitualStatus(programName, role, date);

      const existingIndex = workLogs.findIndex(l => 
          l.userId === userId && 
          l.role === role && 
          l.programName === programName && 
          l.date === date
      );

      if (existingIndex >= 0) {
          const newLogs = [...workLogs];
          newLogs.splice(existingIndex, 1);
          setWorkLogs(newLogs);
      } else {
      if (habitualMode && isHabitual) {
        const today = new Date();
        const currentMonth = formatDateToISO(today).slice(0, 7);
        const currentDay = today.getDate();
        const dayOfDate = parseInt(date.split('-')[2]);

        // Only use exclusions for the auto-marked range
        if (date.startsWith(currentMonth) && dayOfDate < currentDay) {
          const exclusionIndex = habitualExclusions.findIndex(ex => ex.date === date && ex.programName === programName && ex.role === role);
          if (exclusionIndex >= 0) {
            const newExclusions = [...habitualExclusions];
            newExclusions.splice(exclusionIndex, 1);
            setHabitualExclusions(newExclusions);
            return;
          } else {
            setHabitualExclusions([...habitualExclusions, { date, programName, role }]);
            return;
          }
        }
      }

          const amount = getProgramRate(programName, role, roleConfig.level);
          setWorkLogs([...workLogs, {
              id: Date.now().toString() + Math.random(),
              userId,
              role,
              programName,
              date,
              amount
          }]);
      }
  };

  const calculateTotalPayment = (dates: string[]) => {
    if (!userPaymentConfig || !currentUser) return { periodTotal: 0, monthTotal: 0, calculatedUntil: 0 };
    
    const userId = currentUser.username;
    const today = new Date();
    const currentMonth = formatDateToISO(today).slice(0, 7);
    const currentDay = today.getDate();

    let periodTotal = 0;
    let monthTotal = 0;

    // 1. Calculate from manual workLogs
    workLogs.forEach(log => {
      if (log.userId === userId && userPaymentConfig.roles.some(r => r.role === log.role)) {
        if (dates.includes(log.date)) {
          periodTotal += log.amount;
        }
        if (log.date.startsWith(currentMonth)) {
          monthTotal += log.amount;
        }
      }
    });

    // 2. Calculate from Habitualidad
    if (habitualMode) {
      const logsSet = new Set(workLogs.filter(l => l.userId === userId).map(l => `${l.date}|${l.programName}|${l.role}`));
      
      // We need to check all programs in catalog for each user role
      userPaymentConfig.roles.forEach(role => {
        catalogo.forEach(prog => {
          const { isHabitual } = getHabitualStatus(prog.name, role.role, ""); // Check if habitual for this role
          if (!isHabitual) return;

          const ficha = fichas.find(f => normalize(f.name) === normalize(prog.name) || normalize(f.name).includes(normalize(prog.name)) || normalize(prog.name).includes(normalize(f.name)));

          const amount = getProgramRate(prog.name, role.role, role.level);

          // Check dates from Day 1 to Day-1 of current month
          for (let i = 1; i < currentDay; i++) {
            const d = new Date(today.getFullYear(), today.getMonth(), i, 12, 0, 0);
            const dateStr = formatDateToISO(d);
            
            if (ficha ? isProgramOnDay(ficha, dateStr) : true) {
              const { isAutoMarked } = getHabitualStatus(prog.name, role.role, dateStr);
              
              if (isAutoMarked && !logsSet.has(`${dateStr}|${prog.name}|${role.role}`)) {
                if (dates.includes(dateStr)) {
                  periodTotal += amount;
                }
                monthTotal += amount;
              }
            }
          }
        });
      });
    }

    return { periodTotal, monthTotal, calculatedUntil: currentDay - 1 };
  };

  const calculateTax = React.useCallback((amount: number) => {
      // 1. 5% Initial Deduction (Social Security)
      const tax5Percent = amount * 0.05;
      const baseAmount = amount - tax5Percent;

      // 2. Personal Income Tax Scale on Base Amount
      let scaleTax = 0;

      if (baseAmount > 3260) {
          if (baseAmount <= 9510) {
              // Only 3% bracket on the excess over 3260
              scaleTax = (baseAmount - 3260) * 0.03;
          } else {
              // Full 3% bracket (3260 to 9510) + 5% on excess over 9510
              const firstBracketTax = (9510 - 3260) * 0.03; // 187.5
              const secondBracketTax = (baseAmount - 9510) * 0.05;
              scaleTax = firstBracketTax + secondBracketTax;
          }
      }

      return tax5Percent + scaleTax;
  }, []);

  const handleSaveHabitualSelection = () => {
      if (!currentUser || !userPaymentConfig) return;
      
      const { monthTotal } = calculateTotalPayment([]);
      const tax = calculateTax(monthTotal);
      const netAmount = monthTotal - tax;
      const currentMonth = formatDateToISO(new Date()).slice(0, 7);

      setDialog({
          isOpen: true,
          title: 'Confirmar Guardado',
          message: `¿Desea guardar la selección habitual actual?\n\nAcumulado Bruto: $${monthTotal.toFixed(2)}\nImpuestos: $${tax.toFixed(2)}\nNeto a Pagar: $${netAmount.toFixed(2)}\n\nEsto consolidará los datos y reiniciará el ciclo de cálculo.`,
          type: 'confirm',
          onConfirm: () => {
              const newConsolidation: ConsolidatedPayment = {
                  id: Date.now().toString(),
                  userId: currentUser.username,
                  month: currentMonth,
                  amount: netAmount,
                  grossAmount: monthTotal,
                  taxAmount: tax,
                  dateConsolidated: new Date().toISOString()
              };
              setConsolidatedPayments([...consolidatedPayments, newConsolidation]);
              // Clear exclusions and logs for this month
              setHabitualExclusions([]);
              const newLogs = workLogs.filter(l => !(l.userId === currentUser.username && l.date.startsWith(currentMonth)));
              setWorkLogs(newLogs);
              setDialog({ isOpen: true, title: 'Éxito', message: 'Selección guardada y consolidada exitosamente.', type: 'alert' });
          }
      });
  };

  const handleExportPaymentsDOCX = async () => {
      if (!currentUser || !userPaymentConfig) return;
      
      const { monthTotal } = calculateTotalPayment([]);
      const tax = calculateTax(monthTotal);
      const netAmount = monthTotal - tax;
      const currentMonth = formatDateToISO(new Date()).slice(0, 7);

      const doc = new Document({
          sections: [{
              properties: {},
              children: [
                  new Paragraph({
                      children: [
                          new TextRun({
                              text: "REPORTE DE PAGOS - CMNL",
                              bold: true,
                              size: 32,
                          }),
                      ],
                      alignment: AlignmentType.CENTER,
                  }),
                  new Paragraph({ text: "" }),
                  new Paragraph({
                      children: [
                          new TextRun({ text: `Usuario: `, bold: true }),
                          new TextRun({ text: currentUser.name }),
                      ],
                  }),
                  new Paragraph({
                      children: [
                          new TextRun({ text: `Mes: `, bold: true }),
                          new TextRun({ text: currentMonth }),
                      ],
                  }),
                  new Paragraph({
                      children: [
                          new TextRun({ text: `Fecha de Generación: `, bold: true }),
                          new TextRun({ text: new Date().toLocaleDateString() }),
                      ],
                  }),
                  new Paragraph({ text: "" }),
                  new Paragraph({
                      children: [
                          new TextRun({ text: "RESUMEN FINANCIERO", bold: true, size: 24 }),
                      ],
                  }),
                  new Paragraph({ text: "" }),
                  new Table({
                      width: { size: 100, type: WidthType.PERCENTAGE },
                      rows: [
                          new TableRow({
                              children: [
                                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Concepto", bold: true })] })] }),
                                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Monto", bold: true })] })] }),
                              ],
                          }),
                          new TableRow({
                              children: [
                                  new TableCell({ children: [new Paragraph("Acumulado Bruto")] }),
                                  new TableCell({ children: [new Paragraph(`$${monthTotal.toFixed(2)}`)] }),
                              ],
                          }),
                          new TableRow({
                              children: [
                                  new TableCell({ children: [new Paragraph("Impuestos (Deducciones)")] }),
                                  new TableCell({ children: [new Paragraph(`-$${tax.toFixed(2)}`)] }),
                              ],
                          }),
                          new TableRow({
                              children: [
                                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total a Pagar (Neto)", bold: true })] })] }),
                                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `$${netAmount.toFixed(2)}`, bold: true })] })] }),
                              ],
                          }),
                      ],
                  }),
                  new Paragraph({ text: "" }),
                  new Paragraph({
                      children: [
                          new TextRun({ text: "Roles y Especialidades:", bold: true }),
                      ],
                  }),
                  ...userPaymentConfig.roles.map(role => new Paragraph({
                      children: [
                          new TextRun({ text: `• ${role.role}: `, bold: true }),
                          new TextRun({ text: role.level }),
                      ],
                  })),
                  new Paragraph({ text: "" }),
                  new Paragraph({
                      children: [
                          new TextRun({
                              text: "Este documento es un comprobante de cálculo generado por el sistema CMNL.",
                              italics: true,
                              size: 16,
                          }),
                      ],
                      alignment: AlignmentType.CENTER,
                  }),
              ],
          }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Reporte_Pagos_${currentUser.username}_${currentMonth}.docx`);
  };

  const consolidateMonth = async () => {
      if (!currentUser || !userPaymentConfig) return;
      
      // Calculate the previous month relative to today
      const today = new Date();
      const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevMonth = prevMonthDate.toISOString().slice(0, 7); // YYYY-MM
      
      // Check if already consolidated
      if (consolidatedPayments.some(c => c.userId === currentUser.username && c.month === prevMonth)) {
          setDialog({ isOpen: true, title: 'Acción no permitida', message: `El mes de ${prevMonth} ya ha sido consolidado.`, type: 'alert' });
          return;
      }

      // Calculate total for the previous month
      let monthTotal = workLogs
          .filter(l => l.userId === currentUser.username && l.date.startsWith(prevMonth) && userPaymentConfig.roles.some(r => r.role === l.role))
          .reduce((acc, log) => acc + log.amount, 0);

      if (monthTotal === 0) {
          setDialog({ isOpen: true, title: 'Sin datos', message: `No hay pagos registrados para consolidar en el mes de ${prevMonth}.`, type: 'alert' });
          return;
      }

      // Add other payments


      const tax = calculateTax(monthTotal);
      const netAmount = monthTotal - tax;

      setDialog({
          isOpen: true,
          title: 'Confirmar Consolidación',
          message: `¿Desea consolidar el mes de ${prevMonth}?\n\nMonto Bruto: $${monthTotal.toFixed(2)}\nImpuestos: $${tax.toFixed(2)}\nNeto a Pagar: $${netAmount.toFixed(2)}\n\nEsta acción guardará la cifra definitiva y limpiará los registros de ese mes.`,
          type: 'confirm',
          onConfirm: () => {
              const newConsolidation: ConsolidatedPayment = {
                  id: Date.now().toString(),
                  userId: currentUser.username,
                  month: prevMonth,
                  amount: netAmount,
                  grossAmount: monthTotal,
                  taxAmount: tax,
                  dateConsolidated: new Date().toISOString()
              };
              setConsolidatedPayments([...consolidatedPayments, newConsolidation]);
              // Clear work logs for the consolidated month
              const newLogs = workLogs.filter(l => !(l.userId === currentUser.username && l.date.startsWith(prevMonth)));
              setWorkLogs(newLogs);
              setDialog({ isOpen: true, title: 'Éxito', message: `Mes de ${prevMonth} consolidado exitosamente.`, type: 'alert' });
          }
      });
  };

  const clearMonth = () => {
      if (!currentUser) return;
      const currentMonth = formatDateToISO(parseLocalDate(workLogDate)).slice(0, 7); // YYYY-MM
      
      setDialog({
          isOpen: true,
          title: 'Confirmar Eliminación',
          message: `¿Está seguro de que desea eliminar todos los registros del mes de ${currentMonth}? Esta acción no se puede deshacer.`,
          type: 'confirm',
          onConfirm: () => {
              const newLogs = workLogs.filter(l => !(l.userId === currentUser.username && l.date.startsWith(currentMonth)));
              setWorkLogs(newLogs);
              setDialog({ isOpen: true, title: 'Éxito', message: `Registros del mes de ${currentMonth} eliminados.`, type: 'alert' });
          }
      });
  };

  const handleBackNavigation = () => {
      if (activeSection) {
          setActiveSection(null);
          window.history.pushState(null, '', '#menu');
      } else {
          onBack();
      }
  };




  // Render Pagos Section
  if (activeSection === 'transmision') {
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const [targetYear, targetMonthPlusOne] = selectedMonth.split('-').map(Number);
      const targetMonth = targetMonthPlusOne - 1; // 0-indexed month
      const isPast = selectedMonth < currentMonthStr;
      const isFuture = selectedMonth > currentMonthStr;

      const targetMonthString = selectedMonth;

      const emptyBreakdownObj: TransmissionBreakdown = { informativos: 0, boletines: 0, publicidad: 0, educativos: 0, orientacion: 0, cienciaTecnica: 0, variados: 0, historicosGrabado: 0, variadoInfantilGrabado: 0, dramatizados: 0, literaturaArte: 0, musicales: 0, deportivos: 0, reposiciones: 0, total: 0 };

      const accumulated = isFuture 
          ? { breakdown: emptyBreakdownObj }
          : isPast
              ? getMonthlyTotalData(targetMonth, targetYear, transmissionConfig)
              : getAccumulatedData(now, transmissionConfig);
          
      const monthly = getMonthlyTotalData(targetMonth, targetYear, transmissionConfig);

      const categories: (keyof TransmissionBreakdown)[] = [
          'informativos', 'boletines', 'publicidad', 'educativos', 'orientacion', 
          'cienciaTecnica', 'variados', 'variadoInfantilGrabado', 'historicosGrabado', 
          'dramatizados', 'literaturaArte', 'musicales', 'deportivos', 'reposiciones'
      ];

      const groups = [
          {
              name: 'Información',
              categories: ['informativos', 'boletines'] as (keyof TransmissionBreakdown)[]
          },
          {
              name: 'Orientación',
              categories: ['publicidad', 'educativos', 'orientacion', 'cienciaTecnica', 'variados', 'variadoInfantilGrabado'] as (keyof TransmissionBreakdown)[]
          },
          {
              name: 'Cultura',
              categories: ['historicosGrabado', 'dramatizados', 'literaturaArte'] as (keyof TransmissionBreakdown)[]
          },
          {
              name: 'Música',
              categories: ['musicales'] as (keyof TransmissionBreakdown)[]
          },
          {
              name: 'Deportes',
              categories: ['deportivos'] as (keyof TransmissionBreakdown)[]
          },
          {
              name: 'Reposiciones',
              categories: ['reposiciones'] as (keyof TransmissionBreakdown)[]
          }
      ];

      const categoryLabels: Record<keyof TransmissionBreakdown, string> = {
          informativos: 'Espacios informativos',
          boletines: 'Boletines informativos',
          publicidad: 'Publicidad',
          educativos: 'Espacios Educativos',
          orientacion: 'Espacios de Orientación',
          cienciaTecnica: 'Espacios de Ciencia y Técnica',
          variados: 'Espacios Variados',
          variadoInfantilGrabado: 'Espacio Variado Infantil',
          historicosGrabado: 'Espacios Históricos',
          dramatizados: 'Espacios Dramatizados',
          literaturaArte: 'Espacios de Literatura y Arte',
          musicales: 'Espacios musicales',
          deportivos: 'Espacios deportivos',
          reposiciones: 'Reposiciones',
          total: 'Total'
      };

      const currentMonthInterruptions = interruptions.filter(i => {
          if (!i.date) return false;
          return i.date.startsWith(targetMonthString);
      });

      const interruptionsByCategory = categories.reduce((acc, cat) => {
          acc[cat] = currentMonthInterruptions
              .filter(i => i.category === cat)
              .reduce((sum, i) => sum + (Number(i.affectedMinutes) || 0), 0);
          return acc;
      }, {} as Record<keyof TransmissionBreakdown, number>);
      
      // Calculate total interruptions by summing ALL interruptions, regardless of category mapping
      interruptionsByCategory.total = currentMonthInterruptions
          .reduce((sum, i) => sum + (Number(i.affectedMinutes) || 0), 0);

      const isEditingHistorical = !!historicalEditData;
      const displayAccumulated = isEditingHistorical ? historicalEditData.accumulated : accumulated.breakdown;
      const displayInterruptions = isEditingHistorical ? historicalEditData.interruptions : interruptionsByCategory;
      const displayMonthly = isEditingHistorical ? historicalEditData.accumulated : monthly.breakdown;
      const displayMonthlyHours = isEditingHistorical ? historicalEditData.accumulated.total / 60 : monthly.hours;

      const renderCategoryLabel = (cat: keyof TransmissionBreakdown) => {
          if (cat === 'publicidad') return <span className="flex items-center">Publicidad<sup className="text-red-600 text-[10px] font-bold ml-1">GRABADO</sup></span>;
          if (cat === 'historicosGrabado') return <span className="flex items-center">Histórico<sup className="text-red-600 text-[10px] font-bold ml-1">GRABADO</sup></span>;
          if (cat === 'variadoInfantilGrabado') return <span className="flex items-center">Variado/Infantil<sup className="text-red-600 text-[10px] font-bold ml-1">GRABADO</sup></span>;
          return categoryLabels[cat];
      };

      const handleSaveCategoryEdit = () => {
          if (editingCategory) {
              const newConfig = { 
                  ...transmissionConfig,
                  MONDAY: { ...transmissionConfig.MONDAY },
                  TUESDAY: { ...transmissionConfig.TUESDAY },
                  WEDNESDAY: { ...transmissionConfig.WEDNESDAY },
                  THURSDAY: { ...transmissionConfig.THURSDAY },
                  FRIDAY: { ...transmissionConfig.FRIDAY },
                  SATURDAY: { ...transmissionConfig.SATURDAY },
                  SUNDAY: { ...transmissionConfig.SUNDAY },
                  categoryPrograms: { ...(transmissionConfig.categoryPrograms || {}) }
              };
              
              const selectedPrograms = categoryEditForm.programs || [];
              newConfig.categoryPrograms[editingCategory] = selectedPrograms;

              saveDayMinutesConfig(newConfig);
              setTransmissionConfig(newConfig);
              setEditingCategory(null);
          }
      };

      const handleOpenConsolidateModal = () => {
          setShowConsolidateModal(true);
      };

      const handleConsolidate = () => {
          const newConsolidated: ConsolidatedMonth = {
              id: Date.now().toString(),
              month: targetMonthString,
              accumulated: accumulated.breakdown,
              interruptions: interruptionsByCategory,
              totalRealMinutes: accumulated.breakdown.total - interruptionsByCategory.total,
              dateConsolidated: new Date().toISOString(),
              interruptionDetails: currentMonthInterruptions
          };
          
          const existingIndex = consolidatedMonths.findIndex(m => m.month === targetMonthString);
          if (existingIndex >= 0) {
              const updated = [...consolidatedMonths];
              updated[existingIndex] = { ...newConsolidated, id: updated[existingIndex].id };
              setConsolidatedMonths(updated);
          } else {
              setConsolidatedMonths([...consolidatedMonths, newConsolidated]);
          }
          
          setShowConsolidateModal(false);
      };

      const formatMinutesToHHMMSS = (totalMinutes: number) => {
          const h = Math.floor(totalMinutes / 60);
          const m = Math.floor(totalMinutes % 60);
          return `${h}:${m.toString().padStart(2, '0')}:00`;
      };

      const getExportDataRows = (monthData: ConsolidatedMonth) => {
          const getPlanned = (cat: keyof TransmissionBreakdown) => monthData.accumulated[cat] || 0;

          const rows = [
              // Información
              { group: 'Información', isGroup: true, plannedTotal: getPlanned('informativos') + getPlanned('boletines'), plannedVivo: getPlanned('informativos') + getPlanned('boletines'), plannedGrabado: 0 },
              { name: 'Espacios informativos', plannedTotal: getPlanned('informativos'), plannedVivo: getPlanned('informativos'), plannedGrabado: 0 },
              { name: 'Boletines informativos', plannedTotal: getPlanned('boletines'), plannedVivo: getPlanned('boletines'), plannedGrabado: 0 },
              
              // Orientación
              { group: 'Orientación', isGroup: true, plannedTotal: getPlanned('publicidad') + getPlanned('educativos') + getPlanned('orientacion') + getPlanned('cienciaTecnica') + getPlanned('variados') + getPlanned('variadoInfantilGrabado'), plannedVivo: getPlanned('educativos') + getPlanned('orientacion') + getPlanned('cienciaTecnica') + getPlanned('variados'), plannedGrabado: getPlanned('publicidad') + getPlanned('variadoInfantilGrabado') },
              { name: 'Publicidad', plannedTotal: getPlanned('publicidad'), plannedVivo: 0, plannedGrabado: getPlanned('publicidad') },
              { name: 'Espacios Educativos', plannedTotal: getPlanned('educativos'), plannedVivo: getPlanned('educativos'), plannedGrabado: 0 },
              { name: 'Espacios de Orientación', plannedTotal: getPlanned('orientacion'), plannedVivo: getPlanned('orientacion'), plannedGrabado: 0 },
              { name: 'Espacios de Ciencia y Técnica', plannedTotal: getPlanned('cienciaTecnica'), plannedVivo: getPlanned('cienciaTecnica'), plannedGrabado: 0 },
              { name: 'Espacios Variados', plannedTotal: getPlanned('variados') + getPlanned('variadoInfantilGrabado'), plannedVivo: getPlanned('variados'), plannedGrabado: getPlanned('variadoInfantilGrabado') },
              
              // Cultura
              { group: 'Cultura', isGroup: true, plannedTotal: getPlanned('historicosGrabado') + getPlanned('dramatizados') + getPlanned('literaturaArte'), plannedVivo: getPlanned('literaturaArte'), plannedGrabado: getPlanned('historicosGrabado') + getPlanned('dramatizados') },
              { name: 'Espacios Históricos', plannedTotal: getPlanned('historicosGrabado'), plannedVivo: 0, plannedGrabado: getPlanned('historicosGrabado') },
              { name: 'Espacios Dramatizados', plannedTotal: getPlanned('dramatizados'), plannedVivo: 0, plannedGrabado: getPlanned('dramatizados') },
              { name: 'Espacios de Literatura y Arte', plannedTotal: getPlanned('literaturaArte'), plannedVivo: getPlanned('literaturaArte'), plannedGrabado: 0 },
              
              // Música
              { group: 'Música', isGroup: true, plannedTotal: getPlanned('musicales'), plannedVivo: getPlanned('musicales'), plannedGrabado: 0 },
              { name: 'Espacios musicales', plannedTotal: getPlanned('musicales'), plannedVivo: getPlanned('musicales'), plannedGrabado: 0 },
              
              // Deportes
              { group: 'Deportes', isGroup: true, plannedTotal: getPlanned('deportivos'), plannedVivo: getPlanned('deportivos'), plannedGrabado: 0 },
              { name: 'Espacios deportivos', plannedTotal: getPlanned('deportivos'), plannedVivo: getPlanned('deportivos'), plannedGrabado: 0 },
              
              // Reposiciones
              { group: 'Reposiciones', isGroup: true, plannedTotal: getPlanned('reposiciones'), plannedVivo: 0, plannedGrabado: getPlanned('reposiciones') },
              { name: 'Reposiciones', plannedTotal: getPlanned('reposiciones'), plannedVivo: 0, plannedGrabado: getPlanned('reposiciones') },
          ];

          const [year, month] = monthData.month.split('-').map(Number);
          const daysInMonth = new Date(year, month, 0).getDate();
          const targetTotalPlanificado = (daysInMonth === 31 ? 248 : 240) * 60;
          
          const totalPlannedVivo = rows.filter(r => r.isGroup).reduce((sum, r) => sum + r.plannedVivo, 0);
          const totalPlannedGrabado = rows.filter(r => r.isGroup).reduce((sum, r) => sum + r.plannedGrabado, 0);
          
          // Requirement 5: D30 + E30 = C30
          // We use the targetTotalPlanificado for C30.
          // We'll use the actual sums for D30 and E30, but if they don't match C30, 
          // we'll adjust the Grabado part to ensure the math works as requested.
          const adjustedTotalPlannedGrabado = targetTotalPlanificado - totalPlannedVivo;

          return { 
              rows, 
              totalPlanificado: targetTotalPlanificado, 
              totalVivo: totalPlannedVivo, 
              totalGrabado: adjustedTotalPlannedGrabado 
          };
      };

      const exportToExcel = (monthData: ConsolidatedMonth) => {
          const { rows: allRows, totalPlanificado, totalVivo, totalGrabado } = getExportDataRows(monthData);
          
          // Filter rows to fit exactly 18 rows before TOTALES (Row 29)
          // We remove the redundant "Reposiciones" subcategory if it exists
          const rows = allRows.filter((r, i) => !(r.name === 'Reposiciones' && allRows[i-1]?.group === 'Reposiciones'));

          const [yearStr, monthNumStr] = monthData.month.split('-');
          const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
          const monthName = monthNames[parseInt(monthNumStr, 10) - 1];

          const formatMinutesToExcelTime = (totalMinutes: number) => {
              return totalMinutes / (24 * 60);
          };

          const wsData: any[][] = [];
          
          // Row 1 (Empty)
          wsData.push([]);
          // Row 2
          wsData.push(["", "INFORME DE INDICADORES GENERALES DE LA RADIO CUBANA", "", "", "", "", "", ""]);
          // Row 3
          wsData.push(["", "NIVEL DE ACTIVIDAD", "", "", "", "", "", ""]);
          // Row 4 (Empty)
          wsData.push([]);
          // Row 5
          wsData.push(["", "NOMBRE DE LA EMISORA:", "RADIO CIUDAD MONUMENTO", "", "", "MES:", monthName, ""]);
          // Row 6
          wsData.push(["", "ALCANCE:", "MUNICIPAL", "", "", "AÑO:", yearStr, ""]);
          // Row 7
          wsData.push(["", "PROVINCIA:", "GRANMA", "", "", "", "", ""]);
          // Row 8
          wsData.push(["", "PLAN ANUAL (Horas):", "________", "", "", "H. Diarias:", formatMinutesToExcelTime(8 * 60), ""]);
          // Row 9 (Empty)
          wsData.push([]);
          // Row 10 (Headers)
          wsData.push(["GRUPO DE PROGRAMAS", "Horas emisión", "En vivo", "Grabado", "OBSERVACIONES", "", "", ""]);

          // Group interruptions by event
          const interruptionEvents = (monthData.interruptionDetails || []).reduce((acc, curr) => {
              const datePart = curr.date || '0000-00-00';
              const startPart = curr.startTime || '00:00';
              const endPart = curr.endTime || '00:00';
              const key = `${datePart}_${startPart}_${endPart}`;
              if (!acc[key]) {
                  acc[key] = {
                      day: datePart.split('-')[2] || '??',
                      programs: [],
                      duration: 0
                  };
              }
              if (!acc[key].programs.includes(curr.programName)) {
                  acc[key].programs.push(curr.programName);
              }
              // Sum affected minutes for all programs in this event
              acc[key].duration += Number(curr.affectedMinutes) || 0;
              return acc;
          }, {} as Record<string, { day: string, programs: string[], duration: number }>);

          const sortedEvents = Object.values(interruptionEvents).sort((a, b) => parseInt(a.day) - parseInt(b.day));
          const totalInterruptionMinutes = sortedEvents.reduce((sum, e) => sum + e.duration, 0);

          // Populate table rows 11 to 28
          rows.forEach((row, index) => {
              const excelRowIdx = index + 11;
              const rowData: any[] = [];
              
              // Columns A, B, C, D (Program Data)
              if (row.isGroup) {
                  rowData.push(row.group);
              } else {
                  rowData.push(`  ${row.name}`);
              }
              rowData.push(formatMinutesToExcelTime(row.plannedTotal || 0));
              rowData.push(formatMinutesToExcelTime(row.plannedVivo || 0));
              rowData.push(formatMinutesToExcelTime(row.plannedGrabado || 0));

              // Columns E, F, G, H (Observations / Interruptions)
              if (excelRowIdx === 11) {
                  rowData.push(""); // E
                  rowData.push("Horas extras de emisión o interrupción"); // F
                  rowData.push(""); // G
                  rowData.push(""); // H
              } else if (excelRowIdx === 12) {
                  rowData.push("Día"); // E
                  rowData.push("Programas"); // F
                  rowData.push(""); // G
                  rowData.push("Duración"); // H
              } else if (excelRowIdx >= 13 && excelRowIdx <= 28) {
                  const eventIdx = excelRowIdx - 13;
                  if (eventIdx < sortedEvents.length) {
                      const event = sortedEvents[eventIdx];
                      rowData.push(event.day); // E
                      rowData.push(event.programs.join(", ")); // F
                      rowData.push(""); // G
                      rowData.push(formatMinutesToExcelTime(event.duration)); // H
                  } else {
                      rowData.push("");
                      rowData.push("");
                      rowData.push("");
                      rowData.push("");
                  }
              }

              wsData.push(rowData);
          });

          // Row 29 (TOTALES and HORAS REALMENTE TRANSMITIDAS)
          wsData.push([
              "TOTALES", 
              formatMinutesToExcelTime(totalPlanificado), 
              formatMinutesToExcelTime(totalVivo), 
              formatMinutesToExcelTime(totalGrabado),
              "HORAS REALMENTE TRANSMITIDAS", // E
              "", // F
              "", // G
              formatMinutesToExcelTime(totalPlanificado - totalInterruptionMinutes) // H
          ]);

          // Footer rows 30 to 45
          wsData.push(["", "Cumplimiento del plan:", "", "", "Sobrecumplimiento:", "", "", ""]); // 30
          wsData.push([]); // 31
          wsData.push(["", "Observaciones:", "", "", "", "", "", ""]); // 32
          // Add empty rows for observations box (33-40)
          for (let i = 0; i < 8; i++) wsData.push([]);
          wsData.push([]); // 41
          wsData.push([]); // 42
          wsData.push(["", "Elaborado por:", "Beatriz González Rondón", "", "", "", "", ""]); // 43
          wsData.push(["", "Visto bueno:", "Leipzig del Carmen Vázquez García", "", "", "", "", ""]); // 44

          const ws = XLSX.utils.aoa_to_sheet(wsData);

          // Merges
          ws['!merges'] = [
              { s: { r: 1, c: 1 }, e: { r: 1, c: 7 } }, // Title 1
              { s: { r: 2, c: 1 }, e: { r: 2, c: 7 } }, // Title 2
              { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } }, // Emisora
              { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } }, // Mes
              { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } }, // Alcance
              { s: { r: 5, c: 6 }, e: { r: 5, c: 7 } }, // Año
              { s: { r: 6, c: 2 }, e: { r: 6, c: 3 } }, // Provincia
              { s: { r: 7, c: 2 }, e: { r: 7, c: 3 } }, // Plan Anual
              { s: { r: 7, c: 6 }, e: { r: 7, c: 7 } }, // H. Diarias
              { s: { r: 9, c: 4 }, e: { r: 9, c: 7 } }, // Header OBSERVACIONES
              { s: { r: 10, c: 5 }, e: { r: 10, c: 7 } }, // Horas extras...
              { s: { r: 11, c: 5 }, e: { r: 11, c: 6 } }, // Programas header
              { s: { r: 28, c: 4 }, e: { r: 28, c: 6 } }, // HORAS REALMENTE TRANSMITIDAS label
              { s: { r: 29, c: 1 }, e: { r: 29, c: 2 } }, // Cumplimiento
              { s: { r: 29, c: 4 }, e: { r: 29, c: 7 } }, // Sobrecumplimiento
              { s: { r: 32, c: 2 }, e: { r: 39, c: 7 } }, // Observaciones box
              { s: { r: 42, c: 2 }, e: { r: 42, c: 5 } }, // Elaborado
              { s: { r: 43, c: 2 }, e: { r: 43, c: 5 } }, // Visto bueno
          ];

          // Add Programas merges for data rows
          for (let i = 12; i <= 27; i++) {
              ws['!merges'].push({ s: { r: i, c: 5 }, e: { r: i, c: 6 } });
          }

          const titleStyle = { font: { bold: true, sz: 11 }, alignment: { horizontal: "center" } };
          const boldStyle = { font: { bold: true } };
          const borderStyle = {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" }
          };
          const headerStyle = { font: { bold: true }, alignment: { horizontal: "center", vertical: "center" }, border: borderStyle };
          const timeFormat = "[h]:mm:ss";
          const cellStyle = { border: borderStyle, alignment: { horizontal: "center" }, numFmt: timeFormat };
          const leftCellStyle = { border: borderStyle, alignment: { horizontal: "left" } };
          const boldCellStyle = { font: { bold: true }, border: borderStyle, alignment: { horizontal: "center" }, numFmt: timeFormat };
          const boldLeftCellStyle = { font: { bold: true }, border: borderStyle, alignment: { horizontal: "left" } };

          const range = XLSX.utils.decode_range(ws['!ref'] || "A1:H50");
          for (let R = range.s.r; R <= range.e.r; ++R) {
              for (let C = range.s.c; C <= range.e.c; ++C) {
                  const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
                  if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };

                  if (R === 1 || R === 2) {
                      ws[cellRef].s = titleStyle;
                  } else if (R >= 4 && R <= 7) {
                      if (C === 1 || C === 5) ws[cellRef].s = { alignment: { horizontal: "right" } };
                      if (C === 2 || C === 6) ws[cellRef].s = boldStyle;
                      if (R === 7 && C === 6) {
                          ws[cellRef].t = 'n';
                          ws[cellRef].z = timeFormat;
                          ws[cellRef].s = { ...boldStyle, numFmt: timeFormat };
                      }
                  } else if (R === 9) {
                      if (C <= 7) ws[cellRef].s = headerStyle;
                  } else if (R >= 10 && R <= 27) {
                      const isGroup = wsData[R] && wsData[R][0] && !wsData[R][0].toString().startsWith('  ');
                      if (C === 0) {
                          ws[cellRef].s = isGroup ? boldLeftCellStyle : leftCellStyle;
                      } else if (C >= 1 && C <= 3) {
                          ws[cellRef].t = 'n';
                          ws[cellRef].z = timeFormat;
                          ws[cellRef].s = isGroup ? boldCellStyle : cellStyle;
                      } else if (C >= 4 && C <= 7) {
                          ws[cellRef].s = { border: borderStyle, alignment: { horizontal: "center" } };
                          if (R === 10 && C >= 5) ws[cellRef].s = { font: { bold: true }, border: borderStyle, alignment: { horizontal: "center" } };
                          if (R === 11) ws[cellRef].s = { font: { bold: true }, border: borderStyle, alignment: { horizontal: "center" } };
                          if (R >= 12 && C === 7) {
                              ws[cellRef].t = 'n';
                              ws[cellRef].z = timeFormat;
                              ws[cellRef].s = { border: borderStyle, alignment: { horizontal: "center" }, numFmt: timeFormat };
                          }
                      }
                  } else if (R === 28) { // TOTALES row
                      if (C === 0) ws[cellRef].s = boldLeftCellStyle;
                      else if (C >= 1 && C <= 3) {
                          ws[cellRef].t = 'n';
                          ws[cellRef].z = timeFormat;
                          ws[cellRef].s = boldCellStyle;
                      } else if (C >= 4 && C <= 7) {
                          ws[cellRef].s = { font: { bold: true }, border: borderStyle, alignment: { horizontal: "center" } };
                          if (C === 7) {
                              ws[cellRef].t = 'n';
                              ws[cellRef].z = timeFormat;
                              ws[cellRef].s = boldCellStyle;
                          }
                      }
                  } else if (R === 29 || R === 42 || R === 43) {
                      if (C === 1) ws[cellRef].s = { font: { bold: true }, alignment: { horizontal: "right" } };
                  } else if (R === 31) {
                      if (C === 1) ws[cellRef].s = boldStyle;
                  } else if (R >= 32 && R <= 39) {
                      if (C >= 2 && C <= 7) {
                          ws[cellRef].s = { border: borderStyle, alignment: { vertical: "top", wrapText: true } };
                      }
                  }
              }
          }

          ws['!cols'] = [
              { wch: 30 }, // A
              { wch: 15 }, // B
              { wch: 15 }, // C
              { wch: 15 }, // D
              { wch: 10 }, // E
              { wch: 20 }, // F
              { wch: 20 }, // G
              { wch: 15 }, // H
          ];

          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Transmisión");
          
          const fileName = `Transmision_${monthData.month}.xlsx`;
          XLSX.writeFile(wb, fileName);
      };

      const exportToWord = async (monthData: ConsolidatedMonth) => {
          const createCell = (text: string, bold: boolean = false, align: any = AlignmentType.CENTER) => new TableCell({
              children: [new Paragraph({
                  alignment: align,
                  children: [new TextRun({ text, font: "Arial", size: 22, bold })]
              })],
              verticalAlign: "center",
          });

          const { rows, totalPlanificado, totalVivo, totalGrabado } = getExportDataRows(monthData);

          const tableRows = [
              new TableRow({
                  children: [
                      createCell("GRUPO DE PROGRAMAS", true),
                      createCell("Total horas emisión", true),
                      createCell("En vivo", true),
                      createCell("Grabado", true),
                      createCell("OBSERVACIONES", true),
                  ],
              }),
              ...rows.map(row => new TableRow({
                  children: [
                      createCell(row.isGroup ? (row.group || '') : `    ${row.name}`, row.isGroup, row.isGroup ? AlignmentType.LEFT : AlignmentType.LEFT),
                      createCell(formatMinutesToHHMMSS(row.plannedTotal), row.isGroup),
                      createCell(formatMinutesToHHMMSS(row.plannedVivo), row.isGroup),
                      createCell(formatMinutesToHHMMSS(row.plannedGrabado), row.isGroup),
                      createCell(""),
                  ],
              })),
              new TableRow({
                  children: [
                      createCell("Total Planificado:", true, AlignmentType.RIGHT),
                      createCell(formatMinutesToHHMMSS(totalPlanificado), true),
                      createCell("", true),
                      createCell("", true),
                      createCell(""),
                  ],
              }),
              new TableRow({
                  children: [
                      createCell("Interrupciones:", true, AlignmentType.RIGHT),
                      createCell(formatMinutesToHHMMSS(monthData.interruptions.total), true),
                      createCell("", true),
                      createCell("", true),
                      createCell(""),
                  ],
              }),
              new TableRow({
                  children: [
                      createCell("Total Real Transmisión:", true, AlignmentType.RIGHT),
                      createCell(formatMinutesToHHMMSS(totalPlanificado - monthData.interruptions.total), true),
                      createCell(formatMinutesToHHMMSS(totalVivo), true),
                      createCell(formatMinutesToHHMMSS(totalGrabado), true),
                      createCell(""),
                  ],
              })
          ];

          const doc = new Document({
              sections: [{
                  properties: {},
                  children: [
                      new Paragraph({
                          alignment: AlignmentType.CENTER,
                          spacing: { after: 400 },
                          children: [new TextRun({ text: `Reporte de Transmisión - ${monthData.month}`, font: "Arial", size: 26, bold: true })]
                      }),
                      new Table({ 
                          rows: tableRows,
                          alignment: AlignmentType.CENTER,
                          width: { size: 100, type: WidthType.PERCENTAGE }
                      }),
                  ],
              }],
          });

          const blob = await Packer.toBlob(doc);
          saveAs(blob, `Transmision_${monthData.month}.docx`);
      };

      const handleAddManualMonth = () => {
          const monthlyData = getMonthlyTotalData(manualMonth, manualYear, transmissionConfig);
          const scheduledMinutes = monthlyData.breakdown.total;
          const realMinutes = scheduledMinutes - manualInterruptions;
          
          const monthStr = `${manualYear}-${String(manualMonth + 1).padStart(2, '0')}`;
          
          if (consolidatedMonths.some(m => m.month === monthStr)) {
              alert("Este mes ya ha sido consolidado.");
              return;
          }

          const emptyBreakdown: TransmissionBreakdown = {
              informativos: 0,
              boletines: 0,
              publicidad: 0,
              educativos: 0,
              orientacion: 0,
              cienciaTecnica: 0,
              variados: 0,
              historicosGrabado: 0,
              variadoInfantilGrabado: 0,
              dramatizados: 0,
              literaturaArte: 0,
              musicales: 0,
              deportivos: 0,
              reposiciones: 0,
              total: manualInterruptions
          };

          const newConsolidated: ConsolidatedMonth = {
              id: Date.now().toString(),
              month: monthStr,
              accumulated: monthlyData.breakdown,
              interruptions: emptyBreakdown,
              totalRealMinutes: realMinutes,
              dateConsolidated: new Date().toISOString(),
              interruptionDetails: []
          };
          setConsolidatedMonths([...consolidatedMonths, newConsolidated]);
          alert("Mes histórico añadido correctamente.");
      };

      const handleDeleteConsolidatedMonth = (id: string) => {
          setItemToDelete(id);
      };

      const handleEditHistoricalMonth = (month: ConsolidatedMonth) => {
          setEditingHistoricalMonthId(month.id);
          setHistoricalEditData(JSON.parse(JSON.stringify(month))); // Deep copy
          setShowAccumulatedMonths(false);
      };

      const handleCancelHistoricalEdit = () => {
          setEditingHistoricalMonthId(null);
          setHistoricalEditData(null);
          setShowAccumulatedMonths(true);
      };

      const handleSaveHistoricalEdit = () => {
          if (!historicalEditData) return;
          setConsolidatedMonths(prev => prev.map(m => m.id === historicalEditData.id ? historicalEditData : m));
          setEditingHistoricalMonthId(null);
          setHistoricalEditData(null);
          setShowAccumulatedMonths(true);
      };

      const handleHistoricalEdit = (type: 'accumulated' | 'interruptions', cat: keyof TransmissionBreakdown, value: number) => {
          if (!historicalEditData) return;
          const newData = { ...historicalEditData };
          newData[type][cat] = value;
          
          let newTotal = 0;
          const categories: (keyof TransmissionBreakdown)[] = [
              'informativos', 'boletines', 'publicidad', 'educativos', 'orientacion', 
              'cienciaTecnica', 'variados', 'variadoInfantilGrabado', 'historicosGrabado', 
              'dramatizados', 'literaturaArte', 'musicales', 'deportivos', 'reposiciones'
          ];
          categories.forEach(c => {
              newTotal += newData[type][c] || 0;
          });
          newData[type].total = newTotal;
          newData.totalRealMinutes = newData.accumulated.total - newData.interruptions.total;
          
          setHistoricalEditData(newData);
      };

      if (showAccumulatedMonths) {
          return (
              <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
                  <CMNLHeader 
                      user={currentUser ? { name: currentUser.name, role: currentUser.role } : null}
                      sectionTitle="Histórico / Evolución"
                      onMenuClick={onMenuClick}
                      onBack={() => setShowAccumulatedMonths(false)}
                  />
                  {itemToDelete && (
                      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                          <div className="bg-[#2C1B15] p-6 rounded-xl border border-[#9E7649] shadow-2xl max-w-sm w-full">
                              <h3 className="text-lg font-bold text-white mb-4">¿Confirmar eliminación?</h3>
                              <p className="text-[#E8DCCF]/70 mb-6">Esta acción no se puede deshacer.</p>
                              <div className="flex justify-end gap-4">
                                  <button 
                                      onClick={() => setItemToDelete(null)}
                                      className="px-4 py-2 text-[#E8DCCF] hover:text-white"
                                  >
                                      Cancelar
                                  </button>
                                  <button 
                                      onClick={() => {
                                          setConsolidatedMonths(prev => prev.filter(m => m.id !== itemToDelete));
                                          setItemToDelete(null);
                                      }}
                                      className="px-4 py-2 bg-red-900/40 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-900/60"
                                  >
                                      Eliminar
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}
                  <div className="p-6 max-w-6xl mx-auto w-full space-y-6">
                      {canManageGestion && (
                          <div className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 p-6 shadow-xl mb-8">
                              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                  <CalendarCheck size={20} className="text-[#9E7649]" />
                                  Registrar Mes Histórico
                              </h3>
                              <p className="text-sm text-[#E8DCCF]/60 mb-4">
                                  El sistema calculará automáticamente las horas programadas según el calendario del mes.
                              </p>
                              <div className="flex flex-wrap items-end gap-4">
                                  <div>
                                      <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Mes</label>
                                      <select 
                                          value={manualMonth} 
                                          onChange={e => setManualMonth(parseInt(e.target.value))}
                                          className="bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2.5 text-white min-w-[120px]"
                                      >
                                          {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                                              <option key={i} value={i}>{m}</option>
                                          ))}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Año</label>
                                      <input 
                                          type="number" 
                                          value={manualYear || ''} 
                                          onChange={e => setManualYear(parseInt(e.target.value) || new Date().getFullYear())} 
                                          className="w-24 bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2.5 text-white" 
                                      />
                                  </div>
                                  <div>
                                      <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Interrupciones (minutos)</label>
                                      <input 
                                          type="number" 
                                          value={manualInterruptions === 0 ? '' : manualInterruptions} 
                                          onChange={e => setManualInterruptions(parseInt(e.target.value) || 0)} 
                                          className="w-32 bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2.5 text-white" 
                                      />
                                  </div>
                                  <button 
                                      onClick={handleAddManualMonth}
                                      className="bg-[#9E7649] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-[#8B653D] transition-colors flex items-center gap-2"
                                  >
                                      <Save size={16} /> Guardar Histórico
                                  </button>
                              </div>
                          </div>
                      )}

                      <div className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 overflow-hidden shadow-xl">
                          <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                  <thead className="text-xs text-[#9E7649] uppercase bg-black/20">
                                      <tr>
                                          <th className="px-6 py-4">Mes</th>
                                          <th className="px-6 py-4 text-center">Horas Programadas</th>
                                          <th className="px-6 py-4 text-center text-red-400">Interrupciones</th>
                                          <th className="px-6 py-4 text-center text-green-400">Horas Reales Transmitidas</th>
                                          <th className="px-6 py-4 text-right">Acciones</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#9E7649]/10">
                                      {consolidatedMonths.length === 0 ? (
                                          <tr>
                                              <td colSpan={5} className="px-6 py-8 text-center text-[#E8DCCF]/50">No hay meses consolidados aún.</td>
                                          </tr>
                                      ) : (
                                          [...consolidatedMonths].sort((a, b) => b.month.localeCompare(a.month)).map(month => (
                                              <tr key={month.id} className="hover:bg-white/5 transition-colors">
                                                  <td className="px-6 py-4 font-bold text-white">{month.month}</td>
                                                  <td className="px-6 py-4 text-center font-mono text-[#E8DCCF]/50">{(month.accumulated.total / 60).toFixed(2)} h</td>
                                                  <td className="px-6 py-4 text-center font-mono text-red-400">{(month.interruptions.total / 60).toFixed(2)} h</td>
                                                  <td className="px-6 py-4 text-center font-mono text-green-400 font-bold">{(month.totalRealMinutes / 60).toFixed(2)} h</td>
                                                  <td className="px-6 py-4 text-right whitespace-nowrap">
                                                      <div className="flex justify-end gap-2">
                                                          <button onClick={() => exportToExcel(month)} className="bg-green-900/40 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-green-900/60 transition-colors">
                                                              Excel
                                                          </button>
                                                          <button onClick={() => exportToWord(month)} className="bg-blue-900/40 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-blue-900/60 transition-colors">
                                                              Word
                                                          </button>
                                                          <button onClick={() => handleEditHistoricalMonth(month)} className="bg-yellow-900/40 text-yellow-400 border border-yellow-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-yellow-900/60 transition-colors">
                                                              Editar
                                                          </button>
                                                          <button onClick={() => handleDeleteConsolidatedMonth(month.id)} className="bg-red-900/40 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs hover:bg-red-900/60 transition-colors">
                                                              Eliminar
                                                          </button>
                                                      </div>
                                                  </td>
                                              </tr>
                                          ))
                                      )}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              </div>
          );
      }

      return (
          <div className="min-h-screen bg-[#2C1B15] text-[#E8DCCF] font-display flex flex-col relative">
              <CMNLHeader 
                  user={currentUser ? { name: currentUser.name, role: currentUser.role } : null}
                  sectionTitle={isEditingHistorical ? `Editando: ${historicalEditData?.month}` : "Transmisión"}
                  onMenuClick={onMenuClick}
                  onBack={isEditingHistorical ? () => {
                      if (window.confirm('¿Desea salir sin guardar los cambios?')) {
                          handleCancelHistoricalEdit();
                      }
                  } : () => setActiveSection(null)}
              >
                  {isEditingHistorical ? (
                      <div className="flex gap-2">
                          <button 
                              onClick={handleCancelHistoricalEdit}
                              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg font-bold bg-black/20 text-[#9E7649] border border-[#9E7649]/30 hover:bg-[#9E7649]/10 transition-all"
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={handleSaveHistoricalEdit}
                              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg font-bold bg-green-600 text-white hover:bg-green-700 transition-all"
                          >
                              <Save size={16} />
                              <span className="hidden sm:inline">Guardar</span>
                          </button>
                      </div>
                  ) : (
                      <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                              {canManageGestion && (
                                  <button 
                                      onClick={() => {
                                          const [y, m] = selectedMonth.split('-').map(Number);
                                          const date = new Date(y, m - 2, 1);
                                          setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
                                      }}
                                      className="p-1 rounded hover:bg-black/20 text-[#9E7649]"
                                  >
                                      <ChevronLeft size={20} />
                                  </button>
                              )}
                              <span className="font-bold text-sm text-[#9E7649] capitalize">
                                  {new Date(targetYear, targetMonth, 2).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                              </span>
                              {canManageGestion && (
                                  <button 
                                      onClick={() => {
                                          const [y, m] = selectedMonth.split('-').map(Number);
                                          const date = new Date(y, m, 1);
                                          setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
                                      }}
                                      className="p-1 rounded hover:bg-black/20 text-[#9E7649]"
                                  >
                                      <ChevronRight size={20} />
                                  </button>
                              )}
                          </div>
                          {canManageGestion && (
                               <button 
                                   onClick={() => setShowAccumulatedMonths(true)}
                                   className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-bold bg-black/20 text-[#9E7649] border border-[#9E7649]/30 hover:bg-[#9E7649]/10 transition-all whitespace-nowrap"
                               >
                                   <Library size={14} className="sm:w-4 sm:h-4" />
                                   <span>Histórico</span>
                               </button>
                          )}
                      </div>
                  )}
              </CMNLHeader>

              <div className="p-6 max-w-6xl mx-auto w-full space-y-8">

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-[#2C1B15] to-[#3E1E16] p-6 rounded-2xl border border-[#9E7649]/20 shadow-xl">
                          <p className="text-[#9E7649] text-xs uppercase tracking-widest mb-2">Acumulado Real del Mes</p>
                          <h2 className="text-5xl font-bold text-white mb-1">{((displayAccumulated.total - displayInterruptions.total) / 60).toFixed(2)} <span className="text-xl font-normal text-[#9E7649]">h</span></h2>
                          <p className="text-xs text-[#E8DCCF]/50">
                              {isFuture
                                  ? `El mes aún no transcurre.`
                                  : isPast
                                      ? `Total final del mes de ${new Date(targetYear, targetMonth, 2).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}. Interrupciones descontadas.`
                                      : `Hasta ayer ${new Date(now.getTime() - 86400000).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}. Interrupciones descontadas.`
                              }
                          </p>
                      </div>
                      <div className="bg-gradient-to-br from-[#1A100C] to-[#2C1B15] p-6 rounded-2xl border border-[#9E7649]/10 shadow-xl">
                          <p className="text-[#9E7649] text-xs uppercase tracking-widest mb-2">Proyección Mensual</p>
                          <h2 className="text-5xl font-bold text-[#9E7649] mb-1">{displayMonthlyHours.toFixed(2)} <span className="text-xl font-normal text-[#E8DCCF]/30">h</span></h2>
                          <p className="text-xs text-[#E8DCCF]/50">Total estimado para {new Date(targetYear, targetMonth, 2).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
                      </div>
                  </div>

                  {/* Breakdown Table */}
                  <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/10 overflow-hidden shadow-2xl">
                      <div className="bg-[#3E1E16] px-6 py-4 border-b border-[#9E7649]/10 flex justify-between items-center">
                          <h3 className="text-white font-bold flex items-center gap-2">
                              <FileBarChart size={20} className="text-[#9E7649]" />
                              Desglose por Categoría (Minutos)
                          </h3>
                      </div>
                      <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                              <thead className="text-xs text-[#9E7649] uppercase bg-black/20">
                                  <tr>
                                      <th className="px-6 py-4">Categoría</th>
                                      <th className="px-6 py-4 text-center">Programado (min)</th>
                                      <th className="px-6 py-4 text-center text-red-400">Interrupciones</th>
                                      <th className="px-6 py-4 text-center text-green-400">Real (min)</th>
                                      <th className="px-6 py-4 text-right">Progreso</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-[#9E7649]/10">
                                  {groups.map(group => {
                                      const groupAccMin = group.categories.reduce((sum, cat) => sum + displayAccumulated[cat], 0);
                                      const groupIntMin = group.categories.reduce((sum, cat) => sum + displayInterruptions[cat], 0);
                                      const groupRealMin = groupAccMin - groupIntMin;
                                      const groupTotalMin = group.categories.reduce((sum, cat) => sum + displayMonthly[cat], 0);
                                      const groupPercentage = groupTotalMin > 0 ? (groupRealMin / groupTotalMin) * 100 : 0;

                                      return (
                                          <React.Fragment key={group.name}>
                                              <tr className="bg-[#3E1E16]/50 font-bold border-t-2 border-[#9E7649]/30">
                                                  <td className="px-6 py-4 text-[#9E7649] uppercase tracking-wider">{group.name}</td>
                                                  <td className="px-6 py-4 text-center font-mono text-[#E8DCCF]/80">{groupTotalMin}</td>
                                                  <td className="px-6 py-4 text-center font-mono text-red-400">{groupIntMin > 0 ? `-${groupIntMin}` : '0'}</td>
                                                  <td className="px-6 py-4 text-center font-mono text-green-400">{groupRealMin}</td>
                                                  <td className="px-6 py-4 text-right">
                                                      <div className="flex items-center justify-end gap-3">
                                                          <div className="w-24 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                                              <div 
                                                                  className="h-full bg-[#9E7649] rounded-full" 
                                                                  style={{ width: `${Math.min(groupPercentage, 100)}%` }}
                                                              />
                                                          </div>
                                                          <span className="text-[10px] font-bold text-[#9E7649] w-8">{Math.round(groupPercentage)}%</span>
                                                      </div>
                                                  </td>
                                              </tr>
                                              {group.categories.map(cat => {
                                                  const accMin = displayAccumulated[cat];
                                                  const intMin = displayInterruptions[cat];
                                                  const realMin = accMin - intMin;
                                                  const totalMin = displayMonthly[cat];
                                                  const percentage = totalMin > 0 ? (realMin / totalMin) * 100 : 0;

                                                  return (
                                                      <tr key={cat} className="hover:bg-white/5 transition-colors">
                                                          <td className="px-6 py-4 pl-10 font-medium text-white">
                                                              {canManageGestion && !isEditingHistorical ? (
                                                                  <button 
                                                                      onClick={() => {
                                                                          setEditingCategory(cat);
                                                                          setCategoryEditForm({
                                                                              programs: transmissionConfig.categoryPrograms?.[cat] || []
                                                                          });
                                                                      }}
                                                                      className="hover:text-[#9E7649] transition-colors flex items-center gap-2"
                                                                      title="Editar minutos base"
                                                                  >
                                                                      {renderCategoryLabel(cat)}
                                                                      <Edit2 size={12} className="opacity-50" />
                                                                  </button>
                                                              ) : (
                                                                  <span className="flex items-center gap-2">
                                                                      {renderCategoryLabel(cat)}
                                                                  </span>
                                                              )}
                                                          </td>
                                                          <td className="px-6 py-4 text-center font-mono text-[#E8DCCF]/50">
                                                              {isEditingHistorical ? (
                                                                  <input 
                                                                      type="number" 
                                                                      value={totalMin} 
                                                                      onChange={(e) => handleHistoricalEdit('accumulated', cat, Number(e.target.value))}
                                                                      className="w-16 bg-transparent border-b border-[#9E7649] text-center text-white focus:outline-none"
                                                                  />
                                                              ) : totalMin}
                                                          </td>
                                                          <td className="px-6 py-4 text-center font-mono text-red-400">
                                                              {isEditingHistorical ? (
                                                                  <input 
                                                                      type="number" 
                                                                      value={intMin} 
                                                                      onChange={(e) => handleHistoricalEdit('interruptions', cat, Number(e.target.value))}
                                                                      className="w-16 bg-transparent border-b border-red-500 text-center text-red-400 focus:outline-none"
                                                                  />
                                                              ) : (intMin > 0 ? `-${intMin}` : '0')}
                                                          </td>
                                                          <td className="px-6 py-4 text-center font-mono text-green-400 font-bold">{realMin}</td>
                                                          <td className="px-6 py-4 text-right">
                                                              <div className="flex items-center justify-end gap-3">
                                                                  <div className="w-24 h-1.5 bg-black/40 rounded-full overflow-hidden">
                                                                      <div 
                                                                          className="h-full bg-[#9E7649] rounded-full" 
                                                                          style={{ width: `${Math.min(percentage, 100)}%` }}
                                                                      />
                                                                  </div>
                                                                  <span className="text-[10px] font-bold text-[#9E7649] w-8">{Math.round(percentage)}%</span>
                                                              </div>
                                                          </td>
                                                      </tr>
                                                  );
                                              })}
                                          </React.Fragment>
                                      );
                                  })}
                                  <tr className="bg-[#3E1E16]/30 font-medium">
                                      <td className="px-6 py-4 text-[#9E7649]/70">TOTAL INTERRUPCIONES</td>
                                      <td className="px-6 py-4 text-center text-[#E8DCCF]/50"></td>
                                      <td className="px-6 py-4 text-center text-red-400">-{interruptionsByCategory.total}</td>
                                      <td className="px-6 py-4 text-center text-green-400"></td>
                                      <td className="px-6 py-4 text-right"></td>
                                  </tr>
                                  <tr className="bg-[#3E1E16]/50 font-bold">
                                      <td className="px-6 py-4 text-[#9E7649]">TOTAL REAL TRANSMISIÓN</td>
                                      <td className="px-6 py-4 text-center text-[#E8DCCF]/50">{displayMonthly.total}</td>
                                      <td className="px-6 py-4 text-center text-red-400">-{displayInterruptions.total}</td>
                                      <td className="px-6 py-4 text-center text-green-400">{displayAccumulated.total - displayInterruptions.total}</td>
                                      <td className="px-6 py-4 text-right">
                                          <span className="text-[#9E7649]">{displayMonthly.total > 0 ? Math.round(((displayAccumulated.total - displayInterruptions.total) / displayMonthly.total) * 100) : 0}%</span>
                                      </td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>

                        {isAdmin && !isEditingHistorical && (
                            <div className="bg-black/20 px-6 py-4 border-t border-[#9E7649]/10 flex justify-end gap-4">
                                <button 
                                    onClick={() => setShowInterruptionChoiceModal(true)}
                                    className="bg-red-900/40 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-900/60 transition-colors flex items-center gap-2"
                                >
                                    <Radio size={16} /> Registrar Interrupción
                                </button>
                                <button 
                                    onClick={handleOpenConsolidateModal}
                                    className="bg-[#9E7649] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#8B653D] transition-colors flex items-center gap-2"
                                >
                                    <Save size={16} /> Consolidar Mes
                                </button>
                            </div>
                        )}
                        {isAdmin && isEditingHistorical && (
                            <div className="bg-black/20 px-6 py-4 border-t border-[#9E7649]/10 flex justify-end gap-4">
                                <button 
                                    onClick={handleCancelHistoricalEdit}
                                    className="bg-[#1A100C] text-[#9E7649] border border-[#9E7649]/30 px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#9E7649]/10 transition-colors flex items-center gap-2"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSaveHistoricalEdit}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
                                >
                                    <Save size={16} /> Guardar Cambios
                                </button>
                            </div>
                        )}
                  </div>

                  {/* Info Card */}
                  <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex gap-4 items-start">
                      <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                          <Settings size={20} />
                      </div>
                      <div>
                          <h4 className="text-blue-400 font-bold text-sm mb-1">Información del Sistema</h4>
                          <p className="text-xs text-[#E8DCCF]/60 leading-relaxed">
                              Los cálculos se basan en la matriz de programación fija de Radio Ciudad Monumento. 
                              Se detectan automáticamente años bisiestos y la distribución de días laborables, sábados y domingos para el mes en curso.
                          </p>
                      </div>
                  </div>
              </div>

              {/* Modals */}
              {showInterruptionChoiceModal && (
                  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 p-8 max-w-sm w-full shadow-2xl">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="text-xl font-bold text-white">Interrupciones</h3>
                              <button onClick={() => setShowInterruptionChoiceModal(false)} className="text-[#E8DCCF]/50 hover:text-white">
                                  <X size={24} />
                              </button>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                              <button 
                                  onClick={() => {
                                      setShowInterruptionChoiceModal(false);
                                      setShowInterruptionsModal(true);
                                  }}
                                  className="flex items-center justify-center gap-3 p-4 bg-[#9E7649] text-white rounded-xl hover:bg-[#8B653D] transition-all font-bold shadow-lg"
                              >
                                  <Plus size={20} /> Agregar Interrupción
                              </button>
                              <button 
                                  onClick={() => {
                                      setShowInterruptionChoiceModal(false);
                                      setShowEditInterruptionsModal(true);
                                  }}
                                  className="flex items-center justify-center gap-3 p-4 bg-[#1A100C] text-[#9E7649] border border-[#9E7649]/30 rounded-xl hover:bg-[#9E7649]/10 transition-all font-bold"
                              >
                                  <Edit2 size={20} /> Editar Interrupciones
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {showEditInterruptionsModal && (
                  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 p-6 max-w-2xl w-full shadow-2xl">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="text-xl font-bold text-white">Editar Interrupciones</h3>
                              <button onClick={() => setShowEditInterruptionsModal(false)} className="text-[#E8DCCF]/50 hover:text-white">
                                  <X size={24} />
                              </button>
                          </div>
                          <div className="max-h-[400px] overflow-y-auto space-y-3 mb-6 pr-2 custom-scrollbar">
                              {interruptions.length > 0 ? (
                                  interruptions.map(inter => (
                                      <div key={inter.id} className="bg-[#1A100C] border border-[#9E7649]/20 p-4 rounded-xl flex justify-between items-center">
                                          <div>
                                              <div className="text-white font-bold">{inter.programName}</div>
                                              <div className="text-xs text-[#E8DCCF]/50">{inter.date} | {inter.startTime} - {inter.endTime}</div>
                                          </div>
                                          <div className="flex items-center gap-4">
                                              <span className="text-red-400 font-mono font-bold">-{inter.affectedMinutes} min</span>
                                              <button 
                                                  onClick={() => {
                                                      if (window.confirm('¿Eliminar esta interrupción?')) {
                                                          setInterruptions(interruptions.filter(i => i.id !== inter.id));
                                                      }
                                                  }}
                                                  className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                              >
                                                  <Trash2 size={18} />
                                              </button>
                                          </div>
                                      </div>
                                  ))
                              ) : (
                                  <p className="text-center text-[#E8DCCF]/30 py-10">No hay interrupciones registradas</p>
                              )}
                          </div>
                          <div className="flex justify-end">
                              <button onClick={() => setShowEditInterruptionsModal(false)} className="px-6 py-2 bg-[#9E7649] text-white rounded-lg font-bold">Cerrar</button>
                          </div>
                      </div>
                  </div>
              )}

              {editingCategory && (
                  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 p-6 max-w-md w-full shadow-2xl">
                          <h3 className="text-xl font-bold text-white mb-4">Editar {categoryLabels[editingCategory]}</h3>
                          {['boletines', 'publicidad', 'cienciaTecnica'].includes(editingCategory) ? (
                              <p className="text-sm text-[#9E7649] mb-6">El tiempo de esta categoría se calcula automáticamente según las Fichas de programas.</p>
                          ) : (
                              <>
                                  <p className="text-sm text-[#9E7649] mb-6">Selecciona los programas asignados a esta categoría. El tiempo se calculará automáticamente según sus Fichas.</p>
                                  
                                  <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                      <div>
                                          <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Programas Asignados</label>
                                          <div className="bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                                               {[...fichas, 
                                                 { name: "Noticiero Nacional", duration: "28 min", frequency: "Lunes a Domingo" },
                                                 { name: "Noticiero Provincial", duration: "28 min", frequency: "Lunes a Sábado" }
                                               ].map(ficha => (
                                                  <label key={ficha.name} className="flex items-center gap-2 p-1 hover:bg-[#9E7649]/10 rounded cursor-pointer">
                                                      <input 
                                                          type="checkbox" 
                                                          checked={(categoryEditForm.programs || []).includes(ficha.name)}
                                                          onChange={e => {
                                                              const current = categoryEditForm.programs || [];
                                                              const updated = e.target.checked 
                                                                  ? [...current, ficha.name]
                                                                  : current.filter(p => p !== ficha.name);
                                                              setCategoryEditForm({...categoryEditForm, programs: updated});
                                                          }}
                                                          className="accent-[#9E7649]"
                                                      />
                                                      <span className="text-sm text-white/90">{ficha.name}</span>
                                                  </label>
                                              ))}
                                          </div>
                                      </div>
                                  </div>
                              </>
                          )}

                          <div className="flex justify-end gap-3">
                              <button onClick={() => setEditingCategory(null)} className="px-4 py-2 rounded-lg text-sm font-bold text-[#9E7649] hover:bg-[#9E7649]/10">Cancelar</button>
                              <button onClick={handleSaveCategoryEdit} className="px-4 py-2 rounded-lg text-sm font-bold bg-[#9E7649] text-white hover:bg-[#8B653D]">Guardar Cambios</button>
                          </div>
                      </div>
                  </div>
              )}

              {showConsolidateModal && (
                  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 p-6 max-w-md w-full shadow-2xl">
                          <h3 className="text-xl font-bold text-white mb-2">Consolidar Mes</h3>
                          <p className="text-sm text-[#9E7649] mb-6">Estás a punto de cerrar el mes actual. Revisa los datos antes de aceptar.</p>
                          
                          <div className="bg-[#1A100C] rounded-xl p-4 mb-6 border border-[#9E7649]/10 space-y-2">
                              <div className="flex justify-between text-sm">
                                  <span className="text-[#E8DCCF]/50">Total Programado:</span>
                                  <span className="text-white font-mono">{accumulated.breakdown.total} min</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                  <span className="text-[#E8DCCF]/50">Total Interrupciones:</span>
                                  <span className="text-red-400 font-mono">-{interruptionsByCategory.total} min</span>
                              </div>
                              <div className="flex justify-between text-base font-bold pt-2 border-t border-[#9E7649]/20">
                                  <span className="text-[#9E7649]">Total Real:</span>
                                  <span className="text-green-400 font-mono">{accumulated.breakdown.total - interruptionsByCategory.total} min</span>
                              </div>
                          </div>

                          <div className="flex justify-end gap-3">
                              <button onClick={() => setShowConsolidateModal(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-[#9E7649] hover:bg-[#9E7649]/10">Cancelar</button>
                              <button onClick={handleConsolidate} className="px-4 py-2 rounded-lg text-sm font-bold bg-[#9E7649] text-white hover:bg-[#8B653D]">Aceptar y Consolidar</button>
                          </div>
                      </div>
                  </div>
              )}

              {showInterruptionsModal && (
                  <InterruptionModal 
                      onClose={() => setShowInterruptionsModal(false)} 
                      onSave={(newInterruptions) => {
                          setInterruptions([...interruptions, ...newInterruptions]);
                          setShowInterruptionsModal(false);
                      }}
                      fichas={fichas}
                      categories={categories}
                      categoryLabels={categoryLabels}
                      categoryPrograms={transmissionConfig.categoryPrograms}
                  />
              )}
          </div>
      );
  }

  // Render Reportes Section
  if (activeSection === 'reportes') {
      const isGlobalAdmin = currentUser?.classification === 'Administrador' || (currentUser?.role === 'admin' && currentUser?.classification !== 'Coordinador');
      const isCoordinatorWithAccess = currentUser?.classification === 'Coordinador' && (currentUser.coordinatorSections || []).includes('Gestión');
      return (
          <ReportesSection 
              currentUser={currentUser}
              workLogs={workLogs}
              setWorkLogs={setWorkLogs}
              workLogDate={workLogDate}
              setWorkLogDate={setWorkLogDate}
              workLogView={workLogView}
              setWorkLogView={setWorkLogView}
              onBack={() => setActiveSection(null)}
              onMenuClick={onMenuClick || (() => {})}
              fichas={fichas}
              equipoData={teamData}
              isCoordinatorWithAccess={isCoordinatorWithAccess}
              isGlobalAdmin={isGlobalAdmin}
              catalogo={catalogo}
              consolidatedPayments={consolidatedPayments}
              setConsolidatedPayments={setConsolidatedPayments}
              getProgramRate={getProgramRate}
              calculateTax={calculateTax}
          />
      );
  }

  if (activeSection === 'fichas') {
      return (
          <FichasSection
             currentUser={currentUser}
             onBack={() => setActiveSection(null)}
             onMenuClick={onMenuClick || (() => {})}
             fichas={fichas}
             setFichas={setFichas}
          />
      );
  }

  if (activeSection === 'catalogo') {
      return (
          <CatalogoSection
             currentUser={currentUser}
             onBack={() => setActiveSection(null)}
             onMenuClick={onMenuClick || (() => {})}
             catalogo={catalogo}
             setCatalogo={setCatalogo}
          />
      );
  }

  if (activeSection === 'equipo') {
      return (
          <EquipoSection
              currentUser={currentUser}
              onBack={() => setActiveSection(null)}
              onMenuClick={onMenuClick || (() => {})}
              catalogo={catalogo}
              fichas={fichas}
              onDirtyChange={onDirtyChange}
              users={users}
              setUsers={setUsers}
              historyContent={historyContent}
              setHistoryContent={setHistoryContent}
              aboutContent={aboutContent}
              setAboutContent={setAboutContent}
              news={news}
              setNews={setNews}
              setImpersonatedUser={setImpersonatedUser}
          />
      );
  }

  // Main Menu
  return (
    <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
      {/* Header */}
      <CMNLHeader 
          user={currentUser ? { name: currentUser.name, role: currentUser.role } : null}
          sectionTitle="Gestión"
          onMenuClick={onMenuClick}
          onBack={onBack}
      />

      {/* Grid Menu */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto w-full">
          {menuItems.map((item, index) => (
            <button 
              key={index}
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border ${item.color} hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg ${item.id === 'reportes' ? 'col-span-2 md:col-span-2 aspect-auto py-10' : 'aspect-square'}`}
            >
              <div className="p-3 rounded-full bg-black/20 backdrop-blur-sm">
                {item.icon}
              </div>
              <span className="font-bold text-sm uppercase tracking-wide">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Generic Dialog */}
      {dialog.isOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 p-6 max-w-md w-full shadow-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">{dialog.title}</h3>
                  <p className="text-sm text-[#E8DCCF] mb-6 whitespace-pre-line">{dialog.message}</p>
                  <div className="flex justify-end gap-3">
                      {dialog.type === 'confirm' && (
                          <button onClick={() => setDialog({ ...dialog, isOpen: false })} className="px-4 py-2 rounded-lg text-sm font-bold text-[#9E7649] hover:bg-[#9E7649]/10">
                              Cancelar
                          </button>
                      )}
                      <button 
                          onClick={() => {
                              setDialog({ ...dialog, isOpen: false });
                              if (dialog.onConfirm) dialog.onConfirm();
                          }} 
                          className="px-4 py-2 rounded-lg text-sm font-bold bg-[#9E7649] text-white hover:bg-[#8B653D]"
                      >
                          {dialog.type === 'confirm' ? 'Aceptar' : 'Entendido'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Restriction Modal removed as per user request */}
    </div>
  );
};

export default GestionApp;
