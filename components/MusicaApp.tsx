import React, { useState, useEffect } from 'react';
import CMNLHeader from './CMNLHeader';
import { User as GlobalUser } from '../types';
import { Track, ViewState, AuthMode, User, DEFAULT_PROGRAMS_LIST, Report, ExportItem, SavedSelection } from './musica/types';
import { parseTxtDatabase, GENRES_LIST, COUNTRIES_LIST } from './musica/constants';
import TrackList from './musica/TrackList';
import TrackDetail from './musica/TrackDetail';
import CreditResults from './musica/CreditResults';
import Settings from './musica/Settings';
import Productions from './musica/Productions';
import ReportsViewer from './musica/ReportsViewer';
import Guide from './musica/Guide';
import { loadTracksFromDB, saveTracksToDB, saveReportToDB, loadReportsFromDB, loadProductionsFromDB, saveProductionToDB, saveSelectionsToDB, loadSelectionsFromDB, saveSavedSelectionsListToDB, loadSavedSelectionsListFromDB } from './musica/services/db'; 
import { generateReportPDF } from './musica/services/pdfService';
import { openWhatsApp } from '../utils/whatsappUtils';

const USERS_KEY = 'rcm_users_db';
const PROGRAMS_KEY = 'rcm_programs_list';
const getSelectionKey = () => `user_${localStorage.getItem('rcm_user_username') || 'default'}_rcm_current_selection`;
const getSavedSelectionsKey = () => `user_${localStorage.getItem('rcm_user_username') || 'default'}_rcm_saved_selections`;
const CUSTOM_ROOTS_KEY = 'rcm_custom_roots';

const USERS_DB_URL = 'https://raw.githubusercontent.com/PeJotaCuba/RCM-M-sica/refs/heads/main/musuarios.json';

const ROOT_DB_CONFIG: Record<string, { url: string, filename: string }> = {
    'Música 1': { url: 'https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/mdatos1.json', filename: 'mdatos1.json' },
    'Música 2': { url: 'https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/mdatos2.json', filename: 'mdatos2.json' },
    'Música 3': { url: 'https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/mdatos3.json', filename: 'mdatos3.json' },
    'Música 4': { url: 'https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/mdatos4.json', filename: 'mdatos4.json' },
    'Música 5': { url: 'https://raw.githubusercontent.com/PeJotaCuba/Bases-de-datos-CMNL/refs/heads/almacen/mdatos5.json', filename: 'mdatos5.json' },
    'Otros':    { url: 'https://raw.githubusercontent.com/PeJotaCuba/RCM-M-sica/refs/heads/main/motros.json', filename: 'motros.json' }
};

interface MusicaAppProps {
  currentUser: GlobalUser | null;
  onBack: () => void;
  onMenuClick: () => void;
  onDirtyChange: (dirty: boolean) => void;
}


// ...
const MusicaApp: React.FC<MusicaAppProps> = ({ currentUser: globalUser, onBack, onMenuClick, onDirtyChange }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [view, setView] = useState<ViewState>(ViewState.LIST);
  const [users, setUsers] = useState<User[]>([]);

  const [isLoaded, setIsLoaded] = useState(false);
  const isInitialMount = React.useRef(true);

  useEffect(() => {
      isInitialMount.current = false;
  }, []);

  const getUniqueId = (user: GlobalUser) => {
      const storageKey = `rcm_unique_id_${user.username}`;
      let id = localStorage.getItem(storageKey);
      if (!id) {
          const firstName = user.name ? user.name.split(' ')[0].replace(/[^a-zA-Z]/g, '').toUpperCase() : 'DIR';
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          const generateBlock = () => {
              let block = '';
              for (let i = 0; i < 4; i++) block += chars.charAt(Math.floor(Math.random() * chars.length));
              return block;
          };
          id = `${firstName}-${generateBlock()}-${generateBlock()}-${generateBlock()}`;
          localStorage.setItem(storageKey, id);
      }
      return id;
  };

  // Map global user to music app user
  const currentUser: User | null = globalUser ? {
      username: globalUser.username,
      password: globalUser.password || '',
      role: (globalUser.classification === 'Administrador' || (globalUser.role === 'admin' && globalUser.classification !== 'Coordinador') || (globalUser.classification === 'Coordinador' && (globalUser.coordinatorSections || []).includes('Música'))) ? 'admin' : (globalUser.classification === 'Director' ? 'director' : 'user'),
      fullName: globalUser.name,
      phone: globalUser.mobile || '',
      uniqueId: getUniqueId(globalUser)
  } : null;

  const authMode: AuthMode = currentUser ? currentUser.role : null;

  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedTracksList, setSelectedTracksList] = useState<Track[]>([]);
  const [savedSelections, setSavedSelections] = useState<SavedSelection[]>([]);
  const [navStack, setNavStack] = useState<ViewState[]>([ViewState.LIST]);
  const [activeRoot, setActiveRoot] = useState<string>('Música 1'); 
  const [currentPath, setCurrentPath] = useState<string>(''); 

  const [customRoots, setCustomRoots] = useState<string[]>([]);
  
  const [programs, setPrograms] = useState<string[]>(() => {
      const saved = localStorage.getItem(PROGRAMS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PROGRAMS_LIST;
  });

  useEffect(() => {
      if (!isInitialMount.current) {
          onDirtyChange(true);
      }
  }, [tracks, selectedTracksList, savedSelections, customRoots, programs, onDirtyChange]);

  const [showWishlist, setShowWishlist] = useState(false);
  const [wishlistText, setWishlistText] = useState('');

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportItems, setExportItems] = useState<ExportItem[]>([]);
  const [programName, setProgramName] = useState(programs[0] || '');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingReportId, setEditingReportId] = useState<string | null>(null); 
  const [isExportingFromSaved, setIsExportingFromSaved] = useState(false);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const navigateTo = (newView: ViewState) => {
      setNavStack(prev => [...prev, newView]);
      setView(newView);
  };

  const navigateBack = () => {
      if (currentPath !== '') {
          // Navigate back in folder hierarchy
          const pathParts = currentPath.split('/');
          pathParts.pop();
          setCurrentPath(pathParts.join('/'));
      } else if (navStack.length > 1) {
          const newStack = navStack.slice(0, -1);
          setNavStack(newStack);
          setView(newStack[newStack.length - 1]);
      } else {
          onBack();
      }
  };

  useEffect(() => {
    const initApp = async () => {
        try { const dbTracks = await loadTracksFromDB(); if (dbTracks.length > 0) setTracks(dbTracks); } catch (e) { console.error(e); }
        
        const localUsers = localStorage.getItem(USERS_KEY);
        let currentUsersList: User[] = [];
        if (localUsers) { 
            try { 
                const parsed = JSON.parse(localUsers); 
                if (Array.isArray(parsed) && parsed.length > 0) {
                    currentUsersList = parsed;
                }
            } catch { } 
        }
        setUsers(currentUsersList);

        const savedRoots = localStorage.getItem(CUSTOM_ROOTS_KEY);
        if (savedRoots) setCustomRoots(JSON.parse(savedRoots));

        try {
            const dbSelections = await loadSelectionsFromDB();
            if (dbSelections.length > 0) setSelectedTracksList(dbSelections);
        } catch (e) { console.error("Error loading selections", e); }

        try {
            const dbSavedSelections = await loadSavedSelectionsListFromDB();
            if (dbSavedSelections.length > 0) {
                setSavedSelections(dbSavedSelections);
            } else {
                // Fallback to localStorage if DB is empty (migration)
                const savedSels = localStorage.getItem(getSavedSelectionsKey());
                if (savedSels) setSavedSelections(JSON.parse(savedSels));
            }
        } catch (e) { console.error("Error loading saved selections groups", e); }

        setIsLoaded(true);
    };
    
    initApp();
  }, []);

  useEffect(() => {
    if (isLoaded) {
        saveSelectionsToDB(selectedTracksList);
    }
  }, [selectedTracksList, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
        saveSavedSelectionsListToDB(savedSelections);
    }
  }, [savedSelections, isLoaded]);

  useEffect(() => { if (authMode) localStorage.setItem(getSelectionKey(), JSON.stringify(selectedTracksList)); }, [selectedTracksList, authMode]);
  useEffect(() => { if (authMode) localStorage.setItem(getSavedSelectionsKey(), JSON.stringify(savedSelections)); }, [savedSelections, authMode]);

  const updateTracks = async (newTracksInput: Track[] | ((prev: Track[]) => Track[])) => {
      let finalTracks: Track[];
      if (typeof newTracksInput === 'function') { finalTracks = newTracksInput(tracks); } else { finalTracks = newTracksInput; }
      setTracks(finalTracks);
      setIsSaving(true);
      try { await saveTracksToDB(finalTracks); } catch (e) { console.error("Error guardando DB:", e); } finally { setIsSaving(false); }
  };

  const handleExportUsersDB = () => {
      const exportData = { users: users, customRoots: customRoots };
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = "musuarios.json";
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const handleSyncRoot = async (rootName: string) => {
      const config = ROOT_DB_CONFIG[rootName];
      if (!config) return alert(`No hay configuración remota para ${rootName}`);
      setIsUpdating(true);
      try {
          const r = await fetch(config.url);
          if (!r.ok) throw new Error("Error DB");
          const newTracks: Track[] = await r.json();
          const otherTracks = tracks.filter(t => !t.path.startsWith(rootName));
          await updateTracks([...otherTracks, ...newTracks]);
          setIsUpdating(false);
          alert(`Base de datos de ${rootName} actualizada.`);
      } catch (e) { 
          setIsUpdating(false);
          alert(`Error al actualizar ${rootName}.`); 
      }
  };

  const handleExportRoot = (rootName: string) => {
      const rootTracks = tracks.filter(t => t.path.startsWith(rootName));
      if (rootTracks.length === 0) return alert(`No hay datos en ${rootName}.`);
      const config = ROOT_DB_CONFIG[rootName];
      const dataStr = JSON.stringify(rootTracks, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = config ? config.filename : `${rootName.replace(/\s+/g, '').toLowerCase()}.json`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const handleClearRoot = async (rootName: string) => {
      if (!window.confirm(`¿Borrar ${rootName}?`)) return;
      const remainingTracks = tracks.filter(t => !t.path.startsWith(rootName));
      await updateTracks(remainingTracks);
  };

  const handleAddCustomRoot = (name: string) => { const newRoots = [...customRoots, name]; setCustomRoots(newRoots); localStorage.setItem(CUSTOM_ROOTS_KEY, JSON.stringify(newRoots)); };
  const handleRenameRoot = async (oldName: string, newName: string) => {
      const newRoots = customRoots.map(r => r === oldName ? newName : r);
      setCustomRoots(newRoots); 
      localStorage.setItem(CUSTOM_ROOTS_KEY, JSON.stringify(newRoots));
      const updatedTracks = tracks.map(t => t.path.startsWith(oldName) ? { ...t, path: t.path.replace(oldName, newName) } : t);
      setIsUpdating(true);
      try {
          await updateTracks(updatedTracks);
          setIsUpdating(false);
          alert(`Carpeta renombrada.`);
      } catch (e) {
          setIsUpdating(false);
          alert("Error al renombrar carpeta.");
      }
  };

  const handleUploadMultipleTxt = async (files: FileList, targetRoot: string) => {
      if (!files || files.length === 0) return;
      setIsUpdating(true);
      let allNewParsedTracks: Track[] = [];
      try {
          for (let i = 0; i < files.length; i++) {
              const text = await files[i].text();
              const parsed = parseTxtDatabase(text, targetRoot);
              allNewParsedTracks = [...allNewParsedTracks, ...parsed];
          }
          
          const normalize = (s: string) => (s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const getTrackKey = (t: Track) => `${normalize(t.metadata.title)}|${normalize(t.metadata.performer)}|${normalize(t.metadata.author)}`;

          // Batch process all parsed tracks into a single update
          await updateTracks(prev => {
              const updated = [...prev];
              // Crear un mapa de búsqueda para los tracks existentes
              const existingMap = new Map<string, number>();
              updated.forEach((t, i) => {
                  existingMap.set(getTrackKey(t), i);
              });

              allNewParsedTracks.forEach(newTrack => {
                  const key = getTrackKey(newTrack);
                  const existingIndex = existingMap.get(key);

                  if (existingIndex !== undefined) {
                      updated[existingIndex] = {
                          ...newTrack,
                          id: updated[existingIndex].id 
                      };
                  } else {
                      updated.push(newTrack);
                      existingMap.set(key, updated.length - 1);
                  }
              });
              return updated;
          });
          
          setIsUpdating(false);
          alert(`${allNewParsedTracks.length} pistas procesadas correctamente.`);
      } catch (e) {
          console.error(e);
          setIsUpdating(false);
          alert("Error al cargar archivos TXT.");
      }
  };

  const handleSelectTrack = (track: Track) => { setSelectedTrack(track); };
  const handleToggleSelection = (track: Track) => { 
      onDirtyChange(true);
      setSelectedTracksList(prev => prev.find(t => t.id === track.id) ? prev.filter(t => t.id !== track.id) : [...prev, track]); 
  };

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [pendingSelectionToLoad, setPendingSelectionToLoad] = useState<SavedSelection | null>(null);
  const [showLoadConflictModal, setShowLoadConflictModal] = useState(false);
  const [currentSelectionId, setCurrentSelectionId] = useState<string | null>(null);
  const [selectionToDelete, setSelectionToDelete] = useState<string | null>(null);

  const handleSaveSelectionClick = () => {
      if (selectedTracksList.length === 0) return alert("Selección vacía.");
      
      // Initialize editing state for the save modal
      const items: ExportItem[] = selectedTracksList.map(t => ({ 
          id: t.id, 
          title: t.metadata.title, 
          author: t.metadata.author, 
          authorCountry: t.metadata.authorCountry || '', 
          performer: t.metadata.performer, 
          performerCountry: t.metadata.performerCountry || '', 
          genre: t.metadata.genre || '', 
          source: 'db', 
          path: t.path 
      }));
      setExportItems(items);
      
      if (currentSelectionId) {
          const sel = savedSelections.find(s => s.id === currentSelectionId);
          if (sel) {
              setSaveName(sel.name);
              if (sel.program) setProgramName(sel.program);
              if (sel.date) setReportDate(sel.date.split('T')[0]);
          }
      } else {
          setSaveName('');
          // Keep current programName and reportDate or reset them?
          // User said "sale la fecha y el nombre... además del programa para escoger"
          // So we use current state values.
      }
      
      setShowSaveModal(true);
  };

  const confirmSaveSelection = () => {
      if (!saveName.trim()) return;
      
      // Map exportItems back to Tracks to preserve edits in the saved selection
      const updatedTracks: Track[] = exportItems.map(item => {
          const original = selectedTracksList.find(t => t.id === item.id);
          return {
              ...original!,
              metadata: {
                  ...original!.metadata,
                  title: item.title,
                  author: item.author,
                  authorCountry: item.authorCountry,
                  performer: item.performer,
                  performerCountry: item.performerCountry,
                  genre: item.genre
              }
          };
      });

      if (currentSelectionId) {
          setSavedSelections(prev => {
              const updated = prev.map(s => 
                  s.id === currentSelectionId 
                      ? { ...s, name: saveName.trim(), tracks: updatedTracks, date: new Date(reportDate).toISOString(), program: programName }
                      : s
              );
              saveSavedSelectionsListToDB(updated);
              return updated;
          });
          
          // Clear selection after update
          setSelectedTracksList([]);
          setCurrentSelectionId(null);
          localStorage.removeItem(getSelectionKey());
          
          alert("Selección actualizada correctamente.");
      } else {
          if (savedSelections.length >= 5) return alert("Límite de 5 selecciones.");
          
          const newSelection: SavedSelection = { 
              id: `sel-${Date.now()}`, 
              name: saveName.trim(), 
              date: new Date(reportDate).toISOString(), 
              tracks: updatedTracks,
              program: programName
          };
          
          setSavedSelections(prev => {
              const updated = [newSelection, ...prev];
              saveSavedSelectionsListToDB(updated);
              return updated;
          });
          
          if (pendingSelectionToLoad) {
              setSelectedTracksList(pendingSelectionToLoad.tracks);
              setCurrentSelectionId(pendingSelectionToLoad.id);
              if (pendingSelectionToLoad.program) setProgramName(pendingSelectionToLoad.program);
              if (pendingSelectionToLoad.date) setReportDate(pendingSelectionToLoad.date.split('T')[0]);
              setPendingSelectionToLoad(null);
              alert("Selección actual guardada y nueva selección cargada.");
          } else {
              // Clear selection after save
              setSelectedTracksList([]);
              setCurrentSelectionId(null);
              localStorage.removeItem(getSelectionKey());
              
              alert("Selección guardada correctamente.");
          }
      }
      
      setShowSaveModal(false);
      onDirtyChange?.(true);
  };

  const handleClearSelectionClick = () => {
      setShowClearConfirm(true);
  };

  const confirmClearSelection = () => {
      setSelectedTracksList([]);
      setCurrentSelectionId(null);
      localStorage.removeItem(getSelectionKey());
      setShowClearConfirm(false);
  };

  const handleLoadSavedSelection = (sel: SavedSelection) => {
      if (selectedTracksList.length > 0 && currentSelectionId !== sel.id) {
          setPendingSelectionToLoad(sel);
          setShowLoadConflictModal(true);
      } else {
          setSelectedTracksList(sel.tracks);
          setCurrentSelectionId(sel.id);
          if (sel.program) setProgramName(sel.program);
          if (sel.date) setReportDate(sel.date.split('T')[0]);
      }
  };

  const handleMergeSelection = () => {
      if (!pendingSelectionToLoad) return;
      const currentIds = new Set(selectedTracksList.map(t => t.id));
      const toAdd = pendingSelectionToLoad.tracks.filter(t => !currentIds.has(t.id));
      setSelectedTracksList(prev => [...prev, ...toAdd]);
      // When merging, we lose the "identity" of the loaded selection, it becomes a new mix
      // or we could argue it remains the current one if we were already in one?
      // Safest is to treat as modified/new if we are merging into something else.
      // But if we were "New", we stay "New".
      setPendingSelectionToLoad(null);
      setShowLoadConflictModal(false);
      alert("Selecciones integradas.");
  };

  const handleSaveAndReplaceClick = () => {
      setShowLoadConflictModal(false);
      setSaveName('');
      setShowSaveModal(true);
  };

  const handleDeleteSavedSelectionClick = (id: string) => { 
      setSelectionToDelete(id); 
  };

  const confirmDeleteSelection = () => {
      if (selectionToDelete) {
          setSavedSelections(prev => {
              const updated = prev.filter(s => s.id !== selectionToDelete);
              saveSavedSelectionsListToDB(updated);
              return updated;
          });
          if (currentSelectionId === selectionToDelete) {
              setCurrentSelectionId(null);
          }
          setSelectionToDelete(null);
      }
  };

  const handleProcessWishlist = () => {
      if (!wishlistText.trim()) return;
      const queries = wishlistText.split('\n').map(l => l.trim()).filter(l => l);
      const found: Track[] = [];
      queries.forEach(q => {
          const match = tracks.find(t => t.metadata.title.toLowerCase().includes(q.toLowerCase()) || t.filename.toLowerCase().includes(q.toLowerCase()));
          if (match && !selectedTracksList.find(s => s.id === match.id)) found.push(match);
      });
      if (found.length > 0) { setSelectedTracksList(prev => [...prev, ...found]); alert(`${found.length} añadidos.`); } else { alert("Sin coincidencias."); }
      setShowWishlist(false); setWishlistText('');
  };

  const handleOpenExportModal = () => {
      setEditingReportId(null);
      setIsExportingFromSaved(false);
      setReportDate(new Date().toISOString().split('T')[0]);
      const items: ExportItem[] = selectedTracksList.map(t => ({ id: t.id, title: t.metadata.title, author: t.metadata.author, authorCountry: t.metadata.authorCountry || '', performer: t.metadata.performer, performerCountry: t.metadata.performerCountry || '', genre: t.metadata.genre || '', source: 'db', path: t.path }));
      setExportItems(items); setShowExportModal(true);
  };

  const handleUpdateExportItem = (index: number, field: keyof ExportItem, value: string) => {
      const newItems = [...exportItems]; newItems[index] = { ...newItems[index], [field]: value }; setExportItems(newItems);
  };

  const handleRemoveExportItem = (indexToRemove: number) => {
      setExportItems(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleShareWhatsApp = () => {
      let message = `*CRÉDITOS RCM*\n*Programa:* ${programName}\n*Fecha:* ${reportDate}\n\n`;
      exportItems.forEach(item => { message += `🎵 *${item.title}* - ${item.author} - ${item.performer}\n📂 _${item.path || 'Manual'}_\n\n`; });
      openWhatsApp(message);
  };

  const handleDownloadReport = async () => {
      if (!currentUser) return;
      const pdfBlob = generateReportPDF({ 
          userFullName: currentUser.fullName, 
          userUniqueId: currentUser.uniqueId || 'N/A', 
          program: programName, 
          date: reportDate,
          items: exportItems 
      });
      const fileName = `PM-${programName}-${reportDate}.pdf`;
      await saveReportToDB({ 
          id: editingReportId || `rep-${Date.now()}`, 
          date: reportDate, 
          program: programName, 
          generatedBy: currentUser.username, 
          fileName, 
          pdfBlob, 
          items: exportItems, 
          status: { downloaded: false, sent: false } 
      });
      
      if (editingReportId) {
          alert("Reporte actualizado correctamente.");
          setReportsRefreshKey(prev => prev + 1);
      } else {
          alert("Reporte generado y guardado en Registros.");
          
          if (isExportingFromSaved) {
              // Clear saved selections if we exported from there
              setSavedSelections([]);
              saveSavedSelectionsListToDB([]);
              localStorage.removeItem(getSavedSelectionsKey());
          } else {
              // Clear current selection
              setSelectedTracksList([]);
              setCurrentSelectionId(null);
              localStorage.removeItem(getSelectionKey());
          }
      }
      
      setShowExportModal(false);
  };

  const handleSaveEdit = (updatedTrack: Track) => {
      onDirtyChange(true);
      updateTracks(prev => prev.map(t => t.id === updatedTrack.id ? updatedTrack : t));
      if (view === ViewState.SELECTION) setSelectedTracksList(prev => prev.map(t => t.id === updatedTrack.id ? updatedTrack : t));
      setSelectedTrack(null);
  };

  const handleEditReport = (report: Report) => {
      setEditingReportId(report.id);
      setProgramName(report.program);
      // Ensure we only take the date part if it's an ISO string
      setReportDate(report.date.split('T')[0]);
      setExportItems(report.items || []);
      setShowExportModal(true);
  };

  const handleBulkExport = async () => {
      if (!currentUser) return;
      setIsUpdating(true);
      try {
          const now = Date.now();
          const todayStr = new Date().toISOString().split('T')[0];
          for (let i = 0; i < savedSelections.length; i++) {
              const sel = savedSelections[i];
              const items: ExportItem[] = sel.tracks.map(t => ({ id: t.id, title: t.metadata.title, author: t.metadata.author, authorCountry: t.metadata.authorCountry || '', performer: t.metadata.performer, performerCountry: t.metadata.performerCountry || '', genre: t.metadata.genre || '', source: 'db', path: t.path }));
              const pdfBlob = generateReportPDF({ 
                  userFullName: currentUser.fullName, 
                  userUniqueId: currentUser.uniqueId || 'N/A', 
                  program: programName, 
                  date: todayStr,
                  items: items 
              });
              const fileName = `PM-${sel.name}-${todayStr}.pdf`;
              await saveReportToDB({ 
                  id: `rep-${now}-${i}-${sel.id}`, 
                  date: todayStr, 
                  program: programName, 
                  generatedBy: currentUser.username, 
                  fileName, 
                  pdfBlob, 
                  items: items, 
                  status: { downloaded: false, sent: false } 
              });
          }
          // Clear saved selections after bulk export
          setSavedSelections([]);
          saveSavedSelectionsListToDB([]);
          localStorage.removeItem(getSavedSelectionsKey());
          
          alert("Se generaron los pdf de las selecciones musicales, consulte en Reportes.");
      } catch (e) {
          console.error(e);
          alert("Error al generar reportes masivos.");
      } finally {
          setIsUpdating(false);
      }
  };

  const handleSelectionAction = async () => {
      if (selectedTracksList.length > 0) {
          handleOpenExportModal();
      } else if (savedSelections.length > 0) {
          if (savedSelections.length === 1) {
              const sel = savedSelections[0];
              setEditingReportId(null);
              setIsExportingFromSaved(true);
              setProgramName(programName);
              setReportDate(new Date().toISOString().split('T')[0]);
              setExportItems(sel.tracks.map(t => ({ id: t.id, title: t.metadata.title, author: t.metadata.author, authorCountry: t.metadata.authorCountry || '', performer: t.metadata.performer, performerCountry: t.metadata.performerCountry || '', genre: t.metadata.genre || '', source: 'db', path: t.path })));
              setShowExportModal(true);
          } else {
              await handleBulkExport();
          }
      }
  };

  return (
    <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
      <CMNLHeader 
        user={globalUser ? { name: globalUser.name, role: globalUser.role } : null}
        sectionTitle="Música CMNL"
        onMenuClick={onMenuClick}
        onBack={navigateBack}
      />
      
      <div className="flex-1 overflow-hidden relative flex flex-col">
            {view === ViewState.LIST && (
                <TrackList 
                    tracks={tracks} onSelectTrack={handleSelectTrack} onUploadTxt={handleUploadMultipleTxt} isAdmin={authMode === 'admin'} 
                    onSyncRoot={handleSyncRoot} onExportRoot={handleExportRoot} onClearRoot={handleClearRoot} 
                    customRoots={customRoots} onAddCustomRoot={handleAddCustomRoot} onRenameRoot={handleRenameRoot}
                    selectedTrackIds={new Set(selectedTracksList.map(t => t.id))} onToggleSelection={handleToggleSelection}
                    activeRoot={activeRoot} setActiveRoot={setActiveRoot} currentPath={currentPath} setCurrentPath={setCurrentPath}
                />
            )}
            
            {view === ViewState.SELECTION && (
                <div className="h-full bg-[#1A100C] flex flex-col">
                     <div className="p-4 bg-[#2C1B15] border-b border-[#9E7649]/20 flex items-center justify-between">
                          <div className="flex flex-col">
                              <h2 className="font-bold text-white flex items-center gap-2"><span className="material-symbols-outlined text-[#9E7649]">checklist</span> Selección</h2>
                              {currentSelectionId && (
                                  <span className="text-xs text-[#9E7649] font-bold ml-8">
                                      {savedSelections.find(s => s.id === currentSelectionId)?.name}
                                  </span>
                              )}
                          </div>
                          <div className="flex gap-2">
                              <button onClick={() => setShowWishlist(true)} className="text-[9px] font-bold uppercase bg-[#9E7649]/10 text-[#9E7649] px-3 py-1.5 rounded-lg flex items-center gap-1">Deseos</button>
                              <button onClick={handleClearSelectionClick} className="text-[9px] font-bold uppercase bg-red-900/20 text-red-400 px-3 py-1.5 rounded-lg flex items-center gap-1">Limpiar</button>
                          </div>
                     </div>
                     
                     {savedSelections.length > 0 && (
                        <div className="flex flex-col">
                            <div className="bg-[#2C1B15] border-b border-[#9E7649]/10 p-2">
                                <p className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase tracking-widest px-2 mb-2">Guardadas ({savedSelections.length}/5)</p>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-2">
                                    {savedSelections.map(sel => (
                                        <div key={sel.id} className={`flex-none border rounded-lg p-2 min-w-[120px] flex flex-col gap-1 ${currentSelectionId === sel.id ? 'bg-[#9E7649]/10 border-[#9E7649]' : 'bg-[#1A100C] border-[#9E7649]/20'}`}>
                                            <div className="flex justify-between items-start">
                                                <span className="font-bold text-xs text-white truncate w-20">{sel.name}</span>
                                                <button onClick={() => handleDeleteSavedSelectionClick(sel.id)} className="text-[#E8DCCF]/40 hover:text-red-400"><span className="material-symbols-outlined text-xs">close</span></button>
                                            </div>
                                            <div className="text-[9px] text-[#E8DCCF]/60">{sel.tracks.length} temas</div>
                                            <button onClick={() => handleLoadSavedSelection(sel)} className={`text-[9px] border rounded py-1 font-bold transition-colors ${currentSelectionId === sel.id ? 'bg-[#9E7649] text-white border-[#9E7649]' : 'bg-[#2C1B15] border-[#9E7649]/30 text-[#9E7649] hover:bg-[#9E7649] hover:text-white'}`}>
                                                {currentSelectionId === sel.id ? 'Actualizar' : 'Cargar'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                     )}

                     <div className="flex-1 overflow-y-auto">
                        <TrackList 
                            tracks={selectedTracksList} onSelectTrack={handleSelectTrack} onUploadTxt={() => {}} isAdmin={false} 
                            onSyncRoot={() => {}} onExportRoot={() => {}} onClearRoot={() => {}} 
                            isSelectionView={true} customRoots={[]} onAddCustomRoot={() => {}} onRenameRoot={() => {}}
                            onToggleSelection={handleToggleSelection} selectedTrackIds={new Set(selectedTracksList.map(t => t.id))}
                        />
                     </div>
                     <div className="p-4 bg-[#2C1B15] border-t border-[#9E7649]/20 flex flex-col gap-2">
                          <button onClick={handleSaveSelectionClick} className={`w-full text-white py-3 rounded-xl font-bold text-xs shadow-md flex items-center justify-center gap-2 ${currentSelectionId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}>
                              <span className="material-symbols-outlined text-sm">{currentSelectionId ? 'sync' : 'save'}</span> 
                              {currentSelectionId ? 'Actualizar Selección' : 'Guardar Selección'}
                          </button>
                          <button onClick={handleSelectionAction} className="w-full bg-[#9E7649] text-white py-3.5 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-[#8B653D]">
                             <span className="material-symbols-outlined">ios_share</span> {selectedTracksList.length > 0 ? 'Exportar / Compartir' : (savedSelections.length > 0 ? 'Exportar / Compartir Masivo' : 'Exportar Selección')}
                          </button>
                     </div>
                </div>
            )}

            {/* Modals */}
            {selectionToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectionToDelete(null)}>
                    <div className="w-full max-w-sm bg-[#2C1B15] rounded-2xl p-6 shadow-2xl border border-[#9E7649]/30" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-lg mb-2 text-white">¿Eliminar Selección?</h3>
                        <p className="text-sm text-[#E8DCCF]/60 mb-6">Se eliminará la selección guardada "{savedSelections.find(s => s.id === selectionToDelete)?.name}". Esta acción no se puede deshacer.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setSelectionToDelete(null)} className="flex-1 py-3 text-[#E8DCCF]/60 font-bold hover:text-white">Cancelar</button>
                            <button onClick={confirmDeleteSelection} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
            {showSaveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowSaveModal(false)}>
                    <div className="w-full max-w-lg bg-[#2C1B15] rounded-2xl shadow-2xl flex flex-col h-[85vh] border border-[#9E7649]/30" onClick={e => e.stopPropagation()}>
                        
                        <div className="flex justify-between items-center p-4 border-b border-[#9E7649]/20 shrink-0 bg-[#1A100C] rounded-t-2xl">
                            <div>
                                <h3 className="font-bold text-white">Guardar Selección</h3>
                                <p className="text-xs text-[#E8DCCF]/60">Edita los detalles antes de guardar</p>
                            </div>
                            <button onClick={() => setShowSaveModal(false)}><span className="material-symbols-outlined text-[#E8DCCF]/40 hover:text-white">close</span></button>
                        </div>

                        <div className="p-4 bg-[#2C1B15] border-b border-[#9E7649]/20 shrink-0 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-[#E8DCCF]/60 block mb-1">Nombre de la Selección</label>
                                <input 
                                    autoFocus
                                    className="w-full p-2 border border-[#9E7649]/30 bg-[#1A100C] text-white rounded-lg text-sm outline-none focus:border-[#9E7649]" 
                                    placeholder="Ej: Programa Lunes..." 
                                    value={saveName} 
                                    onChange={e => setSaveName(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-[#E8DCCF]/60 block mb-1">Programa</label>
                                    <select value={programName} onChange={e => setProgramName(e.target.value)} className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649]">
                                        {DEFAULT_PROGRAMS_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[#E8DCCF]/60 block mb-1">Fecha</label>
                                    <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649]" />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {exportItems.map((item, idx) => (
                                <div key={item.id} className="relative p-4 border border-[#9E7649]/20 rounded-xl bg-[#1A100C] shadow-sm">
                                    <button 
                                        onClick={() => handleRemoveExportItem(idx)}
                                        className="absolute top-2 right-2 text-red-500 hover:text-red-400 p-1 rounded-full hover:bg-red-500/10 transition-colors"
                                        title="Eliminar tema"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                    <div className="mb-2">
                                        <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Título</label>
                                        <input className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-white text-sm font-bold outline-none focus:border-[#9E7649]" value={item.title} onChange={e => handleUpdateExportItem(idx, 'title', e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Autor</label>
                                            <input className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-white text-xs outline-none focus:border-[#9E7649]" value={item.author} onChange={e => handleUpdateExportItem(idx, 'author', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Intérprete</label>
                                            <input className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-white text-xs outline-none focus:border-[#9E7649]" value={item.performer} onChange={e => handleUpdateExportItem(idx, 'performer', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Género</label>
                                            <select className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-white text-xs outline-none focus:border-[#9E7649]" value={item.genre} onChange={e => handleUpdateExportItem(idx, 'genre', e.target.value)}>
                                                <option value="" className="bg-[#2C1B15]">Seleccionar...</option>
                                                {GENRES_LIST.map(g => <option key={g} value={g} className="bg-[#2C1B15]">{g}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Origen</label>
                                            <input className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-[#E8DCCF]/40 text-[10px] outline-none" value={item.path} readOnly />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-[#9E7649]/20 shrink-0 bg-[#1A100C] rounded-b-2xl flex gap-3">
                            <button onClick={() => setShowSaveModal(false)} className="flex-1 py-3 text-[#E8DCCF]/60 font-bold hover:text-white">Cancelar</button>
                            <button onClick={confirmSaveSelection} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700">Guardar Selección</button>
                        </div>
                    </div>
                </div>
            )}

            {showClearConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowClearConfirm(false)}>
                    <div className="w-full max-w-sm bg-[#2C1B15] rounded-2xl p-6 shadow-2xl border border-[#9E7649]/30" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-lg mb-2 text-white">¿Limpiar selección?</h3>
                        <p className="text-sm text-[#E8DCCF]/60 mb-6">Se eliminarán todas las pistas de la lista actual. Esta acción no se puede deshacer.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 text-[#E8DCCF]/60 font-bold hover:text-white">Cancelar</button>
                            <button onClick={confirmClearSelection} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg hover:bg-red-700">Limpiar Todo</button>
                        </div>
                    </div>
                </div>
            )}

            {showLoadConflictModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowLoadConflictModal(false)}>
                    <div className="w-full max-w-sm bg-[#2C1B15] rounded-2xl p-6 shadow-2xl border border-[#9E7649]/30" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-lg mb-4 text-white">Selección en curso</h3>
                        <p className="text-sm text-[#E8DCCF]/60 mb-6">Ya tienes pistas seleccionadas. ¿Qué deseas hacer con la selección guardada?</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleMergeSelection} className="w-full py-3 bg-[#9E7649] text-white rounded-xl font-bold shadow-lg hover:bg-[#8B653D]">
                                Integrar (Sumar a la actual)
                            </button>
                            <button onClick={handleSaveAndReplaceClick} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700">
                                Guardar actual y Abrir nueva
                            </button>
                            <button onClick={() => { setShowLoadConflictModal(false); setPendingSelectionToLoad(null); }} className="w-full py-3 text-[#E8DCCF]/60 font-bold hover:text-white">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {view === ViewState.SETTINGS && authMode === 'admin' && <Settings tracks={tracks} users={users} onAddUser={() => {}} onEditUser={() => {}} onDeleteUser={() => {}} onExportUsers={handleExportUsersDB} onImportUsers={() => {}} currentUser={currentUser} />}
            {view === ViewState.PRODUCTIONS && authMode === 'admin' && <Productions onUpdateTracks={updateTracks} allTracks={tracks} />}
            {view === ViewState.REPORTS && authMode === 'director' && <ReportsViewer onEdit={handleEditReport} currentUser={currentUser} refreshTrigger={reportsRefreshKey} />}
            {view === ViewState.GUIDE && authMode !== 'admin' && <Guide />}
        </div>

        {selectedTrack && (
            <TrackDetail 
                track={selectedTrack} authMode={authMode} onClose={() => setSelectedTrack(null)} 
                onSearchCredits={() => {}} 
                onSaveEdit={handleSaveEdit}
            />
        )}

        {showWishlist && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowWishlist(false)}>
                <div className="w-full max-w-sm bg-[#2C1B15] rounded-2xl p-6 shadow-2xl border border-[#9E7649]/30" onClick={e => e.stopPropagation()}>
                    <h3 className="font-bold text-lg mb-2 text-white">Lista de Deseos</h3>
                    <textarea className="w-full h-40 p-3 border border-[#9E7649]/30 bg-[#1A100C] text-white rounded-xl text-sm outline-none focus:border-[#9E7649]" placeholder="Títulos..." value={wishlistText} onChange={e => setWishlistText(e.target.value)} />
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setShowWishlist(false)} className="flex-1 py-3 text-[#E8DCCF]/60 font-bold hover:text-white">Cerrar</button>
                        <button onClick={handleProcessWishlist} className="flex-1 py-3 bg-[#9E7649] text-white rounded-xl font-bold shadow-lg hover:bg-[#8B653D]">Buscar</button>
                    </div>
                </div>
            </div>
        )}

        {showExportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowExportModal(false)}>
                <div className="w-full max-w-lg bg-[#2C1B15] rounded-2xl shadow-2xl flex flex-col h-[85vh] border border-[#9E7649]/30" onClick={e => e.stopPropagation()}>
                    
                    <div className="flex justify-between items-center p-4 border-b border-[#9E7649]/20 shrink-0 bg-[#1A100C] rounded-t-2xl">
                        <div>
                            <h3 className="font-bold text-white">{editingReportId ? 'Edición PDF' : 'Exportar Selección'}</h3>
                            <p className="text-xs text-[#E8DCCF]/60">Edita los detalles antes de {editingReportId ? 'actualizar' : 'compartir'}</p>
                        </div>
                        <button onClick={() => setShowExportModal(false)}><span className="material-symbols-outlined text-[#E8DCCF]/40 hover:text-white">close</span></button>
                    </div>

                    <div className="p-4 bg-[#2C1B15] border-b border-[#9E7649]/20 shrink-0 grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-[#E8DCCF]/60 block mb-1">Programa</label>
                            <select value={programName} onChange={e => setProgramName(e.target.value)} className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649]">
                                {DEFAULT_PROGRAMS_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[#E8DCCF]/60 block mb-1">Fecha</label>
                            <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="w-full p-2 border border-[#9E7649]/30 rounded bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649]" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {exportItems.map((item, idx) => (
                            <div key={item.id} className="relative p-4 border border-[#9E7649]/20 rounded-xl bg-[#1A100C] shadow-sm">
                                <button 
                                    onClick={() => handleRemoveExportItem(idx)}
                                    className="absolute top-2 right-2 text-red-500 hover:text-red-400 p-1 rounded-full hover:bg-red-500/10 transition-colors"
                                    title="Eliminar tema"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                                <div className="mb-2">
                                    <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Título</label>
                                    <input className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-white text-sm font-bold outline-none focus:border-[#9E7649]" value={item.title} onChange={e => handleUpdateExportItem(idx, 'title', e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Autor</label>
                                        <input className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-white text-xs outline-none focus:border-[#9E7649]" value={item.author} onChange={e => handleUpdateExportItem(idx, 'author', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">País Autor</label>
                                        <input className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-white text-xs outline-none focus:border-[#9E7649]" list="country-options" value={item.authorCountry} onChange={e => handleUpdateExportItem(idx, 'authorCountry', e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Intérprete</label>
                                        <input className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-white text-xs outline-none focus:border-[#9E7649]" value={item.performer} onChange={e => handleUpdateExportItem(idx, 'performer', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">País Intérprete</label>
                                        <input className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-white text-xs outline-none focus:border-[#9E7649]" list="country-options" value={item.performerCountry} onChange={e => handleUpdateExportItem(idx, 'performerCountry', e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[#E8DCCF]/60 uppercase">Género</label>
                                    <input className="w-full p-1 border-b border-[#9E7649]/30 bg-transparent text-white text-xs outline-none focus:border-[#9E7649]" list="genre-options" value={item.genre} onChange={e => handleUpdateExportItem(idx, 'genre', e.target.value)} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 grid grid-cols-2 gap-3 bg-[#1A100C] border-t border-[#9E7649]/20 rounded-b-2xl shrink-0">
                        {editingReportId ? (
                            <>
                                <button onClick={() => setShowExportModal(false)} className="bg-[#2C1B15] text-[#E8DCCF]/60 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:text-white">
                                    Cancelar
                                </button>
                                <button onClick={handleDownloadReport} className="bg-[#9E7649] hover:bg-[#8B653D] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm">
                                    <i className="material-symbols-outlined text-lg">save</i> Actualizar pdf
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={handleShareWhatsApp} className={`bg-[#25D366] hover:bg-[#1DA851] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm ${authMode !== 'director' ? 'col-span-2' : ''}`}>
                                    <i className="material-symbols-outlined text-lg">chat</i> WhatsApp
                                </button>
                                {authMode === 'director' && (
                                    <button onClick={handleDownloadReport} className="bg-[#9E7649] hover:bg-[#8B653D] text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm">
                                        <i className="material-symbols-outlined text-lg">picture_as_pdf</i> Generar PDF
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}

        {isUpdating && (
            <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                <div className="bg-[#2C1B15] border border-[#9E7649]/30 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3 animate-fade-in">
                    <div className="relative size-12">
                        <svg className="animate-spin size-12 text-[#E8DCCF]/20" viewBox="0 0 24 24"></svg> 
                        <div className="absolute inset-0 border-4 border-[#9E7649] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="text-center">
                        <h4 className="font-bold text-white">Actualizando</h4>
                        <p className="text-xs text-[#E8DCCF]/60">Por favor espere...</p>
                    </div>
                </div>
            </div>
        )}

        <nav className="bg-[#2C1B15] border-t border-[#9E7649]/20 h-20 px-4 flex items-center justify-between pb-2 z-20 shrink-0">
            <NavButton icon="folder_open" label="Explorar" active={view === ViewState.LIST} onClick={() => navigateTo(ViewState.LIST)} />
            <NavButton icon="checklist" label="Selección" active={view === ViewState.SELECTION} onClick={() => navigateTo(ViewState.SELECTION)} />
            {authMode === 'director' && <NavButton icon="description" label="Reportes" active={view === ViewState.REPORTS} onClick={() => navigateTo(ViewState.REPORTS)} />}
            {authMode === 'admin' && <NavButton icon="playlist_add" label="Producción" active={view === ViewState.PRODUCTIONS} onClick={() => navigateTo(ViewState.PRODUCTIONS)} />}
            {authMode === 'admin' && <NavButton icon="settings" label="Ajustes" active={view === ViewState.SETTINGS} onClick={() => navigateTo(ViewState.SETTINGS)} />}
            {authMode !== 'admin' && <NavButton icon="help" label="Guía" active={view === ViewState.GUIDE} onClick={() => navigateTo(ViewState.GUIDE)} />}
        </nav>
    </div>
  );
};

const NavButton: React.FC<{ icon: string, label: string, active: boolean, onClick: () => void }> = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center transition-all ${active ? 'text-[#9E7649]' : 'text-[#E8DCCF]/40 hover:text-[#E8DCCF]/80'}`}>
        <span className={`material-symbols-outlined text-2xl ${active ? 'material-symbols-filled' : ''}`}>{icon}</span>
        <span className="text-[9px] font-bold uppercase mt-1">{label}</span>
    </button>
);

export default MusicaApp;
