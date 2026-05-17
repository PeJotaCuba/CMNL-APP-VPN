import React, { useState, useEffect } from 'react';
import { Track, AuthMode } from './types';
import { GENRES_LIST, COUNTRIES_LIST } from './constants';

interface TrackDetailProps {
  track: Track;
  authMode: AuthMode;
  onClose: () => void;
  onSearchCredits: () => void;
  onSaveEdit?: (track: Track) => void;
}

const InfoBox = ({ icon, label, value, sub }: { icon: string, label: string, value?: string, sub?: string }) => (
    <div className="bg-[#1A100C] p-3 rounded-xl border border-[#9E7649]/20">
        <div className="flex items-center gap-2 mb-1 text-[#E8DCCF]/60">
            <span className="material-symbols-outlined text-sm">{icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </div>
        <p className="font-bold text-white truncate">{value || '---'}</p>
        {sub && <p className="text-xs text-[#E8DCCF]/40 truncate">{sub}</p>}
    </div>
);

const EditField = ({ label, value, field, list, onChange }: { label: string, value: string, field: string, list?: string, onChange: (field: string, value: string) => void }) => (
    <div className="mb-3" onClick={(e) => e.stopPropagation()}>
        <label className="block text-xs font-bold text-[#E8DCCF]/60 mb-1">{label}</label>
        <input 
            className="w-full p-2 bg-[#1A100C] border border-[#9E7649]/30 rounded-lg text-sm font-medium text-white focus:border-[#9E7649] outline-none"
            value={value}
            onChange={(e) => onChange(field, e.target.value)}
            list={list}
            autoComplete="off"
        />
    </div>
);

const TrackDetail: React.FC<TrackDetailProps> = ({ track, authMode, onClose, onSearchCredits, onSaveEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
      title: track.metadata.title,
      author: track.metadata.author,
      authorCountry: track.metadata.authorCountry || '',
      performer: track.metadata.performer,
      performerCountry: track.metadata.performerCountry || '',
      genre: track.metadata.genre || '',
      album: track.metadata.album,
      year: track.metadata.year
  });

  useEffect(() => {
    setEditData({
      title: track.metadata.title,
      author: track.metadata.author,
      authorCountry: track.metadata.authorCountry || '',
      performer: track.metadata.performer,
      performerCountry: track.metadata.performerCountry || '',
      genre: track.metadata.genre || '',
      album: track.metadata.album,
      year: track.metadata.year
    });
    setIsEditing(false);
  }, [track]);

  const handleSave = () => {
      if (onSaveEdit) {
          onSaveEdit({
              ...track,
              metadata: {
                  ...track.metadata,
                  title: editData.title,
                  author: editData.author,
                  authorCountry: editData.authorCountry,
                  performer: editData.performer,
                  performerCountry: editData.performerCountry,
                  genre: editData.genre,
                  album: editData.album,
                  year: editData.year
              }
          });
          setIsEditing(false);
      }
  };

  const handleFieldChange = (field: string, value: string) => {
      setEditData(prev => ({...prev, [field]: value}));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
        <div className="bg-[#2C1B15] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-[#9E7649]/30" onClick={(e) => e.stopPropagation()}>
            
            <div className="flex justify-between items-center p-5 border-b border-[#9E7649]/20 shrink-0 bg-[#1A100C] rounded-t-2xl">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="size-10 rounded-full bg-[#9E7649]/10 text-[#9E7649] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined">music_note</span>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-white truncate">{track.metadata.title}</h3>
                        <p className="text-xs text-[#E8DCCF]/60 truncate">{track.filename}</p>
                    </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="size-8 rounded-full hover:bg-[#2C1B15] flex items-center justify-center text-[#E8DCCF]/40 hover:text-white">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                {isEditing ? (
                    <div className="grid grid-cols-1 gap-1">
                        <EditField label="Título" value={editData.title} field="title" onChange={handleFieldChange} />
                        <div className="grid grid-cols-2 gap-3">
                             <EditField label="Autor" value={editData.author} field="author" onChange={handleFieldChange} />
                             <EditField label="País Autor" value={editData.authorCountry} field="authorCountry" list="country-options" onChange={handleFieldChange} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                             <EditField label="Intérprete" value={editData.performer} field="performer" onChange={handleFieldChange} />
                             <EditField label="País Intérprete" value={editData.performerCountry} field="performerCountry" list="country-options" onChange={handleFieldChange} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                             <EditField label="Género" value={editData.genre} field="genre" list="genre-options" onChange={handleFieldChange} />
                             <EditField label="Año" value={editData.year} field="year" onChange={handleFieldChange} />
                        </div>
                        <EditField label="Álbum / Carpeta" value={editData.album} field="album" onChange={handleFieldChange} />

                        <datalist id="genre-options">
                            {GENRES_LIST.map(g => <option key={g} value={g} />)}
                        </datalist>
                        <datalist id="country-options">
                            {COUNTRIES_LIST.map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <InfoBox icon="person" label="Autor" value={track.metadata.author} sub={track.metadata.authorCountry} />
                            <InfoBox icon="mic" label="Intérprete" value={track.metadata.performer} sub={track.metadata.performerCountry} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <InfoBox icon="piano" label="Género" value={track.metadata.genre} />
                            <InfoBox icon="calendar_today" label="Año" value={track.metadata.year} />
                        </div>
                        <InfoBox icon="album" label="Álbum / Carpeta" value={track.metadata.album} />
                        
                        {track.metadata.modificado && (
                            <InfoBox icon="edit_calendar" label="Modificado" value={track.metadata.modificado} />
                        )}
                        
                        <div className="pt-4 border-t border-[#9E7649]/20">
                            <p className="text-xs text-[#E8DCCF]/40 font-mono break-all">{track.path}/{track.filename}</p>
                            <p className="text-[10px] text-[#E8DCCF]/30 mt-1">ID: {track.id}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-[#9E7649]/20 bg-[#1A100C] rounded-b-2xl shrink-0 flex gap-3">
                {isEditing ? (
                    <>
                        <button onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-[#2C1B15] border border-[#9E7649]/30 rounded-xl font-bold text-[#E8DCCF]/80 hover:text-white">Cancelar</button>
                        <button onClick={handleSave} className="flex-1 py-3 bg-[#9E7649] text-white rounded-xl font-bold shadow-lg hover:bg-[#8B653D]">Guardar Cambios</button>
                    </>
                ) : (
                    <>
                        {authMode !== 'user' && (
                             <button onClick={() => setIsEditing(true)} className="flex-1 py-3 bg-[#2C1B15] border border-[#9E7649]/30 rounded-xl font-bold text-[#E8DCCF]/80 flex items-center justify-center gap-2 hover:text-white">
                                <span className="material-symbols-outlined">edit</span> Editar
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    </div>
  );
};

export default TrackDetail;
