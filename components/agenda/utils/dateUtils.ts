export const getCurrentDateInfo = () => {
  const now = new Date();
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  const day = now.getDate();
  const monthName = monthNames[now.getMonth()];
  const year = now.getFullYear();
  
  return {
    day,
    monthName,
    year,
    fullDate: now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  };
};

export const getAgendaFilenameCode = (): string => {
  const now = new Date();
  // Mes (0-11) a (01-12)
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  
  // Calcular semana del mes (aproximada basada en el día actual)
  // Día 1-7 = Semana 1, 8-14 = Semana 2, etc.
  const day = now.getDate();
  const week = Math.ceil(day / 7).toString().padStart(2, '0');
  
  return `Agenda${month}${week}`;
};

export interface DayInfo {
  name: string;
  date: number;
  month?: number;
  year?: number;
}

export interface WeekInfo {
  id: string;
  label: string;
  range: string;
  days: (DayInfo | null)[];
  start: number;
  end: number;
}

export const getWeeksInMonth = (targetDate: Date = new Date()): WeekInfo[] => {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  let dayOfWeek = firstDayOfMonth.getDay();
  dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=Mon, 6=Sun
  
  let currentWeekStart = new Date(year, month, 1 - dayOfWeek);
  
  if (dayOfWeek > 3) {
    // 1st is Fri, Sat, Sun. First week starts next Monday.
    currentWeekStart = new Date(year, month, 1 + (7 - dayOfWeek));
  }
  
  const weeks: WeekInfo[] = [];
  let weekCount = 1;
  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  
  while (true) {
    // Check if this week belongs to the current month
    // The Thursday of this week is currentWeekStart + 3 days
    const thursday = new Date(currentWeekStart);
    thursday.setDate(thursday.getDate() + 3);
    
    if (thursday.getMonth() !== month) {
      // If Thursday is in the next month, this week belongs to the next month
      break;
    }
    
    const days: (DayInfo | null)[] = [];
    let startDay = 0;
    let endDay = 0;
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      days.push({
        name: dayNames[i],
        date: d.getDate(),
        month: d.getMonth(),
        year: d.getFullYear()
      });
      if (i === 0) startDay = d.getDate();
      if (i === 6) endDay = d.getDate();
    }
    
    weeks.push({
      id: `semana-${weekCount}`,
      label: `Semana ${weekCount}`,
      range: `${startDay} - ${endDay}`,
      days,
      start: startDay,
      end: endDay
    });
    
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    weekCount++;
  }
  
  return weeks;
};
