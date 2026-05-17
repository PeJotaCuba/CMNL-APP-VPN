import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Program, UserRole } from '../types';
import AgendaHeader from '../components/AgendaHeader';

interface InterestsProps {
  user: UserProfile;
  programs: Program[];
  onUpdateUser: (u: UserProfile) => void;
  onMenuClick?: () => void;
  onBack?: () => void;
}

const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const Interests: React.FC<InterestsProps> = ({ user, programs, onUpdateUser, onMenuClick, onBack }) => {
  const navigate = useNavigate();
  const [selectedDays, setSelectedDays] = useState<string[]>(user.interests?.days || []);
  const [selectedProgs, setSelectedProgs] = useState<string[]>(user.interests?.programIds || []);
  const [userPhoto, setUserPhoto] = useState<string | null>(user.photo || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleToggleProg = (id: string) => {
    setSelectedProgs(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleAllDays = () => {
    if (selectedDays.length === weekDays.length) setSelectedDays([]);
    else setSelectedDays([...weekDays]);
  };

  const toggleAllProgs = () => {
    if (selectedProgs.length === programs.length) setSelectedProgs([]);
    else setSelectedProgs(programs.map(p => p.id));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUserPhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Guardar configuración de intereses
  const handleSavePreferences = () => {
    onUpdateUser({
      ...user,
      photo: userPhoto || user.photo,
      interests: {
        days: selectedDays,
        programIds: selectedProgs
      }
    });
    if (onBack) onBack();
    else navigate('/home');
  };

  return (
    <div className="h-full flex flex-col bg-background-dark">
      <AgendaHeader title="Mi Perfil" user={user} onMenuClick={onMenuClick} onBack={onBack} />

      <main className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8 pb-24">
        {/* Sección de Identidad */}
        <section className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
           <div 
             onClick={() => fileInputRef.current?.click()}
             className="size-32 rounded-[2.5rem] bg-card-dark border-4 border-white/5 flex items-center justify-center relative overflow-hidden shadow-2xl cursor-pointer group transition-all hover:border-primary/50"
           >
              {userPhoto ? <img src={userPhoto} className="size-full object-cover" /> : <span className="material-symbols-outlined text-primary text-5xl">person</span>}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
              </div>
           </div>
           <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handlePhotoUpload} />
           <h2 className="text-xl font-bold text-white mt-4">{user.name}</h2>
           <p className="text-[10px] text-primary font-bold uppercase tracking-[0.4em] mt-1">{user.role === UserRole.ESCRITOR ? 'USUARIO' : user.role} RCM</p>
        </section>

        {/* Selección de Días */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">calendar_today</span>
                <h2 className="text-white font-bold text-sm uppercase tracking-widest">
                    Mis Días <span className="text-white/40 text-[10px]">({selectedDays.length})</span>
                </h2>
            </div>
            <button onClick={toggleAllDays} className="text-[10px] font-bold text-primary uppercase tracking-widest hover:text-white transition-colors bg-white/5 px-3 py-1 rounded-lg">
                {selectedDays.length === weekDays.length ? 'Ninguno' : 'Todos'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {weekDays.map(day => (
              <button 
                key={day} 
                onClick={() => handleToggleDay(day)} 
                className={`px-4 py-3 rounded-2xl text-[10px] font-bold border transition-all uppercase tracking-widest active:scale-95 ${selectedDays.includes(day) ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-card-dark border-white/5 text-text-secondary hover:bg-white/5'}`}
              >
                {day}
              </button>
            ))}
          </div>
        </section>

        {/* Selección de Programas */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">radio</span>
                <h2 className="text-white font-bold text-sm uppercase tracking-widest">
                    Espacios <span className="text-white/40 text-[10px]">({selectedProgs.length})</span>
                </h2>
            </div>
            <button onClick={toggleAllProgs} className="text-[10px] font-bold text-primary uppercase tracking-widest hover:text-white transition-colors bg-white/5 px-3 py-1 rounded-lg">
                {selectedProgs.length === programs.length ? 'Ninguno' : 'Todos'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {programs.map(prog => (
              <button 
                key={prog.id} 
                onClick={() => handleToggleProg(prog.id)} 
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.99] ${selectedProgs.includes(prog.id) ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5' : 'bg-card-dark border-white/5 text-text-secondary opacity-60 hover:opacity-100'}`}
              >
                <div className="text-left flex items-center gap-3">
                  <div className={`size-2 rounded-full ${selectedProgs.includes(prog.id) ? 'bg-primary' : 'bg-white/10'}`}></div>
                  <div>
                      <p className={`font-bold text-xs ${selectedProgs.includes(prog.id) ? 'text-white' : ''}`}>{prog.name}</p>
                      <p className="text-[8px] font-bold uppercase tracking-widest opacity-70">{prog.time}</p>
                  </div>
                </div>
                {selectedProgs.includes(prog.id) && <span className="material-symbols-outlined text-primary text-lg">check_circle</span>}
              </button>
            ))}
          </div>
        </section>
      </main>

      <div className="p-4 border-t border-white/5 bg-card-dark z-20">
         <button 
            onClick={handleSavePreferences}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all hover:bg-primary-dark"
         >
            <span className="material-symbols-outlined text-lg">save</span>
            <span>Guardar Cambios</span>
         </button>
      </div>
    </div>
  );
};

export default Interests;
