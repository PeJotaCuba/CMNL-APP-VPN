import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Program, UserProfile, UserRole, EfemeridesData, ConmemoracionesData, DayThemeData, PropagandaData, CulturalOptionsData } from './types.ts';
import { INITIAL_USERS, INITIAL_PROGRAMS, INITIAL_EFEMERIDES, INITIAL_CONMEMORACIONES, INITIAL_DAY_THEMES, INITIAL_PROPAGANDA, INITIAL_CULTURAL_OPTIONS } from './database.ts';
import { getCurrentDateInfo } from './utils/dateUtils.ts';
import { MONTHS_DATA } from './constants.ts';
import Dashboard from './pages/Dashboard.tsx';
import Efemerides from './pages/Efemerides.tsx';
import Conmemoraciones from './pages/Conmemoraciones.tsx';
import Propaganda from './pages/Propaganda.tsx';
import CulturalOptions from './pages/CulturalOptions.tsx';
import Editorial from './pages/Editorial.tsx';
import Interests from './pages/Interests.tsx';
import ThemeDetails from './pages/ThemeDetails.tsx';
import ChatAssistant from './pages/ChatAssistant.tsx';

interface Props {
  onBack: () => void;
  onMenuClick?: () => void;
  currentUser: any; // From main app
  users: any[]; // From main app
  onDirtyChange?: (isDirty: boolean) => void;
}

const InnerAgendaApp: React.FC<{
  user: UserProfile | null;
  users: UserProfile[];
  onBack: () => void;
  onMenuClick?: () => void;
  handleLogout: () => void;
  programs: Program[];
  setPrograms: React.Dispatch<React.SetStateAction<Program[]>>;
  efemerides: EfemeridesData;
  setEfemerides: React.Dispatch<React.SetStateAction<EfemeridesData>>;
  conmemoraciones: ConmemoracionesData;
  setConmemoraciones: React.Dispatch<React.SetStateAction<ConmemoracionesData>>;
  culturalOptions: any;
  setCulturalOptions: React.Dispatch<React.SetStateAction<any>>;
  dayThemes: DayThemeData;
  setDayThemes: React.Dispatch<React.SetStateAction<DayThemeData>>;
  propaganda: PropagandaData;
  setPropaganda: React.Dispatch<React.SetStateAction<PropagandaData>>;
  filterEnabled: boolean;
  setFilterEnabled: (v: boolean) => void;
  handleUpdateCurrentUser: (u: UserProfile) => void;
}> = ({ 
  user, users, onBack, onMenuClick, handleLogout, programs, setPrograms, 
  efemerides, setEfemerides, conmemoraciones, setConmemoraciones, 
  culturalOptions, setCulturalOptions,
  dayThemes, setDayThemes, propaganda, setPropaganda, 
  filterEnabled, setFilterEnabled, handleUpdateCurrentUser 
}) => {
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="h-[100dvh] w-full bg-background-dark flex flex-col items-center justify-center text-white p-6">
        <span className="material-symbols-outlined text-6xl text-admin-red mb-4">error</span>
        <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
        <p className="text-text-secondary text-center mb-6">Debes iniciar sesión en la aplicación principal para acceder a la Agenda.</p>
        <button onClick={onBack} className="bg-primary px-6 py-2 rounded-xl font-bold uppercase tracking-widest text-xs">Volver</button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-background-dark text-white relative shadow-2xl overflow-hidden font-sans">
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Routes>
          <Route path="/home" element={
              <Dashboard 
                  user={user} 
                  onLogout={onMenuClick || handleLogout} 
                  onMenuClick={onMenuClick}
                  programs={programs} 
                  filterEnabled={filterEnabled}
                  onToggleFilter={() => setFilterEnabled(!filterEnabled)}
                  onBack={onBack}
              />
          } />
          <Route path="/efemerides" element={<Efemerides user={user} data={efemerides} onUpdate={setEfemerides} onMenuClick={onMenuClick} onBack={() => navigate('/home')} />} />
          <Route path="/conmemoraciones" element={<Conmemoraciones user={user} data={conmemoraciones} onUpdate={setConmemoraciones} onMenuClick={onMenuClick} onBack={() => navigate('/home')} />} />
          <Route path="/culturales" element={<CulturalOptions user={user} data={culturalOptions} onUpdate={setCulturalOptions} onMenuClick={onMenuClick} onBack={() => navigate('/home')} />} />
          <Route path="/propaganda" element={<Propaganda user={user} data={propaganda} onUpdate={setPropaganda} onMenuClick={onMenuClick} onBack={() => navigate('/home')} />} />
          <Route path="/interests" element={<Interests user={user} programs={programs} onUpdateUser={handleUpdateCurrentUser} onMenuClick={onMenuClick} onBack={() => navigate('/home')} />} />
          <Route path="/details" element={<ThemeDetails user={user} onMenuClick={onMenuClick} onBack={() => navigate('/home')} />} />
          <Route path="/assistant" element={<ChatAssistant user={user} onMenuClick={onMenuClick} onBack={() => navigate('/home')} />} />
          <Route path="/editorial" element={<Editorial 
            user={user} 
            users={users}
            programs={programs} 
            dayThemes={dayThemes}
            efemerides={efemerides}
            conmemoraciones={conmemoraciones}
            onUpdateProgram={(p) => setPrograms(prev => prev.map(x => x.id === p.id ? p : x))} 
            onUpdateMany={setPrograms}
            onUpdateDayThemes={setDayThemes}
            filterEnabled={filterEnabled}
            onMenuClick={onMenuClick}
            onBack={() => navigate('/home')}
            onClearAll={() => {
              if (confirm("¿Borrar todo?")) {
                setPrograms(prev => prev.map(p => ({ ...p, dailyData: {} })));
                setDayThemes({});
              }
            }}
          />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
    </div>
  );
};

const AgendaApp: React.FC<Props> = ({ onBack, onMenuClick, currentUser, users: mainUsers, onDirtyChange }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('rcm_users');
      let currentUsers: UserProfile[] = saved ? JSON.parse(saved) : [];
      
      // Intentar cargar especialidad e información estática del equipo desde rcm_equipo_cmnl
      let teamData: any[] = [];
      try {
        const savedTeam = localStorage.getItem('rcm_equipo_cmnl');
        if (savedTeam) teamData = JSON.parse(savedTeam);
      } catch (e) {
        console.error("Error loading rcm_equipo_cmnl", e);
      }
      
      // Si no hay datos, cargar iniciales
      if (!currentUsers || currentUsers.length === 0) {
        currentUsers = INITIAL_USERS;
      }

      // Sincronizar con los usuarios de la app principal si se proporcionan
      if (mainUsers && mainUsers.length > 0) {
        // Combinar datos: preferir los de mainUsers pero mantener los intereses de rcm_users
        currentUsers = mainUsers.map(mu => {
          const agendaUser = currentUsers.find(au => au.id === mu.id || au.username === mu.username);
          return {
            ...mu,
            id: mu.id || mu.username,
            role: (mu.role === 'admin' || mu.classification === 'Administrador') ? UserRole.ADMIN : UserRole.ESCRITOR,
            interests: agendaUser?.interests || { days: [], programIds: [] }
          } as UserProfile;
        });
      }

      // IMPORTANTE: Forzar actualización del PIN del Admin desde código (INITIAL_USERS)
      const codeAdmin = INITIAL_USERS.find(u => u.id === 'admin');
      if (codeAdmin) {
        const idx = currentUsers.findIndex(u => u.id === 'admin' || u.username === 'admin');
        if (idx !== -1) {
          currentUsers[idx] = { ...currentUsers[idx], pin: codeAdmin.pin, role: UserRole.ADMIN };
        } else {
          currentUsers.unshift(codeAdmin);
        }
      }

      // Migración de campos legacy (password -> pin) y sincronización con equipo
      currentUsers = currentUsers.map(u => {
         const teamMember = teamData.find(m => m.id === u.id || m.username === u.username || m.name === u.name);
         let mergedClassification = u.classification;
         let mergedSpecialty = u.specialty;
         
         if (teamMember) {
             if (teamMember.role && !mergedClassification) mergedClassification = teamMember.role;
             if (teamMember.specialty) {
                 let ts = '';
                 if (Array.isArray(teamMember.specialty)) {
                     ts = teamMember.specialty.join(' / ');
                 } else if (typeof teamMember.specialty === 'string') {
                     ts = teamMember.specialty;
                 }
                 if (ts && (!mergedSpecialty || !mergedSpecialty.includes(ts))) {
                     mergedSpecialty = mergedSpecialty ? `${mergedSpecialty} / ${ts}` : ts;
                 }
             }
         }
         
         let flattenedHabitual: string[] = [];
         let habitualByRole = u.habitualProgramsByRole;
         let habitualDays = u.habitualProgramsDays;

         if (teamMember) {
             if (teamMember.habitualProgramsByRole) {
                 habitualByRole = teamMember.habitualProgramsByRole;
                 const allProgs = Object.values(teamMember.habitualProgramsByRole).flat() as string[];
                 flattenedHabitual = [...new Set(allProgs)];
             } else if (teamMember.habitualPrograms) {
                 flattenedHabitual = teamMember.habitualPrograms;
             }

             if (teamMember.habitualProgramsDays) {
                 habitualDays = teamMember.habitualProgramsDays;
             }
         } else if (u.habitualPrograms) {
             flattenedHabitual = u.habitualPrograms;
         }

         return {
             ...u,
             classification: mergedClassification,
             specialty: mergedSpecialty,
             pin: u.pin || (u as any).password || '',
             habitualPrograms: flattenedHabitual,
             habitualProgramsByRole: habitualByRole,
             habitualProgramsDays: habitualDays
         };
      });

      return currentUsers;
    } catch (e) { return INITIAL_USERS; }
  });

  // Map main app user to Agenda user profile
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (currentUser) {
      const userId = currentUser.username || currentUser.id;
      const savedUser = users.find(u => u.username === userId);
      let agendaRole = UserRole.ESCRITOR;
      if (currentUser.classification === 'Administrador' || (currentUser.role === 'admin' && currentUser.classification !== 'Coordinador')) {
         agendaRole = UserRole.ADMIN;
      } else if (currentUser.classification === 'Coordinador' && (currentUser.coordinatorSections || []).includes('Agenda')) {
         agendaRole = UserRole.ADMIN;
      }
      return {
        id: userId,
        name: currentUser.name,
        username: currentUser.username,
        pin: currentUser.password || '',
        role: agendaRole,
        phone: currentUser.mobile || currentUser.phone || '',
        email: currentUser.email || '',
        photo: currentUser.photo || '',
        classification: currentUser.classification,
        specialty: currentUser.specialty,
        coordinatorSections: currentUser.coordinatorSections,
        interests: savedUser?.interests || { days: [], programIds: [] }
      };
    }
    return null;
  });

  useEffect(() => {
    if (currentUser) {
      const userId = currentUser.username || currentUser.id;
      const savedUser = users.find(u => u.username === userId);
      let agendaRole = UserRole.ESCRITOR;
      if (currentUser.classification === 'Administrador' || (currentUser.role === 'admin' && currentUser.classification !== 'Coordinador')) {
         agendaRole = UserRole.ADMIN;
      } else if (currentUser.classification === 'Coordinador' && (currentUser.coordinatorSections || []).includes('Agenda')) {
         agendaRole = UserRole.ADMIN;
      }
      setUser({
        id: userId,
        name: currentUser.name,
        username: currentUser.username,
        pin: currentUser.password || '',
        role: agendaRole,
        phone: currentUser.mobile || currentUser.phone || '',
        email: currentUser.email || '',
        photo: currentUser.photo || '',
        classification: currentUser.classification,
        specialty: currentUser.specialty,
        coordinatorSections: currentUser.coordinatorSections,
        interests: savedUser?.interests || { days: [], programIds: [] }
      });
    } else {
      setUser(null);
    }
  }, [currentUser, users]);

  // Estado para guardar la sesión del administrador cuando suplanta a un usuario
  const [adminSession, setAdminSession] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('rcm_admin_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [programs, setPrograms] = useState<Program[]>(() => {
    try {
      const saved = localStorage.getItem('rcm_programs');
      return saved ? JSON.parse(saved) : INITIAL_PROGRAMS;
    } catch (e) { return INITIAL_PROGRAMS; }
  });

  const [efemerides, setEfemerides] = useState<EfemeridesData>(() => {
    try {
      const saved = localStorage.getItem('rcm_efemerides');
      return saved ? JSON.parse(saved) : INITIAL_EFEMERIDES;
    } catch (e) { return INITIAL_EFEMERIDES; }
  });

  const [conmemoraciones, setConmemoraciones] = useState<ConmemoracionesData>(() => {
    try {
      const saved = localStorage.getItem('rcm_conmemoraciones');
      return saved ? JSON.parse(saved) : INITIAL_CONMEMORACIONES;
    } catch (e) { return INITIAL_CONMEMORACIONES; }
  });

  const [dayThemes, setDayThemes] = useState<DayThemeData>(() => {
    try {
      const saved = localStorage.getItem('rcm_day_themes');
      return saved ? JSON.parse(saved) : INITIAL_DAY_THEMES;
    } catch (e) { return INITIAL_DAY_THEMES; }
  });

  const [propaganda, setPropaganda] = useState<PropagandaData>(() => {
    try {
      const saved = localStorage.getItem('rcm_propaganda');
      return saved ? JSON.parse(saved) : INITIAL_PROPAGANDA;
    } catch (e) { return INITIAL_PROPAGANDA; }
  });

  const [culturalOptions, setCulturalOptions] = useState<CulturalOptionsData>(() => {
    try {
      const saved = localStorage.getItem('rcm_cultural_options');
      return saved ? JSON.parse(saved) : INITIAL_CULTURAL_OPTIONS;
    } catch (e) { return INITIAL_CULTURAL_OPTIONS; }
  });

  // Estado global para controlar si el filtro de intereses está activo
  const [filterEnabled, setFilterEnabled] = useState(true);

  // Cleanup logic for cultural options - Keep only current and next month
  useEffect(() => {
    const dateInfo = getCurrentDateInfo();
    const currentMonth = dateInfo.monthName.charAt(0).toUpperCase() + dateInfo.monthName.slice(1).toLowerCase();
    
    // Find next month name
    const currentMonthIndex = MONTHS_DATA.findIndex(m => m.name.toLowerCase() === currentMonth.toLowerCase());
    const nextMonthIndex = (currentMonthIndex + 1) % 12;
    const nextMonthName = MONTHS_DATA[nextMonthIndex].name;
    
    const allowedMonths = [currentMonth, nextMonthName];
    
    const keys = Object.keys(culturalOptions);
    const expiredKeys = keys.filter(key => !allowedMonths.includes(key));
    
    if (expiredKeys.length > 0) {
      setCulturalOptions(prev => {
        const cleaned = { ...prev };
        expiredKeys.forEach(key => delete cleaned[key]);
        return cleaned;
      });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rcm_programs', JSON.stringify(programs));
    localStorage.setItem('rcm_efemerides', JSON.stringify(efemerides));
    localStorage.setItem('rcm_conmemoraciones', JSON.stringify(conmemoraciones));
    localStorage.setItem('rcm_day_themes', JSON.stringify(dayThemes));
    localStorage.setItem('rcm_propaganda', JSON.stringify(propaganda));
    localStorage.setItem('rcm_cultural_options', JSON.stringify(culturalOptions));
    localStorage.setItem('rcm_users', JSON.stringify(users));
    
    // Check if any data is different from initial to avoid marking dirty on first load
    // Actually, a simpler way is to just call it if any of these change after mount
  }, [programs, efemerides, conmemoraciones, dayThemes, propaganda, culturalOptions, users]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (onDirtyChange) onDirtyChange(true);
  }, [programs, efemerides, conmemoraciones, dayThemes, propaganda, culturalOptions, users]);

  const handleLogout = () => {
    if (adminSession) {
      setUser(adminSession);
      localStorage.setItem('rcm_session', JSON.stringify(adminSession));
      setAdminSession(null);
      localStorage.removeItem('rcm_admin_session');
    } else {
      // Instead of logging out completely, return to main app
      onBack();
    }
  };

  const handleUpdateCurrentUser = (updatedUser: UserProfile) => {
    setUsers(prev => {
      const exists = prev.some(u => u.id === updatedUser.id);
      if (exists) {
        return prev.map(old => old.id === updatedUser.id ? updatedUser : old);
      } else {
        return [...prev, updatedUser];
      }
    });
    setUser(updatedUser);
    localStorage.setItem('rcm_session', JSON.stringify(updatedUser));
  };

  return (
    <Router>
      <InnerAgendaApp 
        user={user}
        users={users}
        onBack={onBack}
        onMenuClick={onMenuClick}
        handleLogout={handleLogout}
        programs={programs}
        setPrograms={setPrograms}
        efemerides={efemerides}
        setEfemerides={setEfemerides}
        conmemoraciones={conmemoraciones}
        setConmemoraciones={setConmemoraciones}
        culturalOptions={culturalOptions}
        setCulturalOptions={setCulturalOptions}
        dayThemes={dayThemes}
        setDayThemes={setDayThemes}
        propaganda={propaganda}
        setPropaganda={setPropaganda}
        filterEnabled={filterEnabled}
        setFilterEnabled={setFilterEnabled}
        handleUpdateCurrentUser={handleUpdateCurrentUser}
      />
    </Router>
  );
};

export default AgendaApp;
