import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Track } from './types';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

interface TrackListProps {
  tracks: Track[];
  onSelectTrack: (track: Track) => void;
  onUploadTxt: (files: FileList, root: string) => void;
  isAdmin: boolean;
  onSyncRoot: (root: string) => void;
  onExportRoot: (root: string) => void;
  onClearRoot: (root: string) => void;
  
  selectedTrackIds?: Set<string>;
  onToggleSelection?: (track: Track) => void;
  isSelectionView?: boolean;
  onClearSelection?: () => void;
  onBulkSelectTxt?: (file: File) => void;
  
  customRoots: string[];
  onAddCustomRoot: (name: string) => void;
  onRenameRoot: (oldName: string, newName: string) => void;
  
  onOpenWishlist?: () => void;
  missingQueries?: string[];
  onClearMissing?: () => void;
  
  onOpenExportPreview?: () => void;

  activeRoot: string;
  setActiveRoot: (root: string) => void;
  currentPath: string;
  setCurrentPath: (path: string) => void;
}

const FIXED_ROOTS = ['Música 1', 'Música 2', 'Música 3', 'Música 4', 'Música 5'];
const ITEMS_PER_PAGE = 50;
const HISTORY_KEY = 'rcm_search_history';

const TrackList: React.FC<TrackListProps> = ({ 
    tracks, onSelectTrack, onUploadTxt, isAdmin, 
    onSyncRoot, onExportRoot, onClearRoot,
    selectedTrackIds, onToggleSelection, isSelectionView,
    onClearSelection, onBulkSelectTxt,
    customRoots, onAddCustomRoot, onRenameRoot,
    onOpenWishlist, missingQueries, onClearMissing,
    onOpenExportPreview,
    activeRoot, setActiveRoot, currentPath, setCurrentPath
}) => {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [renderLimit, setRenderLimit] = useState(ITEMS_PER_PAGE);
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);

  const [recentSearches, setRecentSearches] = useState<{term: string, time: number}[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [showAddRootModal, setShowAddRootModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');
  const [renameInput, setRenameInput] = useState('');

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const allRoots = useMemo(() => [...FIXED_ROOTS, ...customRoots], [customRoots]);

  useEffect(() => {
      try {
          const raw = localStorage.getItem(HISTORY_KEY);
          if (raw) {
              const parsed = JSON.parse(raw);
              const now = Date.now();
              const valid = parsed.filter((i: any) => (now - i.time) < 86400000);
              setRecentSearches(valid);
          }
      } catch (e) {
          console.error("Error loading search history", e);
      }
  }, []);

  useEffect(() => {
      const handler = setTimeout(() => { setSearchQuery(inputValue); }, 300);
      return () => { clearTimeout(handler); };
  }, [inputValue]);

  useEffect(() => {
      setRenderLimit(ITEMS_PER_PAGE);
  }, [searchQuery, activeRoot, currentPath]);

  const addToHistory = (term: string) => {
      if (!term.trim()) return;
      const clean = term.trim();
      setRecentSearches(prev => {
          const filtered = prev.filter(i => i.term.toLowerCase() !== clean.toLowerCase());
          const next = [{term: clean, time: Date.now()}, ...filtered].slice(0, 10);
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
          return next;
      });
  };

  const handleClearSearch = () => {
      setInputValue('');
      setSearchQuery('');
      inputRef.current?.focus();
  };

  const handleHistoryItemClick = (term: string) => {
      setInputValue(term);
      setShowHistory(false);
  };

  const handleNavigate = (item: any) => {
      if (searchQuery) addToHistory(searchQuery);

      if (item.type === 'track') {
          onSelectTrack(item.data);
      } else {
          const targetPath = item.fullPath;
          
          let newRoot = activeRoot;
          for (const r of allRoots) {
              if (targetPath.startsWith(r)) {
                  newRoot = r;
                  break;
              }
          }

          setActiveRoot(newRoot);
          setCurrentPath(targetPath);
          
          setInputValue('');
          setSearchQuery('');
          setIsGlobalSearch(false);
      }
  };

  const handleRootClick = (root: string) => {
      setActiveRoot(root);
      setCurrentPath(''); 
      setInputValue(''); 
      setSearchQuery('');
      setIsGlobalSearch(false);
  };

  const handleAddRootSubmit = () => {
      if (newNameInput.trim()) {
          onAddCustomRoot(newNameInput.trim());
          setNewNameInput('');
          setShowAddRootModal(false);
      }
  };

  const handleRenameSubmit = () => {
      if (renameInput.trim() && renameInput !== activeRoot) {
          onRenameRoot(activeRoot, renameInput.trim());
      }
      setShowRenameModal(false);
  };

  const scrollTabs = (direction: 'left' | 'right') => {
      if (tabsContainerRef.current) {
          tabsContainerRef.current.scrollBy({ left: direction === 'left' ? -150 : 150, behavior: 'smooth' });
      }
  };

  const normalizeStr = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filteredHistory = useMemo(() => {
      if (!inputValue) return recentSearches;
      const cleanInput = normalizeStr(inputValue);
      return recentSearches.filter(i => normalizeStr(i.term).includes(cleanInput));
  }, [recentSearches, inputValue]);

  const displayItems = useMemo(() => {
      if (isSelectionView) {
          let list = tracks;
          if (searchQuery.trim()) {
              const cleanQuery = normalizeStr(searchQuery.trim());
              list = list.filter(t => normalizeStr(t.filename).includes(cleanQuery) || normalizeStr(t.metadata.title).includes(cleanQuery));
          }
          return list.map(t => ({ type: 'track' as const, data: t, key: t.id })).sort((a,b) => a.data.filename.localeCompare(b.data.filename));
      }

      const targetPath = currentPath || activeRoot;
      const targetPathNorm = normalizeStr(targetPath);
      const filesList: any[] = [];
      const foldersMap = new Set<string>();
      
      let pool = tracks;

      if (searchQuery.trim()) {
          const cleanQuery = normalizeStr(searchQuery.trim());
          
          if (!isGlobalSearch) {
              pool = pool.filter(t => normalizeStr(t.path).startsWith(targetPathNorm));
          }

          const matchedFiles = pool.filter(t => 
              normalizeStr(t.filename).includes(cleanQuery) || 
              normalizeStr(t.metadata.title).includes(cleanQuery) || 
              normalizeStr(t.metadata.performer).includes(cleanQuery)
          ).map(t => ({ type: 'track' as const, data: t, key: t.id }));

          const matchedFolders: any[] = [];
          const seenFolders = new Set<string>();

          pool.forEach(t => {
              const pathParts = t.path.split('/'); 
              let currentPathBuild = "";

              pathParts.forEach((part, index) => {
                  if (index === 0) { 
                      currentPathBuild = part; 
                      return; 
                  }
                  
                  currentPathBuild += "/" + part;
                  
                  if (normalizeStr(part).includes(cleanQuery)) {
                      if (!isGlobalSearch) {
                          if (!normalizeStr(currentPathBuild).startsWith(targetPathNorm)) return;
                      }

                      if (!seenFolders.has(currentPathBuild)) {
                          seenFolders.add(currentPathBuild);
                          matchedFolders.push({
                              type: 'folder' as const,
                              name: part,
                              fullPath: currentPathBuild,
                              key: currentPathBuild
                          });
                      }
                  }
              });
          });

          return [...matchedFolders, ...matchedFiles];
      }

      const relevantTracks = tracks.filter(t => t.path && normalizeStr(t.path).startsWith(targetPathNorm));
      
      for (const t of relevantTracks) {
          const trackSegments = t.path.split('/').filter(p => p);
          const targetSegments = targetPath.split('/').filter(p => p);
          if (trackSegments.length === targetSegments.length) {
               filesList.push({ type: 'track' as const, data: t, key: t.id });
          } else if (trackSegments.length > targetSegments.length) {
              foldersMap.add(trackSegments.slice(0, targetSegments.length + 1).join('/'));
          }
      }
      const foldersList = Array.from(foldersMap).sort().map(fPath => ({ type: 'folder' as const, name: fPath.split('/').pop() || 'Carpeta', fullPath: fPath, key: fPath }));
      
      return [...foldersList, ...filesList.sort((a, b) => a.data.filename.localeCompare(b.data.filename))];
  }, [tracks, activeRoot, currentPath, searchQuery, isSelectionView, isGlobalSearch]);

  const visibleItems = displayItems.slice(0, renderLimit);
  const currentFolderName = currentPath ? currentPath.split('/').pop() : activeRoot;

  const handleGenerateReport = async () => {
      const artistName = currentPath.split('/').pop() || 'Artista';
      const targetPathNorm = normalizeStr(currentPath);
      const relevantTracks = tracks.filter(t => t.path && normalizeStr(t.path).startsWith(targetPathNorm));

      const children = [
          new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
              children: [
                  new TextRun({
                      text: artistName,
                      bold: true,
                      font: "Arial",
                      size: 28, // 14pt
                  })
              ]
          })
      ];

      relevantTracks.forEach(track => {
          children.push(
              new Paragraph({
                  spacing: { after: 200 },
                  children: [
                      new TextRun({
                          text: `Tema: ${track.metadata.title || 'Desconocido'}`,
                          bold: true,
                          font: "Arial",
                          size: 24, // 12pt
                      }),
                      new TextRun({
                          text: `Intérprete: ${track.metadata.performer || 'Desconocido'}`,
                          font: "Arial",
                          size: 24, // 12pt
                          break: 1,
                      }),
                      new TextRun({
                          text: `Autor: ${track.metadata.author || 'Desconocido'}`,
                          font: "Arial",
                          size: 24, // 12pt
                          break: 1,
                      }),
                      new TextRun({
                          text: `Ruta: ${track.path}`,
                          font: "Arial",
                          size: 24, // 12pt
                          break: 1,
                      }),
                  ],
              })
          );
      });

      const doc = new Document({
          sections: [{
              properties: {},
              children: children,
          }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Informe_${artistName}.docx`);
  };

  return (
    <div className="flex flex-col h-full bg-[#1A100C]">
      <div className="bg-[#2C1B15] shadow-sm border-b border-[#9E7649]/20 sticky top-0 z-10">
        
        {!isSelectionView && (
            <div className="relative group bg-[#1A100C] flex items-center border-b border-[#9E7649]/20">
                <button onClick={() => scrollTabs('left')} className="px-1 text-[#E8DCCF]/60 hover:text-white"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                <div ref={tabsContainerRef} className="flex flex-1 overflow-x-auto no-scrollbar scroll-smooth">
                    {allRoots.map(root => (
                        <button key={root} onClick={() => handleRootClick(root)} className={`flex-none min-w-[90px] py-4 text-[10px] font-bold uppercase tracking-wider relative transition-all ${activeRoot === root ? 'bg-[#9E7649]/20 text-white' : 'text-[#E8DCCF]/60 hover:bg-[#2C1B15]'}`}>
                            {root}
                            {activeRoot === root && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#9E7649]"></div>}
                        </button>
                    ))}
                </div>
                <button onClick={() => scrollTabs('right')} className="px-1 text-[#E8DCCF]/60 hover:text-white"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                
                {isAdmin && (
                    <button onClick={() => setShowAddRootModal(true)} className="px-3 py-4 text-[#9E7649] hover:text-white transition-colors border-l border-[#9E7649]/20" title="Nueva Carpeta">
                        <span className="material-symbols-outlined">add_circle</span>
                    </button>
                )}
            </div>
        )}

        {!isSelectionView && (
            <div className="flex items-center justify-center flex-wrap gap-2 p-2 bg-[#2C1B15] border-b border-[#9E7649]/10">
                <button 
                    onClick={() => onSyncRoot(activeRoot)} 
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[#1A100C] border border-[#9E7649]/30 px-2 py-2 md:px-5 md:py-2.5 rounded-lg shadow-sm text-[10px] md:text-sm font-bold text-[#E8DCCF] hover:bg-[#3E1E16] transition-all active:scale-95 whitespace-nowrap min-w-[80px]"
                    title="Cargar base de datos desde la nube"
                >
                    <span className="material-symbols-outlined text-base md:text-lg text-green-500">cloud_download</span> 
                    Actualizar
                </button>
                
                {isAdmin && (
                    <>
                        <button 
                            onClick={() => onExportRoot(activeRoot)} 
                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[#1A100C] border border-[#9E7649]/30 px-2 py-2 md:px-5 md:py-2.5 rounded-lg shadow-sm text-[10px] md:text-sm font-bold text-[#E8DCCF] hover:bg-[#3E1E16] transition-all active:scale-95 whitespace-nowrap min-w-[80px]"
                            title="Descargar base de datos local"
                        >
                            <span className="material-symbols-outlined text-base md:text-lg text-blue-400">save</span> 
                            Guardar
                        </button>
                        <button 
                            onClick={() => onClearRoot(activeRoot)} 
                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[#1A100C] border border-[#9E7649]/30 px-2 py-2 md:px-5 md:py-2.5 rounded-lg shadow-sm text-[10px] md:text-sm font-bold text-[#E8DCCF] hover:bg-red-900/20 hover:text-red-400 transition-all active:scale-95 whitespace-nowrap min-w-[80px]"
                            title="Eliminar todos los datos de esta carpeta"
                        >
                            <span className="material-symbols-outlined text-base md:text-lg text-red-500">delete</span> 
                            Limpiar
                        </button>
                        {customRoots.includes(activeRoot) && (
                            <button 
                                onClick={() => { setRenameInput(activeRoot); setShowRenameModal(true); }}
                                className="flex-none flex items-center justify-center bg-[#1A100C] border border-[#9E7649]/30 px-3 py-2 md:px-4 md:py-2.5 rounded-lg shadow-sm text-[#E8DCCF] hover:bg-[#3E1E16] transition-all active:scale-95"
                            >
                                <span className="material-symbols-outlined text-base md:text-lg text-[#E8DCCF]/60">edit</span>
                            </button>
                        )}
                    </>
                )}
            </div>
        )}

        <div className="px-4 py-3 flex flex-col gap-2 relative">
             <div className="flex items-center gap-2">
                 <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-2 top-2.5 text-[#E8DCCF]/40 text-lg">search</span>
                    <input 
                        ref={inputRef}
                        className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-[#9E7649]/30 bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649] transition-colors" 
                        placeholder={isSelectionView ? "Filtrar en selección..." : `Buscar en ${currentFolderName}...`} 
                        value={inputValue} 
                        onChange={(e) => setInputValue(e.target.value)} 
                        onFocus={() => setShowHistory(true)}
                        onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                    />
                    {inputValue && (
                        <button 
                            onClick={handleClearSearch}
                            className="absolute right-2 top-2.5 text-[#E8DCCF]/40 hover:text-white"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    )}

                    {showHistory && filteredHistory.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-[#2C1B15] rounded-lg shadow-xl border border-[#9E7649]/30 z-50 overflow-hidden">
                            <p className="text-[10px] text-[#E8DCCF]/60 uppercase font-bold px-3 py-2 bg-[#1A100C]">
                                {inputValue ? 'Sugerencias' : 'Recientes (24h)'}
                            </p>
                            {filteredHistory.map((item, idx) => (
                                <button 
                                    key={idx}
                                    onMouseDown={() => handleHistoryItemClick(item.term)}
                                    className="w-full text-left px-3 py-2 text-sm text-[#E8DCCF] hover:bg-[#3E1E16] flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[#E8DCCF]/40 text-sm">history</span>
                                    {item.term}
                                </button>
                            ))}
                        </div>
                    )}
                 </div>
             </div>

             {!isSelectionView && searchQuery.trim() && (
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsGlobalSearch(false)} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg border transition-all ${!isGlobalSearch ? 'bg-[#9E7649] text-white border-[#9E7649] shadow-sm' : 'text-[#E8DCCF]/60 border-[#9E7649]/30 bg-[#1A100C]'}`}>En esta carpeta</button>
                    <button onClick={() => setIsGlobalSearch(true)} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg border transition-all ${isGlobalSearch ? 'bg-[#9E7649] text-white border-[#9E7649] shadow-sm' : 'text-[#E8DCCF]/60 border-[#9E7649]/30 bg-[#1A100C]'}`}>Búsqueda Global</button>
                </div>
            )}

            {currentPath && !isSelectionView && !searchQuery.trim() && (
                <div className="flex items-center justify-between w-full">
                    <button onClick={() => setCurrentPath(currentPath.includes('/') ? currentPath.substring(0, currentPath.lastIndexOf('/')) : '')} className="self-start flex items-center gap-1 text-[10px] font-bold text-[#9E7649] uppercase hover:underline">
                        <span className="material-symbols-outlined text-sm">arrow_back</span> Regresar
                    </button>
                    {currentPath.split('/').filter(Boolean).length === 3 && (
                        <button onClick={handleGenerateReport} className="flex items-center gap-1 text-[10px] font-bold text-white bg-[#9E7649] hover:bg-[#8B653D] px-3 py-1.5 rounded-lg uppercase transition-colors shadow-sm">
                            <span className="material-symbols-outlined text-sm">description</span> Generar Informe
                        </button>
                    )}
                </div>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#9E7649]/10 pb-24 bg-[#1A100C]">
        {visibleItems.map(item => (
          <div key={item.key} className="flex items-center gap-3 px-4 py-3 hover:bg-[#2C1B15] transition-colors group cursor-pointer">
            <div className={`flex items-center justify-center rounded-lg size-10 shrink-0 ${item.type === 'track' ? 'bg-[#9E7649]/10 text-[#9E7649]' : 'bg-blue-900/20 text-blue-400'}`} onClick={() => handleNavigate(item)}>
              <span className="material-symbols-outlined">{item.type === 'folder' ? 'folder' : 'music_note'}</span>
            </div>
            <div className="flex flex-col flex-1 min-w-0" onClick={() => handleNavigate(item)}>
                <p className="text-sm font-bold text-white truncate">{item.type === 'track' ? item.data.metadata.title : item.name}</p>
                <p className="text-[10px] text-[#E8DCCF]/60 truncate">{item.type === 'track' ? item.data.metadata.performer : (item.type === 'folder' ? 'Directorio' : '')}</p>
            </div>
            
            {item.type === 'track' && onToggleSelection && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleSelection(item.data); }} 
                    className={`size-8 rounded-full flex items-center justify-center border transition-all ${selectedTrackIds?.has(item.data.id) ? 'bg-[#9E7649] border-[#9E7649] text-white shadow-md' : 'border-[#9E7649]/30 text-[#E8DCCF]/40 hover:text-white'}`}
                >
                    <span className="material-symbols-outlined text-sm">{selectedTrackIds?.has(item.data.id) ? 'check' : 'add'}</span>
                </button>
            )}
          </div>
        ))}

        {visibleItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-[#E8DCCF]/40 gap-2">
                <span className="material-symbols-outlined text-4xl opacity-50">search_off</span>
                <p className="text-xs font-medium">No se encontraron resultados.</p>
            </div>
        )}
        
        {displayItems.length > renderLimit && (
             <div className="p-4 flex justify-center">
                 <button onClick={() => setRenderLimit(prev => prev + 50)} className="text-xs font-bold text-[#9E7649] hover:underline">Cargar más...</button>
             </div>
        )}

        {!isSelectionView && isAdmin && (
            <div className="p-4 border-t border-[#9E7649]/20 bg-[#2C1B15] mt-4">
                <label className="flex flex-col items-center justify-center gap-2 bg-[#1A100C] border-2 border-dashed border-[#9E7649]/30 rounded-xl p-6 cursor-pointer hover:bg-[#3E1E16] hover:border-[#9E7649] transition-colors">
                    <span className="material-symbols-outlined text-[#E8DCCF]/40 text-3xl">upload_file</span>
                    <span className="text-xs font-bold text-[#E8DCCF]/80 text-center">
                        Cargar archivos TXT en <span className="text-[#9E7649]">{activeRoot}</span>
                    </span>
                    <input type="file" multiple accept=".txt" className="hidden" onChange={(e) => onUploadTxt(e.target.files!, activeRoot)} />
                </label>
            </div>
        )}
      </div>

      {showAddRootModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowAddRootModal(false)}>
              <div className="bg-[#2C1B15] border border-[#9E7649]/30 rounded-2xl p-6 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
                  <h4 className="font-bold text-white mb-4">Nuevo Espacio</h4>
                  <input className="w-full p-3 border border-[#9E7649]/30 bg-[#1A100C] text-white rounded-xl mb-4 text-sm outline-none focus:border-[#9E7649]" placeholder="Ej: Música 6" value={newNameInput} onChange={e => setNewNameInput(e.target.value)} autoFocus />
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddRootModal(false)} className="flex-1 py-2 text-[#E8DCCF]/60 font-bold text-sm hover:text-white">Cerrar</button>
                    <button onClick={handleAddRootSubmit} className="flex-1 py-2 bg-[#9E7649] text-white rounded-xl font-bold text-sm hover:bg-[#8B653D]">Crear</button>
                  </div>
              </div>
          </div>
      )}

      {showRenameModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setShowRenameModal(false)}>
              <div className="bg-[#2C1B15] border border-[#9E7649]/30 rounded-2xl p-6 w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
                  <h4 className="font-bold text-white mb-4">Renombrar Carpeta</h4>
                  <input className="w-full p-3 border border-[#9E7649]/30 bg-[#1A100C] text-white rounded-xl mb-4 text-sm outline-none focus:border-[#9E7649]" value={renameInput} onChange={e => setRenameInput(e.target.value)} autoFocus />
                  <div className="flex gap-2">
                    <button onClick={() => setShowRenameModal(false)} className="flex-1 py-2 text-[#E8DCCF]/60 font-bold text-sm hover:text-white">Cerrar</button>
                    <button onClick={handleRenameSubmit} className="flex-1 py-2 bg-[#9E7649] text-white rounded-xl font-bold text-sm hover:bg-[#8B653D]">Guardar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default TrackList;
