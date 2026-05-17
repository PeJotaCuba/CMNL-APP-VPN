import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole, Program, UserProfile } from '../types';
import { getCurrentDateInfo } from '../utils/dateUtils';
import AgendaHeader from '../components/AgendaHeader';

interface HomeProps {
  user: UserProfile;
  onLogout: () => void;
  onMenuClick?: () => void;
  programs: Program[];
  filterEnabled: boolean;
  onToggleFilter: () => void;
  onBack?: () => void;
}

const Home: React.FC<HomeProps> = ({ user, onLogout, onMenuClick, programs, filterEnabled, onToggleFilter, onBack }) => {
  const navigate = useNavigate();
  const dateInfo = getCurrentDateInfo();
  
  const dayName = dateInfo.fullDate.split(',')[0].trim().split(' ')[0];
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  
  const hasInterests = user.interests && (
    (user.interests.days?.length || 0) > 0 || 
    (user.interests.programIds?.length || 0) > 0
  );
  const isFilterActive = hasInterests && filterEnabled;
  const isTodayRelevant = !isFilterActive || (user.interests?.days || []).includes(capitalizedDay);

  return (
    <div className="flex-1 flex flex-col bg-background-dark h-full">
      <AgendaHeader title="Panel de Control" user={user} onMenuClick={onMenuClick || onLogout} onBack={onBack} />

      <main className="flex-1 px-4 py-6 space-y-5 overflow-y-auto no-scrollbar pb-40">
        <section className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-text-secondary text-[10px] font-bold uppercase tracking-widest">{dateInfo.fullDate}</h3>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Hola,<br/>
              <span className="text-primary">{user.name.split(' ')[0]}</span>
            </h2>
          </div>
        </section>

        <div className="flex items-center gap-3">
          {hasInterests && (
            <button 
              onClick={onToggleFilter}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all active:scale-95 ${filterEnabled ? 'bg-primary/10 border-primary/20' : 'bg-white/5 border-white/10'}`}
            >
              <span className={`material-symbols-outlined text-[14px] filled-icon ${filterEnabled ? 'text-primary' : 'text-text-secondary'}`}>
                  {filterEnabled ? 'filter_alt' : 'filter_alt_off'}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${filterEnabled ? 'text-primary' : 'text-text-secondary'}`}>
                  {filterEnabled ? 'Mis Intereses' : 'Ver Todo'}
              </span>
            </button>
          )}
          
          <button 
            onClick={() => navigate('/interests')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-white/5 border-white/10 text-text-secondary hover:text-white transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[14px]">settings</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">Configurar Intereses</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* BOTÓN AGENDA - Rediseñado para ser horizontal y ahorrar espacio */}
          <button 
            onClick={() => navigate('/editorial')}
            className={`group relative h-28 overflow-hidden rounded-[2rem] bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/20 w-full flex items-center p-6 gap-5 transition-transform active:scale-[0.98] md:col-span-2 lg:col-span-1 ${!isTodayRelevant ? 'opacity-75 grayscale-[0.5]' : ''}`}
          >
            <div className="size-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner shrink-0">
              <span className="material-symbols-outlined text-white text-3xl">calendar_month</span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-2 mb-1">
                 <h3 className="text-lg font-bold text-white leading-none">Agenda Editorial</h3>
              </div>
              <p className="text-white/80 text-[10px] uppercase font-bold tracking-widest truncate">
                {dateInfo.monthName} {dateInfo.year}
              </p>
            </div>
            <span className="material-symbols-outlined text-white/60 group-hover:text-white transition-colors">chevron_right</span>
          </button>

          {/* OPCIONES CULTURALES */}
          <button 
            onClick={() => navigate('/culturales')}
            className="group relative h-24 overflow-hidden rounded-[2rem] bg-card-dark border border-white/5 hover:border-primary/50 transition-all shadow-md active:scale-[0.98] w-full flex items-center p-6 gap-5 text-left"
          >
            <div className="size-12 rounded-2xl bg-admin-red/10 flex items-center justify-center group-hover:bg-admin-red transition-colors shrink-0">
              <span className="material-symbols-outlined text-admin-red group-hover:text-white text-2xl">theater_comedy</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">Opciones Culturales</h3>
              <p className="text-text-secondary text-xs uppercase font-bold tracking-widest opacity-60 truncate">Eventos y Actividades</p>
            </div>
            <span className="material-symbols-outlined text-text-secondary group-hover:text-white opacity-20">chevron_right</span>
          </button>

          {/* EFEMÉRIDES */}
          <button 
            onClick={() => navigate('/efemerides')}
            className="group relative h-24 overflow-hidden rounded-[2rem] bg-card-dark border border-white/5 hover:border-primary/50 transition-all shadow-md active:scale-[0.98] w-full flex items-center p-6 gap-5 text-left"
          >
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors shrink-0">
              <span className="material-symbols-outlined text-primary group-hover:text-white text-2xl">history_edu</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">Efemérides</h3>
              <p className="text-text-secondary text-xs uppercase font-bold tracking-widest opacity-60 truncate">Archivo Histórico</p>
            </div>
            <span className="material-symbols-outlined text-text-secondary group-hover:text-white opacity-20">chevron_right</span>
          </button>

          {/* CONMEMORACIONES */}
          <button 
            onClick={() => navigate('/conmemoraciones')}
            className="group relative h-24 overflow-hidden rounded-[2rem] bg-card-dark border border-white/5 hover:border-primary/50 transition-all shadow-md active:scale-[0.98] w-full flex items-center p-6 gap-5 text-left"
          >
            <div className="size-12 rounded-2xl bg-admin-red/10 flex items-center justify-center group-hover:bg-admin-red transition-colors shrink-0">
              <span className="material-symbols-outlined text-admin-red group-hover:text-white text-2xl">celebration</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">Conmemoraciones</h3>
              <p className="text-text-secondary text-xs uppercase font-bold tracking-widest opacity-60 truncate">Fechas Especiales</p>
            </div>
            <span className="material-symbols-outlined text-text-secondary group-hover:text-white opacity-20">chevron_right</span>
          </button>

          {/* PROPAGANDA */}
          <button 
            onClick={() => navigate('/propaganda')}
            className="group relative h-24 overflow-hidden rounded-[2rem] bg-card-dark border border-white/5 hover:border-primary/50 transition-all shadow-md active:scale-[0.98] w-full flex items-center p-6 gap-5 text-left"
          >
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors shrink-0">
              <span className="material-symbols-outlined text-primary group-hover:text-white text-2xl">campaign</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white truncate">Propaganda</h3>
              <p className="text-text-secondary text-xs uppercase font-bold tracking-widest opacity-60 truncate">Base de Datos</p>
            </div>
            <span className="material-symbols-outlined text-text-secondary group-hover:text-white opacity-20">chevron_right</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default Home;
