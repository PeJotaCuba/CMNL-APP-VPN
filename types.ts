export enum AppView {
  LANDING = 'LANDING', // Now acts as Login View
  LISTENER_HOME = 'LISTENER_HOME',
  WORKER_HOME = 'WORKER_HOME',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  APP_EQUIPO = 'APP_EQUIPO',
  APP_TOOLS = 'APP_TOOLS',
  
  // CMNL Apps
  APP_AGENDA = 'APP_AGENDA',
  APP_MUSICA = 'APP_MUSICA',
  APP_GUIONES = 'APP_GUIONES',
  APP_PROGRAMACION = 'APP_PROGRAMACION',
  APP_REPORTES = 'APP_REPORTES',

  // Sections
  SECTION_HISTORY = 'SECTION_HISTORY',
  SECTION_HISTORY_EVOLUTION = 'SECTION_HISTORY_EVOLUTION', // Nueva vista
  SECTION_PROGRAMMING_PUBLIC = 'SECTION_PROGRAMMING_PUBLIC',
  SECTION_ABOUT = 'SECTION_ABOUT',
  SECTION_NEWS = 'SECTION_NEWS',
  SECTION_NEWS_DETAIL = 'SECTION_NEWS_DETAIL', // New view for reading news
  SECTION_PODCAST = 'SECTION_PODCAST',
  SECTION_PROFILE = 'SECTION_PROFILE',
}

export interface HistoricalMonthData {
  month: number; // 0-11
  year: number;
  scheduledHours: number;
  interruptionsMinutes: number;
  consolidated: boolean;
}

export type UserClassification = 'director' | 'Director' | 'asesor' | 'Asesor' | 'realizador' | 'Realizador de sonido' | 'locutor' | 'Locutor' | 'guionista' | 'Guionista' | 'periodista' | 'Periodista' | 'coordinador' | 'Coordinador' | 'director de emisora' | 'Director de la emisora' | 'jefe de programación' | 'Jefe de Programación' | 'especialista' | 'Especialista' | 'auxiliar general' | 'asistente de dirección' | 'recepcionista' | 'Administrador' | 'Trabajador' | 'Usuario' | 'Directora';

export interface NewsItem {
  id: string;
  title: string;
  category: string;
  date: string;
  excerpt?: string;
  content: string;
  image?: string;
  author?: string;
}

export interface ProgramItem {
  id: string;
  name: string;
  time: string;
  days: string[];
  description: string;
  image?: string;
}

export interface UserPermissions {
  canEditNews: boolean;
  canEditProgramming: boolean;
  canEditAbout: boolean;
  canEditCatalog: boolean;
  canEditFichas: boolean;
  canEditHours: boolean;
  canEditTeam: boolean;
}

export interface FP02Especialidad {
  rol: string;
  nombre: string;
}

export interface FP02Report {
  id: string;
  fecha: string;
  emisora: string;
  programa: string;
  grupo?: string;
  tipo?: string;
  hora?: string;
  especialidades: FP02Especialidad[];
  mes: string; // for grouping by month
}

export interface ConsolidatedPayment {
    id: string;
    userId: string;
    month: string;
    amount: number;
    grossAmount?: number;
    taxAmount?: number;
    dateConsolidated: string;
    calculationMode?: string;
    reportCount?: number;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'worker' | 'listener' | 'coordinator';
  name: string;
  classification?: UserClassification;
  specialty?: string;
  habitualPrograms?: string[];
  habitualProgramsByRole?: Record<string, string[]>;
  habitualProgramsDays?: Record<string, Record<string, string[]>>; // role -> program -> days[]
  avatar?: string;
  mobile?: string;
  email?: string;
  password?: string;
  permissions?: UserPermissions;
  coordinatorSections?: string[];
  tools?: string[];
}

export interface ProgramSchedule {
  name: string;
  start: string;
  end: string;
  days: number[]; // 0 = Sunday, 1 = Monday, etc.
}

export interface ProgramSection {
  name: string;
  schedule: string;
  duration: string;
  description: string;
}

export interface RolePaymentInfo {
  role: string;
  percentage: string;
  tr: string;
  salaries: { level: string; amount: string }[];
  rates: { level: string; amount: string }[];
}

export interface ProgramCatalog {
  name: string;
  roles: RolePaymentInfo[];
}

export interface Script {
  id: string;
  title: string;
  genre: string;
  dateAdded: string;
  writer: string;
  advisor: string;
  themes: string[];
  content?: string;
}

export interface ProgramFicha {
  name: string;
  schedule: string;
  duration: string;
  frequency: string;
  func: string;
  music_cuban: string;
  music_foreign: string;
  group: string;
  form: string;
  complexity: string;
  theme: string;
  target: string;
  times: {
    music: string;
    info: string;
    propaganda: string;
  };
  startDate: string;
  emissionType: string;
  literarySupport: string;
  objective: string;
  profile: string;
  sections: ProgramSection[];
}
export interface WorkLog {
    id: string;
    userId: string;
    role: string;
    programName: string;
    date: string;
    amount?: number;
    hours?: number;
    type?: string;
    syncStatus?: string;
}
