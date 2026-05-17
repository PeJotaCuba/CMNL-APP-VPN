import { User, NewsItem } from '../types';
import { appData } from './initialData';
import { generateProgramming } from '../src/services/programmingService';
import { INITIAL_FICHAS } from './fichasData';

// Simulacion de archivo en carpeta Iconos - Logo sin el punto central
export const LOGO_URL = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='white' rx='80' ry='80'/%3E%3Cpath d='M140,380 V200 A60,60 0 0,1 260,200 V380' fill='none' stroke='%233E1E16' stroke-width='65' stroke-linecap='round' /%3E%3Cpath d='M260,380 V160 A100,100 0 0,1 460,160 V380' fill='none' stroke='%238B5E3C' stroke-width='65' stroke-linecap='round' /%3E%3C/svg%3E";

// Helper to safely encode Unicode strings to Base64
const utf8_to_b64 = (str: string) => {
  return window.btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      (match, p1) => String.fromCharCode(parseInt(p1, 16)))
  );
};

const formatTo12Hour = (timeStr: string): string => {
    if (!timeStr || !timeStr.includes(':')) return timeStr;
    // If already formatted with AM/PM, return as is
    if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) {
        return timeStr.trim();
    }
    try {
        const [hourStr, minStr] = timeStr.trim().split(':');
        let hour = parseInt(hourStr, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12; // the hour '0' should be '12'
        return `${hour}:${minStr} ${ampm}`;
    } catch (e) {
        return timeStr;
    }
};

// Helper to generate SVG Vector Backgrounds based on category
export const getCategoryVector = (category: string, title: string): string => {
  const cat = (category || '').toLowerCase().trim();
  const t = (title || '').toLowerCase();
  
  let colors = ['#8B5E3C', '#5D3A24']; // Default Brown
  let iconShape = '';

  // Detect category keywords
  if (cat.includes('deporte') || t.includes('pelota') || t.includes('beisbol') || t.includes('juego')) {
    colors = ['#059669', '#064E3B']; // Green (Sports)
    iconShape = '<circle cx="50%" cy="50%" r="80" fill="rgba(255,255,255,0.1)"/><path d="M200,300 Q300,400 400,300" stroke="rgba(255,255,255,0.1)" stroke-width="20" fill="none"/>';
  } else if (cat.includes('cultura') || t.includes('arte') || t.includes('musica')) {
    colors = ['#7C3AED', '#4C1D95']; // Purple (Culture)
    iconShape = '<rect x="200" y="100" width="200" height="200" transform="rotate(45 300 200)" fill="rgba(255,255,255,0.1)"/>';
  } else if (cat.includes('política') || cat.includes('politica') || t.includes('reunion') || t.includes('asamblea')) {
    colors = ['#475569', '#1E293B']; // Slate (Politics)
    iconShape = '<rect x="250" y="50" width="100" height="300" fill="rgba(255,255,255,0.1)"/><rect x="150" y="50" width="300" height="50" fill="rgba(255,255,255,0.1)"/>';
  } else if (cat.includes('economía') || cat.includes('economia') || t.includes('produccion')) {
    colors = ['#D97706', '#92400E']; // Amber (Economy)
    iconShape = '<path d="M100,300 L200,200 L300,250 L500,50" stroke="rgba(255,255,255,0.1)" stroke-width="30" fill="none"/>';
  } else if (cat.includes('clima') || cat.includes('tiempo') || t.includes('lluvia') || t.includes('sol')) {
    colors = ['#0284C7', '#0C4A6E']; // Sky Blue (Climate)
    iconShape = '<circle cx="300" cy="150" r="60" fill="rgba(255,255,255,0.1)"/><circle cx="350" cy="200" r="80" fill="rgba(255,255,255,0.1)"/><circle cx="250" cy="200" r="70" fill="rgba(255,255,255,0.1)"/>';
  } else if (cat.includes('sociedad') || t.includes('social') || t.includes('pueblo')) {
    colors = ['#BE123C', '#881337']; // Rose (Society)
    iconShape = '<circle cx="300" cy="150" r="50" fill="rgba(255,255,255,0.1)"/><path d="M200,350 Q300,200 400,350" fill="rgba(255,255,255,0.1)"/>';
  } else {
    // Generic fallback based on RCM Brand
    colors = ['#8B5E3C', '#3E1E16'];
    iconShape = '<circle cx="50%" cy="50%" r="100" stroke="rgba(255,255,255,0.1)" stroke-width="40" fill="none"/>';
  }

  const svg = `
    <svg width="600" height="300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      ${iconShape}
      <text x="50%" y="90%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="rgba(255,255,255,0.3)" font-weight="bold" letter-spacing="4px">${category.toUpperCase()}</text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${utf8_to_b64(svg)}`;
};

// --- DATA MAPPING ---

// Users from JSON
export const INITIAL_USERS: User[] = (appData.users || []).map(u => ({
  ...u,
  id: u.id || u.username,
  role: u.role as 'admin' | 'worker' | 'listener', // Ensure type safety
  classification: u.classification as any
}));

// Content from JSON
export const INITIAL_HISTORY = appData.historyContent || '';
export const INITIAL_ABOUT = appData.aboutContent || '';

// News from JSON with Vector Image Generation
export const INITIAL_NEWS: NewsItem[] = (appData.news || []).map(n => ({
  ...n,
  // If image is missing, empty, or a stock photo URL, generate a vector one
  image: (!n.image || n.image.includes('picsum.photos') || n.image === '') 
    ? getCategoryVector(n.category || 'Boletín', n.title) 
    : n.image
}));

// --- SCHEDULING LOGIC ---

export const getCurrentProgram = (): { name: string; time: string; image: string } => {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;

  const savedFichas = localStorage.getItem('rcm_data_fichas');
  const manualData = localStorage.getItem('rcm_manual_programming');
  const fichas = savedFichas ? JSON.parse(savedFichas) : INITIAL_FICHAS;
  
  let programming: any[] = [];
  if (manualData && manualData !== '[]') {
      try {
          programming = JSON.parse(manualData);
      } catch (e) {
          programming = generateProgramming(fichas);
      }
  } else {
      programming = generateProgramming(fichas);
  }
  
  if (programming.length === 0) {
      programming = generateProgramming(fichas);
  }

  // Find current program from programming
  const current = programming.find(p => {
    if (!p.days.includes(day)) return false;
    
    const parseTime = (timeStr: string) => {
        const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
        if (!match) {
            const parts = timeStr.split(':').map(Number);
            return parts[0] * 60 + (parts[1] || 0);
        }
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = match[3] ? match[3].toUpperCase() : null;
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return h * 60 + m;
    };

    const startTotal = parseTime(p.start);
    const endTotal = parseTime(p.end);
    
    if (endTotal < startTotal) {
      return totalMinutes >= startTotal || totalMinutes < endTotal;
    }
    
    return totalMinutes >= startTotal && totalMinutes < endTotal;
  });

  if (current) {
    return {
      name: current.name,
      time: `${formatTo12Hour(current.start)} - ${formatTo12Hour(current.end)}`,
      image: getCategoryVector("Programa", current.name)
    };
  }

  // Fallback logic
  // --- PRIORITY 1: Enlace a Radio Bayamo (3:00 PM to 7:00 AM next day) ---
  if (totalMinutes >= 900 || totalMinutes < 420) {
    return { 
      name: "Enlace a Radio Bayamo", 
      time: "3:00 PM - 7:00 AM", 
      image: getCategoryVector("Cadena", "Enlace Provincial")
    };
  }

  // --- PRIORITY 2: Noticieros ---
  if (totalMinutes >= 720 && totalMinutes < 750) {
    if (day !== 0) {
      return { name: "Noticiero Provincial", time: "12:00 PM - 12:30 PM", image: getCategoryVector("Noticias", "Informativo") };
    }
  }

  if (totalMinutes >= 780 && totalMinutes < 810) {
    return { name: "Noticiero Nacional", time: "1:00 PM - 1:30 PM", image: getCategoryVector("Noticias", "Nacional") };
  }

  return { name: "Promociones y mensajes", time: "Transmisión Continua", image: getCategoryVector("Propaganda", "General") };
};
