
export const calculateScheduledHours = (month: number, year: number): number => {
  const date = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let scheduledHours = 0;

  for (let i = 1; i <= daysInMonth; i++) {
    const day = new Date(year, month, i).getDay();
    // Lunes a Viernes (1-5) = 24h, Sábado (6) = 24h, Domingo (0) = 24h
    // Ajustar según la lógica real de la emisora
    scheduledHours += 24;
  }
  return scheduledHours;
};

export const canConsolidate = (month: number, year: number): boolean => {
  const now = new Date();
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  // El mes debe haber terminado
  if (now < lastDayOfMonth) {
    return false;
  }
  
  // Si es el mes actual, debe ser después del último día
  if (now.getMonth() === month && now.getFullYear() === year) {
    return now.getDate() >= lastDayOfMonth.getDate();
  }
  
  return true;
};
