export enum UserRole {
  ESCRITOR = 'escritor',
  ADMIN = 'admin'
}

export interface UserInterests {
  days: string[];
  programIds: string[];
}

export interface DailyContent {
  theme: string;
  ideas?: string;
  instructions?: string; // Mantenido por compatibilidad legacy si fuera necesario
}

export interface DayThemeData {
  [dateKey: string]: string;
}

export interface Program {
  id: string;
  name: string;
  days: string[];
  time: string;
  active: boolean;
  dailyData?: Record<string, DailyContent>;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  pin: string; // Cambiado de password a pin
  role: UserRole;
  phone: string;
  email?: string;
  photo?: string;
  classification?: string;
  specialty?: string;
  coordinatorSections?: string[];
  interests?: UserInterests;
  habitualPrograms?: string[];
  habitualProgramsByRole?: Record<string, string[]>;
  habitualProgramsDays?: Record<string, Record<string, string[]>>;
}

export interface CloudConfig {
  endpoint: string; // URL de Firebase (ej: https://proyecto.firebaseio.com)
  apiKey: string;   // Opcional (Secret)
}

export interface MonthData {
  id: string;
  name: string;
  status: 'listo' | 'revision' | 'actual' | 'pendiente' | 'completado' | 'bloqueado';
  color: string;
  isDraft?: boolean;
}

export interface Efemeride {
  day: number;
  event: string;
  description: string;
}

export interface Conmemoracion {
  day: number;
  national: string;
  international: string;
}

export type EfemeridesData = Record<string, Efemeride[]>; 
export type ConmemoracionesData = Record<string, Conmemoracion[]>;
export type PropagandaData = Record<string, string[]>;

export interface CulturalOption {
  actividad: string;
  hora: string;
  lugar: string;
}

export interface CulturalDay {
  day: number;
  activities: CulturalOption[];
}

export type CulturalOptionsData = Record<string, CulturalDay[]>;

