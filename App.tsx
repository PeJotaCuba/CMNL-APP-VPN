import React, { useState, useEffect, useRef } from 'react';
import { AppView, User, NewsItem } from './types';
import PublicLanding from './components/PublicLanding';
import ListenerHome from './components/ListenerHome';
import WorkerHome from './components/WorkerHome';
import AdminDashboard from './components/AdminDashboard';
import EquipoSection from './components/gestion/EquipoSection';
import GestionApp from './components/GestionApp';
import GuionesApp, { PROGRAMS } from './components/GuionesApp';
import AgendaApp from './components/agenda/AgendaApp';
import MusicaApp from './components/MusicaApp';
import ToolsSection from './components/ToolsSection';
import { Reports } from './src/pages/Reports';
import HistoryEvolutionView from './src/components/HistoryEvolutionView';
import Sidebar from './components/Sidebar';
import QuienesSomos from './components/QuienesSomos';
import { PlaceholderView, CMNLAppView } from './components/GenericViews';
import InstallPWA from './components/InstallPWA';
import { INITIAL_USERS, INITIAL_NEWS, INITIAL_HISTORY, INITIAL_ABOUT, getCurrentProgram, getCategoryVector } from './utils/scheduleData';
import BackupDialog from './components/BackupDialog';
import { UpdateDetailsModal, UpdateReminderModal } from './components/UpdateDialogs';
import { loadReportsFromDB, loadProductionsFromDB, loadSelectionsFromDB, loadSavedSelectionsListFromDB } from './components/musica/services/db';
import { Play, Pause, SkipBack, SkipForward, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { FirebaseProvider, useFirebase } from './src/contexts/FirebaseContext';

const App: React.FC = () => {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
};

const AppContent: React.FC = () => {
  const { user: firebaseUser } = useFirebase();
  const [currentView, setCurrentView] = useState<AppView>(AppView.LISTENER_HOME);
  const [history, setHistory] = useState<AppView[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [isLogoutTrigger, setIsLogoutTrigger] = useState(false);
  const pendingNavigation = useRef<(() => void) | null>(null);

  const checkDirty = (callback: () => void, isLogout = false) => {
      // Check if user should see the backup prompt
      const classification = (currentUser?.classification || '').toLowerCase();
      const role = (currentUser?.role || '').toLowerCase();
      
      const isExcluded = classification === 'administrador' || classification === 'coordinador' || role === 'admin' || role === 'coordinator';
      
      const activeRoles = [
          'director', 'asesor', 'realizador', 'locutor', 'guionista', 
          'periodista', 'coordinador', 'director de emisora', 'jefe de programación', 
          'especialista', 'auxiliar general', 'asistente de dirección', 'recepcionista'
      ];
      const isActiveRole = activeRoles.includes(classification);
      
      const isSensitiveView = currentView === AppView.APP_MUSICA || currentView === AppView.APP_PROGRAMACION || currentView === AppView.APP_EQUIPO;

      // Trigger if dirty, in sensitive view, or logging out
      if ((isDirty || isSensitiveView || isLogout) && !isExcluded && isActiveRole) {
          pendingNavigation.current = callback;
          setIsLogoutTrigger(isLogout);
          setShowBackupDialog(true);
      } else {
          callback();
      }
  };

  const handleBackup = async () => {
      if (currentUser) {
          // Collect all data
          const username = currentUser.username;
          
          // 1. Payments Data (LocalStorage)
          const paymentsData = {
              worklogs: JSON.parse(localStorage.getItem(`user_${username}_rcm_data_worklogs`) || '[]'),
              consolidated: JSON.parse(localStorage.getItem(`user_${username}_rcm_data_consolidated`) || '[]'),
              interruptions: JSON.parse(localStorage.getItem(`user_${username}_rcm_interruptions`) || '[]'),
              consolidatedMonths: JSON.parse(localStorage.getItem(`user_${username}_rcm_consolidated_months`) || '[]'),
              habitualExclusions: JSON.parse(localStorage.getItem(`user_${username}_habitual_exclusions`) || '[]'),
              habitualMode: localStorage.getItem(`user_${username}_habitual_mode`) === 'true',
          };

          // 2. Music Data (IndexedDB + LocalStorage)
          const [reports, productions, selections, savedSelectionsList] = await Promise.all([
              loadReportsFromDB(username),
              loadProductionsFromDB(), // These might need filtering by user if they have a field
              loadSelectionsFromDB(),
              loadSavedSelectionsListFromDB()
          ]);

          const musicData = {
              currentSelection: JSON.parse(localStorage.getItem(`user_${username}_rcm_current_selection`) || '[]'),
              savedSelections: JSON.parse(localStorage.getItem(`user_${username}_rcm_saved_selections`) || '[]'),
              reports: reports,
              productions: productions.filter((p: any) => p.createdBy === username || !p.createdBy),
              selections: selections,
              savedSelectionsList: savedSelectionsList
          };

          // 3. Guiones Data (LocalStorage)
          const guionesData: Record<string, any> = {};
          for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('guionbd_data_')) {
                  guionesData[key] = JSON.parse(localStorage.getItem(key) || '[]');
              }
          }

          // 4. Agenda Data (LocalStorage)
          const agendaData = {
              programs: JSON.parse(localStorage.getItem('rcm_programs') || '[]'),
              efemerides: JSON.parse(localStorage.getItem('rcm_efemerides') || '{}'),
              conmemoraciones: JSON.parse(localStorage.getItem('rcm_conmemoraciones') || '{}'),
              dayThemes: JSON.parse(localStorage.getItem('rcm_day_themes') || '{}'),
              propaganda: JSON.parse(localStorage.getItem('rcm_propaganda') || '{}'),
              culturalOptions: JSON.parse(localStorage.getItem('rcm_cultural_options') || '{}'),
              users: JSON.parse(localStorage.getItem('rcm_users') || '[]'),
          };

          const backupData = {
              username: username,
              name: currentUser.name,
              classification: currentUser.classification,
              timestamp: new Date().toISOString(),
              version: "1.0",
              data: {
                  payments: paymentsData,
                  music: musicData,
                  guiones: guionesData,
                  agenda: agendaData
              }
          };

          const dataStr = JSON.stringify(backupData, null, 2);
          const blob = new Blob([dataStr], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          const timeStr = `${hours}-${minutes}`;
          
          link.download = `Respaldo_${username}_${dateStr}_${timeStr}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          // Update last backup timestamp
          localStorage.setItem(`last_backup_${username}`, new Date().getTime().toString());
      }

      setIsDirty(false);
      setShowBackupDialog(false);
      if (pendingNavigation.current) {
          pendingNavigation.current();
          pendingNavigation.current = null;
      }
  };
  
  // Global Data State - Initialized from LocalStorage or JSON via utils
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('rcm_data_users');
    let parsedUsers: User[] = saved ? JSON.parse(saved) : INITIAL_USERS;
    
    // Security Patch: Ensure only Administrador and Coordinador have elevated roles
    let modified = false;
    parsedUsers = parsedUsers.map(u => {
      if (u.role === 'admin' && u.classification !== 'Administrador') {
        modified = true;
        return { ...u, role: 'worker' };
      }
      if (u.classification === 'Coordinador' && u.role !== 'coordinator') {
          modified = true;
          return { ...u, role: 'coordinator' };
      }
      return u;
    });
    
    if (modified) {
      localStorage.setItem('rcm_data_users', JSON.stringify(parsedUsers));
    }
    
    return parsedUsers;
  });
  
  const [news, setNews] = useState<NewsItem[]>(() => {
    const saved = localStorage.getItem('rcm_data_news');
    console.log('Loaded news from localStorage:', saved ? JSON.parse(saved).length : 0);
    return saved ? JSON.parse(saved) : INITIAL_NEWS;
  });

  const [historyContent, setHistoryContent] = useState<string>(() => {
    const saved = localStorage.getItem('rcm_data_history');
    return saved || INITIAL_HISTORY;
  });

  const [aboutContent, setAboutContent] = useState<string>(() => {
    const saved = localStorage.getItem('rcm_data_about');
    return saved || INITIAL_ABOUT;
  });

  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [impersonatedUser, setImpersonatedUser] = useState<any | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentProgram, setCurrentProgram] = useState({ name: "Cargando...", time: "", image: "" });

  const [updateDetails, setUpdateDetails] = useState<{ show: boolean; content: string } | null>(null);
  const [showUpdateReminder, setShowUpdateReminder] = useState(false);

  useEffect(() => {
    setCurrentProgram(getCurrentProgram());
  }, []);

  // Update Reminder Check
  useEffect(() => {
    const lastSyncStr = localStorage.getItem('last_sync_time');
    if (lastSyncStr) {
      const lastSync = parseInt(lastSyncStr, 10);
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      if (now - lastSync > twentyFourHours) {
        setShowUpdateReminder(true);
      }
    }
  }, []);

  // 24-Hour Backup Reminder Effect
  useEffect(() => {
    if (currentUser) {
      const isExcluded = currentUser.classification === 'Administrador' || currentUser.classification === 'Coordinador' || currentUser.role === 'admin' || currentUser.role === 'coordinator';
      const isActiveRole = ['director', 'asesor', 'realizador', 'locutor', 'guionista', 'periodista', 'coordinador', 'director de emisora', 'jefe de programación', 'especialista', 'auxiliar general', 'asistente de dirección', 'recepcionista'].includes(currentUser.classification || '');
      
      if (!isExcluded && isActiveRole) {
        const lastBackup = localStorage.getItem(`last_backup_${currentUser.username}`);
        const now = new Date().getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (!lastBackup || (now - parseInt(lastBackup)) > twentyFourHours) {
          // If 24h passed, mark as dirty to trigger prompt on next navigation or logout
          setIsDirty(true);
        }
      }
    }
  }, [currentUser]);

  // Persistence Effects
  useEffect(() => { localStorage.setItem('rcm_data_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('rcm_data_news', JSON.stringify(news)); }, [news]);
  useEffect(() => { localStorage.setItem('rcm_data_history', historyContent); }, [historyContent]);
  useEffect(() => { localStorage.setItem('rcm_data_about', aboutContent); }, [aboutContent]);

  useEffect(() => {
    // Check for persistent session
    const sessionRole = localStorage.getItem('rcm_user_session');
    const sessionUsername = localStorage.getItem('rcm_user_username');

    if (sessionRole && sessionUsername) {
      const user = users.find(u => u.username === sessionUsername);
      if (user) {
        setCurrentUser(user);
        if (sessionRole === 'admin') {
          setCurrentView(AppView.ADMIN_DASHBOARD);
        } else if (sessionRole === 'worker' || sessionRole === 'coordinator') {
          setCurrentView(AppView.WORKER_HOME);
        }
      } else {
        // User data missing, fallback
        setCurrentView(AppView.LISTENER_HOME);
      }
    } else {
       setCurrentView(AppView.LISTENER_HOME);
    }
  }, []);

  // Update Program Info for Player
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentProgram(getCurrentProgram());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Back Button Logic
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If in AgendaApp, GestionApp, or GuionesApp and navigating internally (hash exists), ignore this event
      // to prevent App.tsx from unmounting the app
      if ((currentView === AppView.APP_AGENDA || currentView === AppView.APP_PROGRAMACION || currentView === AppView.APP_GUIONES) && 
          window.location.hash.length > 1) {
        return;
      }

      if (history.length > 0) {
        const prevView = history[history.length - 1];
        setHistory((prev) => prev.slice(0, -1));
        setCurrentView(prevView);
      } else {
        const sessionRole = localStorage.getItem('rcm_user_session');
        if (sessionRole && currentView !== AppView.LISTENER_HOME) {
           window.history.pushState(null, '', window.location.pathname);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [history, currentView]);

  const handleNavigate = (view: AppView, data?: any) => {
    console.log('Navigating to:', view, 'Data:', data);
    if (view === currentView) return;
    checkDirty(() => {
        window.history.pushState(null, '', window.location.pathname);
        setHistory((prev) => [...prev, currentView]);
        setCurrentView(view);
        if (view === AppView.SECTION_NEWS_DETAIL && data) {
          console.log('Setting selectedNews:', data);
          setSelectedNews(data);
        }
    });
  };

  const handleBack = () => {
    checkDirty(() => {
        window.history.replaceState(null, '', window.location.pathname);
        if (history.length > 0) {
          const prevView = history[history.length - 1];
          setHistory((prev) => prev.slice(0, -1));
          setCurrentView(prevView);
        } else {
          const sessionRole = localStorage.getItem('rcm_user_session');
          if (sessionRole === 'admin') {
            setCurrentView(AppView.ADMIN_DASHBOARD);
          } else if (sessionRole === 'worker') {
            setCurrentView(AppView.WORKER_HOME);
          } else {
            setCurrentView(AppView.LISTENER_HOME);
          }
        }
    });
  };

  const handleLogout = () => {
    checkDirty(() => {
        // 1. Clear session
        localStorage.removeItem('rcm_user_session');
        localStorage.removeItem('rcm_user_username');
        setCurrentUser(null);
        
        // 2. Stop Player
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);

        // 3. Redirect
        setHistory([]);
        setCurrentView(AppView.LANDING); // Redirect to login
    }, true);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleRefreshLive = () => {
      if (audioRef.current) {
          setIsRefreshing(true);
          const baseSrc = "https://icecast.teveo.cu/KR43FF7C";
          // Add a cache buster param to force a fresh connection to the stream
          const freshSrc = `${baseSrc}?t=${Date.now()}`;
          
          audioRef.current.pause();
          audioRef.current.src = "";
          audioRef.current.load();
          
          // Re-assign and play
          audioRef.current.src = freshSrc;
          audioRef.current.load();
          audioRef.current.play().then(() => {
              setIsPlaying(true);
              setIsRefreshing(false);
          }).catch(err => {
              console.error("Playback error during refresh:", err);
              // Fallback to original src if cache buster fails
              if (audioRef.current) {
                  audioRef.current.src = baseSrc;
                  audioRef.current.load();
                  audioRef.current.play().catch(() => {});
              }
              setIsRefreshing(false);
          });
      }
  };

  const handleAdminBackup = () => {
      const dataToExport: Record<string, any> = {};
      
      const getLocal = (key: string) => {
          const val = localStorage.getItem(key);
          if (!val) return undefined;
          try { return JSON.parse(val); } catch (e) { return val; }
      };

      // Map local keys to the structure expected by handleCloudSync
      dataToExport.users = getLocal('rcm_data_users') || [];
      dataToExport.historyContent = getLocal('rcm_data_history') || "";
      dataToExport.aboutContent = getLocal('rcm_data_about') || "";
      dataToExport.news = getLocal('rcm_data_news') || [];
      dataToExport.fichas = getLocal('rcm_data_fichas') || [];
      dataToExport.catalogo = getLocal('rcm_data_catalogo') || [];
      
      // Collect all data for all users
      const allInterruptions: any[] = [];
      const allWorklogs: any[] = [];
      const allConsolidated: any[] = [];
      const allConsolidatedMonths: any[] = [];
      const allHabitualExclusions: any[] = [];
      const allHabitualModes: any[] = [];
      
      users.forEach(user => {
          const u = user.username;
          const userWorklogs = getLocal(`user_${u}_rcm_data_worklogs`);
          const userConsolidated = getLocal(`user_${u}_rcm_data_consolidated`);
          const userInterruptions = getLocal(`user_${u}_rcm_interruptions`);
          const userConsolidatedMonths = getLocal(`user_${u}_rcm_consolidated_months`);
          const userHabitualExclusions = getLocal(`user_${u}_habitual_exclusions`);
          const userHabitualMode = getLocal(`user_${u}_habitual_mode`);
          
          if (Array.isArray(userWorklogs)) allWorklogs.push(...userWorklogs);
          if (Array.isArray(userConsolidated)) allConsolidated.push(...userConsolidated);
          if (Array.isArray(userInterruptions)) allInterruptions.push(...userInterruptions);
          if (Array.isArray(userConsolidatedMonths)) allConsolidatedMonths.push(...userConsolidatedMonths);
          if (Array.isArray(userHabitualExclusions)) allHabitualExclusions.push({ username: u, exclusions: userHabitualExclusions });
          if (userHabitualMode !== undefined) allHabitualModes.push({ username: u, mode: userHabitualMode });
      });
      
      dataToExport.worklogs = allWorklogs;
      dataToExport.consolidated = allConsolidated;
      dataToExport.interruptions = allInterruptions;
      dataToExport.consolidatedMonths = allConsolidatedMonths;
      dataToExport.habitualExclusions = allHabitualExclusions;
      dataToExport.habitualModes = allHabitualModes;
      
      dataToExport.transmissionConfig = getLocal('rcm_transmission_config');
      dataToExport.transmissionInterruptions = getLocal('rcm_transmission_interruptions') || [];
      dataToExport.transmissionHistorical = getLocal('rcm_transmission_historical') || [];
      
      // Payment configs
      dataToExport.paymentConfigs = {
          rcm_payment_config: getLocal('rcm_payment_config'),
          rcm_payment_workers: getLocal('rcm_payment_workers'),
          rcm_payment_programs: getLocal('rcm_payment_programs'),
          rcm_payment_roles: getLocal('rcm_payment_roles'),
          rcm_payment_history: getLocal('rcm_payment_history')
      };

      // Scripts
      dataToExport.scripts = {
          rcm_scripts_programs: getLocal('rcm_scripts_programs'),
          rcm_scripts_history: getLocal('rcm_scripts_history')
      };
      
      PROGRAMS.forEach(prog => {
          dataToExport.scripts[`guionbd_data_${prog.file}`] = getLocal(`guionbd_data_${prog.file}`);
      });

      // Program Sections
      dataToExport.programSections = {
          rcm_program_sections: getLocal('rcm_program_sections')
      };
      
      PROGRAMS.forEach(prog => {
          dataToExport.programSections[`program_sections_${prog.name}`] = getLocal(`program_sections_${prog.name}`);
      });

      // Agenda
      dataToExport.agendaPrograms = getLocal('rcm_programs') || [];
      dataToExport.agendaEfemerides = getLocal('rcm_efemerides') || {};
      dataToExport.agendaConmemoraciones = getLocal('rcm_conmemoraciones') || {};
      dataToExport.agendaDayThemes = getLocal('rcm_day_themes') || {};
      dataToExport.agendaUsers = getLocal('rcm_users') || [];
      dataToExport.agendaPropaganda = getLocal('rcm_propaganda') || {};
      dataToExport.agendaCulturalOptions = getLocal('rcm_cultural_options') || {};

      dataToExport.programsList = getLocal('rcm_programs_list') || [];
      dataToExport.customRoots = getLocal('rcm_custom_roots') || [];
      dataToExport.equipo = getLocal('rcm_equipo_cmnl') || [];
      dataToExport.manualProgramming = getLocal('rcm_manual_programming') || [];
      
      // Management Reports and Consolidated Payments
      dataToExport.managementReports = getLocal('rcm_gestion_reportes') || [];
      dataToExport.allConsolidatedPayments = getLocal('rcm_all_consolidated_payments') || [];

      // User Data
      dataToExport.userData = {
          rcm_user_preferences: getLocal('rcm_user_preferences'),
          rcm_user_notifications: getLocal('rcm_user_notifications')
      };

      // Clean up undefined values
      Object.keys(dataToExport).forEach(key => {
          if (dataToExport[key] === undefined) {
              delete dataToExport[key];
          } else if (typeof dataToExport[key] === 'object' && !Array.isArray(dataToExport[key])) {
              Object.keys(dataToExport[key]).forEach(subKey => {
                  if (dataToExport[key][subKey] === undefined) {
                      delete dataToExport[key][subKey];
                  }
              });
              // We do not delete the main object if it's empty, so properties like agendaCulturalOptions remain in the backup
          }
      });

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "actualcmnl.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  // Logic to sync from GitHub (Used by Users and Admins)
  const handleCloudSync = async () => {
      if(isSyncing) return;
      
      setConfirmAction({
          title: "Sincronización",
          message: "¿Desea obtener los últimos datos actualizados desde la nube?",
          onConfirm: async () => {
              setConfirmAction(null);
              setIsSyncing(true);
              const username = currentUser?.username || 'default';
              const GITHUB_RAW_URL = `https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/actualcmnl.json?t=${new Date().getTime()}`;

              try {
                  const response = await fetch(GITHUB_RAW_URL, { cache: "no-store" });
                  if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
                  
                  const json = await response.json();
                  const pendingUpdates: Record<string, string> = {};
                  
                  const setLocal = (key: string, value: any) => {
                      pendingUpdates[key] = JSON.stringify(value);
                  };

                  // Helper to merge data while protecting user-generated content
                  const mergeData = (localKey: string, jsonData: any[], idKey: string | ((item: any) => string)) => {
                      if (!jsonData || !Array.isArray(jsonData)) return;
                      
                      const saved = localStorage.getItem(localKey);
                      const localData = saved ? JSON.parse(saved) : [];

                      // Protected Keys: NO BORRAR, MODIFICAR O RESETEAR
                      const protectedKeys = ['rcm_data_worklogs', 'rcm_data_consolidated', 'rcm_interruptions', 'rcm_consolidated_months', 'rcm_users'];
                      
                      // Check if the key is a user-specific version of a protected key
                      const isProtected = protectedKeys.some(key => localKey.includes(key));
                      
                      if (isProtected) {
                          if (localKey.includes('rcm_users')) {
                              // Preserve interests for agenda users
                              const merged = jsonData.map(newUser => {
                                  const localItem = localData.find((u: any) => u.id === newUser.id);
                                  return localItem && localItem.interests ? { ...newUser, interests: localItem.interests } : newUser;
                              });
                              setLocal(localKey, merged);
                          } else {
                              // For other protected data (worklogs, reports), keep local and add new ones from JSON if they don't exist
                              const getId = (item: any) => (typeof idKey === 'function' ? idKey(item) : item[idKey]);
                              const merged = [...localData];
                              jsonData.forEach(newItem => {
                                  if (!merged.some(oldItem => getId(oldItem) === getId(newItem))) {
                                      merged.push(newItem);
                                  }
                              });
                              setLocal(localKey, merged);
                          }
                          return;
                      }

                      // Administrative data: Overwrite local with remote
                      setLocal(localKey, jsonData);
                  };

                  const mergeRecordData = (localKey: string, jsonData: Record<string, any[]>) => {
                      if (!jsonData || typeof jsonData !== 'object' || Array.isArray(jsonData)) return;
                      setLocal(localKey, jsonData);
                  };

                  const mergeSimpleRecord = (localKey: string, jsonData: Record<string, string>) => {
                      if (!jsonData || typeof jsonData !== 'object' || Array.isArray(jsonData)) return;
                      setLocal(localKey, jsonData);
                  };

                  // Apply updates to state (will be persisted via useEffects, but we also setLocal for consistency)
                  if (json.users && Array.isArray(json.users)) {
                    setUsers(json.users);
                    setLocal('rcm_data_users', json.users);
                  }
                  if (typeof json.historyContent === 'string') {
                    setHistoryContent(json.historyContent);
                    setLocal('rcm_data_history', json.historyContent);
                  }
                  if (typeof json.aboutContent === 'string') {
                    setAboutContent(json.aboutContent);
                    setLocal('rcm_data_about', json.aboutContent);
                  }
                  if (json.news && Array.isArray(json.news)) {
                    const processedNews = json.news.map((n: NewsItem) => ({
                        ...n,
                        image: (!n.image || n.image === '') 
                            ? getCategoryVector(n.category || 'Boletín', n.title) 
                            : n.image
                    }));
                    setNews(processedNews);
                    setLocal('rcm_data_news', processedNews);
                  }
                  
                  if (json.fichas) mergeData('rcm_data_fichas', json.fichas, 'name');
                  if (json.catalogo) mergeData('rcm_data_catalogo', json.catalogo, 'name');
                  
                  if (json.worklogs) mergeData(`user_${username}_rcm_data_worklogs`, json.worklogs, 'id');
                  if (json.consolidated) mergeData(`user_${username}_rcm_data_consolidated`, json.consolidated, 'id');
                  if (json.interruptions) mergeData(`user_${username}_rcm_interruptions`, json.interruptions, 'id');
                  if (json.consolidatedMonths) mergeData(`user_${username}_rcm_consolidated_months`, json.consolidatedMonths, (item: any) => `${item.month}-${item.year}`);
                  
                  if (json.habitualExclusions && Array.isArray(json.habitualExclusions)) {
                      const userExclusions = json.habitualExclusions.find((e: any) => e.username === username);
                      if (userExclusions) setLocal(`user_${username}_habitual_exclusions`, userExclusions.exclusions);
                  }
                  if (json.habitualModes && Array.isArray(json.habitualModes)) {
                      const userMode = json.habitualModes.find((m: any) => m.username === username);
                      if (userMode) setLocal(`user_${username}_habitual_mode`, userMode.mode);
                  }
                  
                  if (json.transmissionConfig) setLocal('rcm_transmission_config', json.transmissionConfig);
                  if (json.transmissionInterruptions) mergeData('rcm_transmission_interruptions', json.transmissionInterruptions, 'id');
                  if (json.transmissionHistorical) mergeData('rcm_transmission_historical', json.transmissionHistorical, 'month');
                  if (json.paymentConfigs) {
                      Object.entries(json.paymentConfigs).forEach(([key, value]) => setLocal(key, value));
                  }
                  if (json.scripts) {
                      Object.entries(json.scripts).forEach(([key, value]) => mergeData(key, value as any[], 'id'));
                  }
                  if (json.programSections) {
                      Object.entries(json.programSections).forEach(([key, value]) => mergeData(key, value as any[], 'name'));
                  }
                  if (json.agendaPrograms) setLocal('rcm_programs', json.agendaPrograms);
                  if (json.agendaEfemerides) mergeRecordData('rcm_efemerides', json.agendaEfemerides);
                  if (json.agendaConmemoraciones) mergeRecordData('rcm_conmemoraciones', json.agendaConmemoraciones);
                  if (json.agendaDayThemes) mergeSimpleRecord('rcm_day_themes', json.agendaDayThemes);
                  if (json.agendaUsers) mergeData('rcm_users', json.agendaUsers, 'id');
                  if (json.agendaPropaganda) mergeRecordData('rcm_propaganda', json.agendaPropaganda);
                  if (json.agendaCulturalOptions) mergeRecordData('rcm_cultural_options', json.agendaCulturalOptions);
                  if (json.programsList && Array.isArray(json.programsList)) setLocal('rcm_programs_list', json.programsList);
                  if (json.customRoots && Array.isArray(json.customRoots)) setLocal('rcm_custom_roots', json.customRoots);
                  if (json.manualProgramming) setLocal('rcm_manual_programming', json.manualProgramming);
                  if (json.managementReports) setLocal('rcm_gestion_reportes', json.managementReports);
                  if (json.allConsolidatedPayments) setLocal('rcm_all_consolidated_payments', json.allConsolidatedPayments);
                  if (json.userData) {
                      Object.entries(json.userData).forEach(([key, value]) => setLocal(key, value));
                  }

                  if (json.equipo && Array.isArray(json.equipo)) {
                      setLocal('rcm_equipo_cmnl', json.equipo);
                  } else {
                      try {
                          const equipoResponse = await fetch(`https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/equipocmnl.json?t=${new Date().getTime()}`, { cache: "no-store" });
                          if (equipoResponse.ok) {
                              const equipoData = await equipoResponse.json();
                              if (Array.isArray(equipoData)) {
                                  setLocal('rcm_equipo_cmnl', equipoData);
                                  setLocal('rcm_equipo_last_update', Date.now().toString());
                              }
                          }
                      } catch (equipoError) {
                          console.error("Error fetching equipo data during sync:", equipoError);
                      }
                  }

                  const getCount = (dataStr: string | null) => {
                      if (!dataStr) return 0;
                      try {
                          const p = JSON.parse(dataStr);
                          return Array.isArray(p) ? p.length : (typeof p === 'object' && p !== null ? Object.keys(p).length : 0);
                      } catch(e) { return 0; }
                  };

                  // Build Report with detailed comparison before overwriting
                  const reportParts: string[] = [];
                  
                  if (json.news) {
                      const old = getCount(localStorage.getItem('rcm_data_news'));
                      const current = json.news.length;
                      const diff = current - old;
                      reportParts.push(`📰 NOTICIAS:\n - Total actual: ${current} boletín(es).\n - ${diff > 0 ? `Se agregaron ${diff}` : (diff < 0 ? `Se eliminaron ${Math.abs(diff)}` : 'Sin variaciones en la cantidad')}.`);
                  }
                  if (json.users) {
                      const old = getCount(localStorage.getItem('rcm_data_users'));
                      const current = json.users.length;
                      const diff = current - old;
                      reportParts.push(`👤 USUARIOS:\n - Total procesado: ${current} cuenta(s).\n - ${diff > 0 ? `Nuevos registros: ${diff}` : (diff < 0 ? `Cuentas dadas de baja: ${Math.abs(diff)}` : 'Roles sincronizados (sin altas/bajas)')}.`);
                  }
                  
                  if (json.fichas || json.manualProgramming) {
                      const oldFichas = getCount(localStorage.getItem('rcm_data_fichas'));
                      const currentFichas = json.fichas ? json.fichas.length : oldFichas;
                      const oldManual = getCount(localStorage.getItem('rcm_manual_programming'));
                      const currentManual = json.manualProgramming ? json.manualProgramming.length : oldManual;
                      reportParts.push(`📻 PARRILLA DE PROGRAMACIÓN:\n - Esquema aplicado con ${currentFichas} ficha(s) técnica(s) y ${currentManual} espacio(s) manuales reprogramados.`);
                  }
                  
                  if (json.agendaPrograms || json.agendaEfemerides || json.agendaConmemoraciones || json.agendaPropaganda || json.agendaCulturalOptions) {
                      const agendaItems = [];
                      if (json.agendaEfemerides) {
                         const diff = Object.keys(json.agendaEfemerides).length - getCount(localStorage.getItem('rcm_efemerides'));
                         agendaItems.push(`Efemérides (${diff !== 0 ? (diff > 0 ? `+${diff}` : diff) : 'Actualizadas'})`);
                      }
                      if (json.agendaConmemoraciones) {
                         const diff = Object.keys(json.agendaConmemoraciones).length - getCount(localStorage.getItem('rcm_conmemoraciones'));
                         agendaItems.push(`Conmemoraciones (${diff !== 0 ? (diff > 0 ? `+${diff}` : diff) : 'Actualizadas'})`);
                      }
                      if (json.agendaPropaganda) {
                         const diff = Object.keys(json.agendaPropaganda).length - getCount(localStorage.getItem('rcm_propaganda'));
                         agendaItems.push(`Propaganda (${diff !== 0 ? (diff > 0 ? `+${diff}` : diff) : 'Analizadas'})`);
                      }
                      if (json.agendaCulturalOptions) {
                         const diff = Object.keys(json.agendaCulturalOptions).length - getCount(localStorage.getItem('rcm_cultural_options'));
                         agendaItems.push(`Opciones Culturales (${diff !== 0 ? (diff > 0 ? `+${diff}` : diff) : 'Analizadas'})`);
                      }
                      reportParts.push(`📅 AGENDA EDITORIAL:\n - Descargados pautas y datos de semana:\n   • ${agendaItems.join('\n   • ')}.`);
                  }
                  
                  if (json.managementReports || json.allConsolidatedPayments) {
                      const reportsCount = Array.isArray(json.managementReports) ? json.managementReports.length : 0;
                      const paymentsCount = Array.isArray(json.allConsolidatedPayments) ? json.allConsolidatedPayments.length : 0;
                      reportParts.push(`💼 GESTIÓN (PAGOS Y REPORTES):\n - Base de datos sincronizada con ${reportsCount} informe(s) FP-02 y ${paymentsCount} consolidación(es) de pago.`);
                  }

                  if (pendingUpdates['rcm_equipo_cmnl']) {
                      const old = getCount(localStorage.getItem('rcm_equipo_cmnl'));
                      const current = getCount(pendingUpdates['rcm_equipo_cmnl']);
                      const diff = current - old;
                      reportParts.push(`📱 DIRECTORIO (EQUIPO):\n - Directorio estructurado con ${current} miembro(s).\n - ${diff > 0 ? `Nuevas incorporaciones: ${diff}` : (diff < 0 ? `Personal saliente: ${Math.abs(diff)}` : 'Perfil sin variaciones')}.`);
                  }

                  const detailsContent = reportParts.length > 0 ? reportParts.join('\n\n') : "Se verificaron las bases de datos en la bóveda, pero no se hallaron paquetes de datos pendientes de impacto.";

                  // Atomic application of all updates
                  Object.entries(pendingUpdates).forEach(([key, value]) => {
                      localStorage.setItem(key, value);
                  });
                  
                  localStorage.setItem('last_sync_time', Date.now().toString());

                  // Only set the modal state, the component will handle the acceptance and reload
                  setUpdateDetails({ show: true, content: detailsContent });
              } catch (error) {
                  console.error("Sync Error:", error);
                  setConfirmAction({
                      title: "Error",
                      message: "Error de conexión. No se pudieron obtener los datos más recientes.",
                      onConfirm: () => setConfirmAction(null)
                  });
              } finally {
                  setIsSyncing(false);
              }
          }
      });
  };

  // Determine if Player should be visible
  const isAppView = currentView.startsWith('APP_');
  const isLoginScreen = currentView === AppView.LANDING; 
  // Hide player on WorkerHome and AdminDashboard as it's integrated there
  const isIntegratedPlayerView = currentView === AppView.WORKER_HOME || currentView === AppView.ADMIN_DASHBOARD;
  const showPlayer = !isAppView && !isLoginScreen && !isIntegratedPlayerView;

  const renderView = () => {
    switch (currentView) {
      case AppView.LANDING: // Acts as LOGIN view now
        return <PublicLanding onNavigate={setCurrentView} users={users} onLoginSuccess={(user) => {
            setCurrentUser(user);
            localStorage.setItem('rcm_user_username', user.username);
            if(user.classification === 'Administrador' || (user.role === 'admin' && user.classification !== 'Coordinador')) {
                handleNavigate(AppView.ADMIN_DASHBOARD);
            } else {
                handleNavigate(AppView.WORKER_HOME);
            }
        }} />;
      case AppView.LISTENER_HOME:
        return <ListenerHome onNavigate={handleNavigate} news={news} onSync={handleCloudSync} isSyncing={isSyncing} onMenuClick={() => setIsSidebarOpen(true)} />;
      case AppView.WORKER_HOME:
        return (
            <WorkerHome 
                onNavigate={handleNavigate} 
                news={news} 
                currentUser={currentUser} 
                onLogout={handleLogout}
                onSync={handleCloudSync}
                isSyncing={isSyncing}
                isPlaying={isPlaying}
                togglePlay={togglePlay}
                isRefreshing={isRefreshing}
                onRefreshLive={handleRefreshLive}
                currentProgram={currentProgram}
                onMenuClick={() => setIsSidebarOpen(true)}
                onBackup={handleBackup}
                setNews={setNews}
            />
        );
      case AppView.ADMIN_DASHBOARD:
        return (
          <AdminDashboard 
            onNavigate={handleNavigate} 
            news={news} 
            setNews={setNews}
            users={users}
            currentUser={currentUser}
            onLogout={handleLogout}
            onSync={handleCloudSync}
            isSyncing={isSyncing}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
            isRefreshing={isRefreshing}
            onRefreshLive={handleRefreshLive}
            currentProgram={currentProgram}
            onMenuClick={() => setIsSidebarOpen(true)}
            onBackup={handleAdminBackup}
          />
        );
      case AppView.APP_EQUIPO:
        return (
          <EquipoSection 
            onBack={handleBack} 
            onMenuClick={() => setIsSidebarOpen(true)}
            currentUser={currentUser}
            catalogo={JSON.parse(localStorage.getItem('rcm_data_catalogo') || '[]')}
            onDirtyChange={setIsDirty}
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
      
      // CMNL Apps
      case AppView.APP_AGENDA:
        return <AgendaApp onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} currentUser={currentUser} users={users} onDirtyChange={setIsDirty} />;
      case AppView.APP_MUSICA:
        return <MusicaApp onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} currentUser={currentUser} onDirtyChange={setIsDirty} />;
      case AppView.APP_REPORTES:
        return <Reports />;
      case AppView.APP_TOOLS:
        return <ToolsSection onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} currentUser={currentUser} />;
      case AppView.APP_GUIONES:
        return <GuionesApp onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} currentUser={currentUser} onDirtyChange={setIsDirty} />;
      case AppView.APP_PROGRAMACION:
        return (
          <GestionApp 
            onBack={handleBack} 
            onMenuClick={() => setIsSidebarOpen(true)} 
            currentUser={currentUser} 
            onDirtyChange={setIsDirty}
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

      // Public Sections
      case AppView.SECTION_HISTORY:
        return <PlaceholderView 
            title="Nuestra Historia" 
            subtitle="El legado de la radio" 
            onBack={handleBack} 
            onMenuClick={() => setIsSidebarOpen(true)} 
            customContent={historyContent} 
            onUpload={currentUser?.role === 'admin' ? (e, type) => {
                const file = e.target.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const text = event.target?.result as string;
                        setHistoryContent(text);
                        localStorage.setItem('rcm_data_history', text);
                        alert('Historia actualizada correctamente.');
                    };
                    reader.readAsText(file);
                }
            } : undefined}
        />;
      case AppView.SECTION_HISTORY_EVOLUTION:
        return <HistoryEvolutionView currentUser={currentUser} onBack={handleBack} />;
      case AppView.SECTION_PROGRAMMING_PUBLIC:
        return <PlaceholderView title="Parrilla de Programación" subtitle="Guía para el oyente" onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} user={currentUser} />;
      case AppView.SECTION_ABOUT:
        return <QuienesSomos onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} />;
      case AppView.SECTION_NEWS:
        return <ListenerHome onNavigate={handleNavigate} news={news} onSync={handleCloudSync} isSyncing={isSyncing} onMenuClick={() => setIsSidebarOpen(true)} />; 
      case AppView.SECTION_NEWS_DETAIL:
        return <PlaceholderView title="Noticias" subtitle={selectedNews?.category || "Actualidad"} onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} newsItem={selectedNews} user={currentUser} onNewsUpdate={(updatedNews) => {
            const updatedNewsList = news.map(n => n.id === updatedNews.id ? updatedNews : n);
            setNews(updatedNewsList);
            localStorage.setItem('rcm_data_news', JSON.stringify(updatedNewsList));
            setSelectedNews(updatedNews);
        }} />;
      case AppView.SECTION_PODCAST:
        return <PlaceholderView title="Podcasts" subtitle="Escucha a tu ritmo" onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} />;
      case AppView.SECTION_PROFILE:
        return <PlaceholderView title="Mi Perfil" subtitle="Configuración de usuario" onBack={handleBack} onMenuClick={() => setIsSidebarOpen(true)} />;
        
      default:
        return <ListenerHome onNavigate={handleNavigate} news={news} onSync={handleCloudSync} isSyncing={isSyncing} onMenuClick={() => setIsSidebarOpen(true)} />;
    }
  };

  return (
      <div className="w-full min-h-screen bg-[#1A100C] font-display">
        <audio 
          ref={audioRef} 
          src="https://icecast.teveo.cu/KR43FF7C" 
          preload="none"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        ></audio>

        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          onNavigate={handleNavigate}
          currentUser={impersonatedUser || currentUser}
          onSync={handleCloudSync}
          isSyncing={isSyncing}
          onLogout={handleLogout}
          onLogin={() => setCurrentView(AppView.LANDING)}
        />
        
        <InstallPWA />
        
        {renderView()}

        {isSyncing && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="relative">
              <div className="size-24 rounded-full border-4 border-[#9E7649]/20 border-t-[#9E7649] animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw size={32} className="text-[#9E7649] animate-pulse" />
              </div>
            </div>
            <p className="mt-6 text-[#E8DCCF] font-bold tracking-widest uppercase text-sm animate-pulse">Sincronizando datos...</p>
            <p className="mt-2 text-[#9E7649] text-xs">Por favor, espere un momento</p>
          </div>
        )}

        <BackupDialog 
          isOpen={showBackupDialog} 
          onClose={() => {
              setShowBackupDialog(false);
              if (pendingNavigation.current) {
                  pendingNavigation.current();
                  pendingNavigation.current = null;
              }
          }}
          onBackup={handleBackup}
          isLogoutTrigger={isLogoutTrigger}
        />

        {confirmAction && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-[#2C1B15] border border-[#9E7649]/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                    <h3 className="text-[#C69C6D] font-serif font-bold text-xl mb-2">{confirmAction.title}</h3>
                    <p className="text-stone-300 text-sm mb-6 leading-relaxed">{confirmAction.message}</p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setConfirmAction(null)}
                            className="flex-1 px-4 py-2 rounded-xl border border-white/10 text-stone-400 font-bold text-sm hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmAction.onConfirm}
                            className="flex-1 px-4 py-2 rounded-xl bg-[#9E7649] text-white font-bold text-sm hover:bg-[#8B653D] shadow-lg shadow-[#9E7649]/20 transition-all active:scale-95"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        )}

        <UpdateDetailsModal 
            isOpen={updateDetails?.show || false}
            details={updateDetails?.content || ""}
            isAdmin={currentUser?.role === 'admin'}
            onClose={() => {
                setUpdateDetails(null);
                window.location.reload();
            }}
        />

        <UpdateReminderModal 
            isOpen={showUpdateReminder}
            onClose={() => setShowUpdateReminder(false)}
            onUpdate={() => {
                setShowUpdateReminder(false);
                handleCloudSync();
            }}
        />

        {showPlayer && (
           <>
             <div className={`fixed bottom-0 left-0 right-0 z-[100] bg-[#3E1E16]/95 backdrop-blur-xl border-t border-[#9E7649]/20 transition-all duration-300 flex`}>
                 
                 {/* Left Info Box (Only on Desktop Listener Home) */}
                 {(currentView === AppView.LISTENER_HOME || currentView === AppView.SECTION_NEWS) && (
                    <div className="hidden md:flex flex-col justify-center w-64 bg-[#2C1B15] border-r border-white/5 px-6 shrink-0 py-3">
                        <p className="font-bold text-[#C69C6D] uppercase tracking-widest text-[10px] mb-1">Radio Ciudad Monumento</p>
                        <p className="text-[10px] text-stone-500">Voz de la segunda villa cubana</p>
                        <p className="text-[10px] text-stone-500 opacity-50 mt-1">CMNL App 2026</p>
                    </div>
                 )}

                 {/* Live Player Content */}
                 <div className="flex-1 px-4 py-3 relative" style={{ paddingBottom: 'calc(0.75rem + var(--sab))' }}>
                     <div className="max-w-md mx-auto flex items-center gap-3">
                         {/* Refresh Button replacing previous Image */}
                         <button 
                            onClick={handleRefreshLive}
                            className="w-10 h-10 rounded-lg bg-white/5 border border-[#9E7649]/20 flex items-center justify-center shrink-0 text-[#9E7649] hover:bg-[#9E7649]/10 active:scale-95 transition-all"
                            title="Actualizar transmisión"
                         >
                             <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
                         </button>

                         <div className="flex-1 min-w-0">
                            <p className="text-[#F5EFE6] text-sm font-bold truncate">{currentProgram.name}</p>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                <p className="text-[#9E7649] text-[10px] truncate">95.3 FM • Señal en vivo</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <button className="text-[#E8DCCF]/60 hover:text-[#9E7649] transition-colors"><SkipBack size={20} fill="currentColor" className="opacity-50" /></button>
                            <button 
                              onClick={togglePlay}
                              className="w-10 h-10 rounded-full bg-[#9E7649] text-[#3E1E16] flex items-center justify-center shadow-lg hover:scale-105 transition-all border border-white/10"
                            >
                               {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                            </button>
                            <button className="text-[#E8DCCF]/60 hover:text-[#9E7649] transition-colors"><SkipForward size={20} fill="currentColor" className="opacity-50" /></button>
                         </div>
                     </div>
                     <div className="absolute top-0 left-0 right-0 h-4 flex items-end justify-center gap-[1px] px-1 overflow-hidden pointer-events-none">
                        {isPlaying ? (
                            Array.from({ length: 100 }).map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-[2px] bg-[#9E7649]/40"
                                    animate={{
                                        height: [2, Math.random() * 16 + 2, 2],
                                    }}
                                    transition={{
                                        duration: 0.4 + Math.random() * 0.6,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: i * 0.01
                                    }}
                                />
                            ))
                        ) : (
                            <div className="w-full h-[1px] bg-[#9E7649]/10" />
                        )}
                     </div>
                 </div>
             </div>
             <style>{`
                @keyframes progress-indeterminate {
                    0% { left: -30%; width: 30%; }
                    50% { left: 40%; width: 40%; }
                    100% { left: 100%; width: 30%; }
                }
                .animate-progress-indeterminate {
                    animation: progress-indeterminate 2s infinite linear;
                }
             `}</style>
           </>
        )}
      </div>
  );
};

export default App;