import { ProgramFicha } from '../../types';

export interface ProgramSchedule {
    name: string;
    start: string;
    end: string;
    days: number[]; // 0 = Sunday, 1 = Monday, etc.
    parent?: string; // For programs inside another program
}

export const generateProgramming = (fichas: ProgramFicha[]) => {
    const programming: ProgramSchedule[] = [];

    const parseDurationToMinutes = (dur: string): number => {
        if (!dur) return 0;
        const str = dur.toLowerCase().trim();
        const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
        if (timeMatch) return parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
        const minMatch = str.match(/(\d+)\s*(?:min|m)/);
        if (minMatch) return parseInt(minMatch[1], 10);
        const hourMatch = str.match(/(\d+)\s*(?:hora|h)/);
        if (hourMatch) return parseInt(hourMatch[1], 10) * 60;
        const numMatch = str.match(/^(\d+)$/);
        if (numMatch) return parseInt(numMatch[1], 10);
        return 0;
    };

    const complicesFicha = fichas.find(f => f.name.toLowerCase().includes('cómplices') || f.name.toLowerCase().includes('complices'));

    fichas.forEach(ficha => {
        // Parse frequency to determine days
        const days: number[] = [];
        const freq = ficha.frequency.toLowerCase();
        
        // Handle ranges like "Lunes a Viernes" or "Lunes a Sábado"
        if (freq.includes('lunes a viernes')) {
            days.push(1, 2, 3, 4, 5);
        } else if (freq.includes('lunes a sábado') || freq.includes('lunes a sabado')) {
            days.push(1, 2, 3, 4, 5, 6);
        } else if (freq.includes('lunes a domingo')) {
            days.push(0, 1, 2, 3, 4, 5, 6);
        } else {
            if (freq.includes('lunes')) days.push(1);
            if (freq.includes('martes')) days.push(2);
            if (freq.includes('miércoles') || freq.includes('miercoles')) days.push(3);
            if (freq.includes('jueves')) days.push(4);
            if (freq.includes('viernes')) days.push(5);
            if (freq.includes('sábado') || freq.includes('sabado')) days.push(6);
            if (freq.includes('domingo')) days.push(0);
        }
        
        // Parse schedule (e.g., "07:00-08:00" or "7:02 AM - 8:58 AM")
        let scheduleStr = ficha.schedule;
        
        const convertTo24H = (timeStr: string) => {
            if (!timeStr) return "00:00";
            const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
            if (!match) return timeStr.trim();
            let h = parseInt(match[1], 10);
            const m = match[2];
            const ampm = match[3] ? match[3].toUpperCase() : null;
            if (ampm === 'PM' && h < 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            return `${h.toString().padStart(2, '0')}:${m}`;
        };
        
        // Special case for nested programs
        const isNested = ficha.name.toLowerCase().includes('alba y crisol') || ficha.name.toLowerCase().includes('coloreando melodías');
        if (isNested && complicesFicha) {
            scheduleStr = complicesFicha.schedule;
            
            // Extract exact start time from Cómplices profile if available
            const profile = complicesFicha.profile || '';
            const normalizedName = ficha.name.toLowerCase();
            
            if (normalizedName.includes('alba y crisol')) {
                const match = profile.match(/Alba y Crisol\s*[:(]?\s*(\d{1,2}:\d{2})/i);
                if (match) {
                    const startTime = match[1];
                    const duration = parseDurationToMinutes(ficha.duration);
                    const [h, m] = startTime.split(':').map(Number);
                    const totalMinutes = h * 60 + m + duration;
                    const endH = Math.floor(totalMinutes / 60);
                    const endM = totalMinutes % 60;
                    scheduleStr = `${startTime}-${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                }
            } else if (normalizedName.includes('coloreando melodías') || normalizedName.includes('coloreando melodias')) {
                const match = profile.match(/Coloreando melod[ií]as\s*[:(]?\s*(\d{1,2}:\d{2})/i);
                if (match) {
                    const startTime = match[1];
                    const duration = parseDurationToMinutes(ficha.duration);
                    const [h, m] = startTime.split(':').map(Number);
                    const totalMinutes = h * 60 + m + duration;
                    const endH = Math.floor(totalMinutes / 60);
                    const endM = totalMinutes % 60;
                    scheduleStr = `${startTime}-${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                }
            }
        }

        const [startRaw, endRaw] = scheduleStr.split('-');
        const start = convertTo24H(startRaw);
        const end = convertTo24H(endRaw);
        
        let parent: string | undefined;
        if (isNested) {
            parent = 'Cómplices';
        }

        // Normalize name: strip suffixes like (Lunes a Viernes), (Sábado), etc.
        let name = ficha.name;
        const suffixMatch = name.match(/^(.*?)\s*\((.*?)\)$/);
        if (suffixMatch) {
            name = suffixMatch[1].trim();
        }
        
        // Special case: Sigue a Tu Ritmo (Saturday split)
        if (name.toLowerCase().includes('sigue a tu ritmo') && days.includes(6)) {
            // Part 1: 11:15 - 12:00
            programming.push({
                name: name,
                start: "11:15",
                end: "12:00",
                days: [6]
            });
            // Part 2: 12:28 - 12:58
            programming.push({
                name: name,
                start: "12:28",
                end: "12:58",
                days: [6]
            });
            
            // If it also has other days, add them normally (though usually it's just Saturday)
            const otherDays = days.filter(d => d !== 6);
            if (otherDays.length > 0) {
                programming.push({
                    name: name,
                    start,
                    end,
                    days: otherDays,
                    parent
                });
            }
        } else {
            programming.push({
                name: name,
                start,
                end,
                days,
                parent
            });
        }
    });

    // Add News Programs
    // Noticiero Provincial: Lunes a Sábado, 12:00 PM (12:00 - 12:28)
    programming.push({
        name: "Noticiero Provincial",
        start: "12:00",
        end: "12:28",
        days: [1, 2, 3, 4, 5, 6]
    });

    // Noticiero Nacional: Lunes a Domingo, 1:00 PM (13:00 - 13:30)
    programming.push({
        name: "Noticiero Nacional",
        start: "13:00",
        end: "13:30",
        days: [0, 1, 2, 3, 4, 5, 6]
    });

    return programming.sort((a, b) => {
        const getMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number);
            return h * 60 + m;
        };

        // Special case: Cómplices first on Sunday
        if (a.name.toLowerCase().includes('cómplices') && b.days.includes(0) && a.days.includes(0)) {
            return -1;
        }
        if (b.name.toLowerCase().includes('cómplices') && a.days.includes(0) && b.days.includes(0)) {
            return 1;
        }

        return getMinutes(a.start) - getMinutes(b.start);
    });
};
