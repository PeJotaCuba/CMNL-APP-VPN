import { MonthData, Program } from './types';

export const PROGRAMS: Program[] = [
  // LUNES A VIERNES
  { id: 'lv1', name: 'Buenos Días, Bayamo', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], time: '07:00', active: true },
  { id: 'lv2', name: 'Todos en Casa', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], time: '10:00', active: true },
  { id: 'lv3', name: 'Noticiero (RCM Noticias)', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], time: '11:00', active: true },
  { id: 'lv4', name: 'Arte Bayamo', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], time: '11:15', active: true },
  { id: 'lv5', name: 'Parada Joven', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], time: '12:30', active: true },
  { id: 'lv6', name: 'Hablando con Juana', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'], time: '13:30', active: true },

  // SÁBADO
  { id: 's1', name: 'Buenos Días, Bayamo', days: ['Sábado'], time: '07:00', active: true },
  { id: 's2', name: 'Noticiero', days: ['Sábado'], time: '11:00', active: true },
  { id: 's3', name: 'Sigue a tu ritmo', days: ['Sábado'], time: '11:15', active: true },
  { id: 's4', name: 'Al son de la radio', days: ['Sábado'], time: '13:30', active: true },

  // DOMINGO
  { id: 'd1', name: 'Boletín', days: ['Domingo'], time: '07:00', active: true },
  { id: 'd2', name: 'Cómplices', days: ['Domingo'], time: '07:05', active: true },
  { id: 'd3', name: 'Coloreando Melodías', days: ['Domingo'], time: '09:00', active: true },
  { id: 'd4', name: 'Alba y crisol', days: ['Domingo'], time: '09:30', active: true },
  { id: 'd5', name: 'Estación 95.3', days: ['Domingo'], time: '10:00', active: true },
  { id: 'd6', name: 'Palco de Domingo', days: ['Domingo'], time: '13:30', active: true }
];

export const MONTHS_DATA: MonthData[] = [
  { id: '1', name: 'Enero', status: 'listo', color: 'bg-primary' },
  { id: '2', name: 'Febrero', status: 'listo', color: 'bg-primary' },
  { id: '3', name: 'Marzo', status: 'listo', color: 'bg-primary' },
  { id: '4', name: 'Abril', status: 'listo', color: 'bg-primary' },
  { id: '5', name: 'Mayo', status: 'listo', color: 'bg-primary' },
  { id: '6', name: 'Junio', status: 'listo', color: 'bg-primary' },
  { id: '7', name: 'Julio', status: 'listo', color: 'bg-primary' },
  { id: '8', name: 'Agosto', status: 'listo', color: 'bg-primary' },
  { id: '9', name: 'Septiembre', status: 'revision', color: 'bg-amber-600' },
  { id: '10', name: 'Octubre', status: 'actual', color: 'bg-primary', isDraft: true },
  { id: '11', name: 'Noviembre', status: 'pendiente', color: 'bg-stone-700' },
  { id: '12', name: 'Diciembre', status: 'pendiente', color: 'bg-stone-700' },
];

export const REDACTORES = [
  { id: 'r1', name: 'Luis M. Pedroso', avatarUrl: 'https://i.pravatar.cc/150?u=r1' },
  { id: 'r2', name: 'Elena R. Silva', avatarUrl: 'https://i.pravatar.cc/150?u=r2' },
  { id: 'r3', name: 'Jorge L. Guerra', avatarUrl: 'https://i.pravatar.cc/150?u=r3' },
];
