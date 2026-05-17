import { Program, UserProfile, UserRole, EfemeridesData, ConmemoracionesData, DayThemeData, PropagandaData, CulturalOptionsData } from './types.ts';

export const INITIAL_USERS: UserProfile[] = [
  { 
    id: 'admin', 
    name: 'Pedro José Reyes Acuña', 
    username: 'admin', 
    pin: 'RC0026', 
    role: UserRole.ADMIN, 
    phone: '54413935',
    photo: ''
  }
];

export const INITIAL_PROGRAMS: Program[] = [
  // LUNES A VIERNES
  { id: 'lv1', name: 'Buenos Días, Bayamo', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], time: '07:00', active: true, dailyData: {} },
  { id: 'lv2', name: 'Todos en Casa', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], time: '10:00', active: true, dailyData: {} },
  { id: 'lv3', name: 'Noticiero (RCM Noticias)', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], time: '11:00', active: true, dailyData: {} },
  { id: 'lv4', name: 'Arte Bayamo', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], time: '11:15', active: true, dailyData: {} },
  { id: 'lv5', name: 'Parada Joven', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], time: '12:30', active: true, dailyData: {} },
  { id: 'lv6', name: 'Hablando con Juana', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], time: '13:30', active: true, dailyData: {} },

  // SÁBADO
  { id: 's1', name: 'Buenos Días, Bayamo', days: ['Sábado'], time: '07:00', active: true, dailyData: {} },
  { id: 's2', name: 'Noticiero', days: ['Sábado'], time: '11:00', active: true, dailyData: {} },
  { id: 's3', name: 'Sigue a tu ritmo', days: ['Sábado'], time: '11:15', active: true, dailyData: {} },
  { id: 's4', name: 'Al son de la radio', days: ['Sábado'], time: '13:30', active: true, dailyData: {} },

  // DOMINGO
  { id: 'd1', name: 'Boletín', days: ['Domingo'], time: '07:00', active: true, dailyData: {} },
  { id: 'd2', name: 'Cómplices', days: ['Domingo'], time: '07:05', active: true, dailyData: {} },
  { id: 'd3', name: 'Coloreando Melodías', days: ['Domingo'], time: '09:00', active: true, dailyData: {} },
  { id: 'd4', name: 'Alba y crisol', days: ['Domingo'], time: '09:30', active: true, dailyData: {} },
  { id: 'd5', name: 'Estación 95.3', days: ['Domingo'], time: '10:00', active: true, dailyData: {} },
  { id: 'd6', name: 'Palco de Domingo', days: ['Domingo'], time: '13:30', active: true, dailyData: {} }
];

export const INITIAL_EFEMERIDES: EfemeridesData = {
  "Octubre": [
    { day: 10, event: "1868", description: "Levantamiento armado en La Demajagua encabezado por Carlos Manuel de Céspedes." },
    { day: 20, event: "1868", description: "Día de la Cultura Nacional: Se entona por primera vez el Himno de Bayamo." }
  ]
};

export const INITIAL_CONMEMORACIONES: ConmemoracionesData = {
  "Octubre": [
    { day: 10, national: "Inicio de las Guerras de Independencia", international: "" },
    { day: 20, national: "Día de la Cultura Cubana", international: "" }
  ]
};

export const INITIAL_DAY_THEMES: DayThemeData = {};

export const INITIAL_PROPAGANDA: PropagandaData = {
  "Historia": [],
  "Política": [],
  "Adicciones": [],
  "Gobierno": [],
  "Conmemoraciones": [],
  "Naturaleza": [],
  "Radio": [],
  "Bayamo": [],
  "Fidel": [],
  "Martí": []
};

export const INITIAL_CULTURAL_OPTIONS: CulturalOptionsData = {};

