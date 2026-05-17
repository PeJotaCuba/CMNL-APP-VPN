import React from 'react';
import { CreditInfo, Track } from './types';

interface CreditResultsProps {
  originalTrack: Track;
  foundCredits: CreditInfo | null;
  isLoading: boolean;
  onApply: (credits: CreditInfo) => void;
  onDiscard: () => void;
}

const CreditResults: React.FC<CreditResultsProps> = ({ originalTrack, foundCredits, isLoading, onApply, onDiscard }) => {
  
  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-[#1A100C] p-6 text-center">
        <div className="w-16 h-16 border-4 border-[#9E7649]/30 border-t-[#9E7649] rounded-full animate-spin mb-6"></div>
        <h3 className="text-xl font-bold text-white mb-2">Analizando Archivos...</h3>
        <p className="text-[#E8DCCF]/60 text-sm max-w-xs">Consultando bases de datos históricas y metadatos globales para "{originalTrack.filename}"</p>
      </div>
    );
  }

  if (!foundCredits) {
     return (
       <div className="flex flex-col h-full items-center justify-center bg-[#1A100C] p-6">
         <p className="text-[#E8DCCF]/60 font-medium">Error cargando resultados.</p>
         <button onClick={onDiscard} className="mt-4 text-[#9E7649] font-bold hover:underline">Volver</button>
       </div>
     )
  }

  return (
    <div className="flex flex-col h-full bg-[#1A100C]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center bg-[#2C1B15] p-4 border-b border-[#9E7649]/20 justify-between">
            <button onClick={onDiscard} className="text-[#E8DCCF]/80 flex size-12 shrink-0 items-center cursor-pointer hover:text-white">
                <span className="material-symbols-outlined text-2xl">arrow_back_ios</span>
            </button>
            <h2 className="text-white text-lg font-bold flex-1 text-center">Resultados de Búsqueda</h2>
            <div className="size-12"></div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 pb-32">
            <div className="bg-[#2C1B15] border-2 border-[#9E7649]/50 rounded-xl p-6 mb-6 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#9E7649]"></div>
                <div className="w-16 h-16 rounded-full bg-[#9E7649]/10 flex items-center justify-center mx-auto mb-3">
                     <span className="material-symbols-outlined text-[#9E7649] text-3xl material-symbols-filled">language</span>
                </div>
                <h3 className="text-xl font-bold text-white">Créditos Encontrados</h3>
                <div className="flex items-center justify-center gap-1 mt-2 text-green-500 text-xs font-bold uppercase">
                     <span className="material-symbols-outlined text-sm">check_circle</span>
                     <span>Verificado por IA</span>
                </div>
            </div>

            <div className="space-y-3">
                <ResultItem 
                    icon="title" 
                    label="Título" 
                    value={foundCredits.title} 
                    oldValue={originalTrack.metadata.title} 
                />
                <ResultItem 
                    icon="person_edit" 
                    label="Autor" 
                    value={foundCredits.author} 
                    oldValue={originalTrack.metadata.author} 
                />
                <ResultItem 
                    icon="mic" 
                    label="Intérprete" 
                    value={foundCredits.performer} 
                    oldValue={originalTrack.metadata.performer} 
                />
                <ResultItem 
                    icon="album" 
                    label="Álbum" 
                    value={foundCredits.album} 
                    oldValue={originalTrack.metadata.album} 
                />
                 <ResultItem 
                    icon="calendar_today" 
                    label="Año" 
                    value={foundCredits.year} 
                    oldValue={originalTrack.metadata.year} 
                />
            </div>
        </main>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#1A100C]/90 backdrop-blur-md border-t border-[#9E7649]/20 z-20">
             <button 
                onClick={() => onApply(foundCredits)}
                className="w-full bg-[#9E7649] hover:bg-[#8B653D] text-white font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 mb-3 transition-colors"
            >
                <span className="material-symbols-outlined">save</span>
                <span>Aplicar a Base de Datos</span>
            </button>
            <button 
                onClick={onDiscard}
                className="w-full text-[#E8DCCF]/60 font-medium py-2 text-sm hover:text-white"
            >
                Descartar resultados
            </button>
        </div>
    </div>
  );
};

const ResultItem: React.FC<{ icon: string, label: string, value: string, oldValue?: string }> = ({ icon, label, value, oldValue }) => {
    const isNew = value !== oldValue && value !== "Desconocido" && value !== "---";
    return (
        <div className={`flex items-center gap-4 bg-[#2C1B15] px-4 min-h-[72px] py-3 justify-between rounded-lg border-l-4 shadow-sm ${isNew ? 'border-[#9E7649] bg-[#9E7649]/10' : 'border-[#9E7649]/20'}`}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="text-[#9E7649] flex items-center justify-center rounded-lg bg-[#9E7649]/10 shrink-0 size-10">
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                </div>
                <div className="flex flex-col justify-center min-w-0">
                    <p className="text-white text-base font-bold leading-normal truncate">{value}</p>
                    <p className="text-[#E8DCCF]/60 text-xs font-normal uppercase tracking-wider">{label}</p>
                    {isNew && oldValue && oldValue !== "---" && (
                         <p className="text-xs text-red-400 line-through mt-0.5 truncate opacity-60">{oldValue}</p>
                    )}
                </div>
            </div>
            <div className="shrink-0">
               {isNew ? (
                   <span className="material-symbols-outlined text-green-500">travel_explore</span>
               ) : (
                   <span className="material-symbols-outlined text-[#E8DCCF]/30 text-sm">check</span>
               )}
            </div>
        </div>
    )
}

export default CreditResults;
