import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { ProgramFicha } from '../types';
import { TransmissionBreakdown } from '../src/services/transmissionService';

interface Interruption {
    id: string;
    date: string;
    programName: string;
    category: keyof TransmissionBreakdown;
    affectedMinutes: number;
    percentage: number;
    startTime: string;
    endTime: string;
}

interface Props {
    onClose: () => void;
    onSave: (interruptions: Interruption[]) => void;
    fichas: ProgramFicha[];
    categories: (keyof TransmissionBreakdown)[];
    categoryLabels: Record<keyof TransmissionBreakdown, string>;
    categoryPrograms?: Record<string, string[]>;
}

const CABINA_SEGMENTS = [
    { name: 'Cabina 12:00-12:30', duration: 30, category: 'variados' as keyof TransmissionBreakdown, schedule: '12:00 - 12:30' },
    { name: 'Cabina 13:00-13:30', duration: 30, category: 'variados' as keyof TransmissionBreakdown, schedule: '13:00 - 13:30' }
];

const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length < 2) return 0;
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    return hours * 60 + minutes;
};

const formatMinutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const InterruptionModal: React.FC<Props> = ({ onClose, onSave, fichas, categories, categoryLabels, categoryPrograms }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Interruption range: 07:00 AM (420) to 03:00 PM (900)
    const [iInicio, setIInicio] = useState(420);
    const [iFin, setIFin] = useState(480);

    const getProgramDetails = (name: string) => {
        const cabina = CABINA_SEGMENTS.find(c => c.name === name);
        if (cabina) {
            return {
                dTotal: cabina.duration,
                category: cabina.category,
                tInicio: parseTimeToMinutes(cabina.schedule.split('-')[0].trim())
            };
        }
        const ficha = fichas.find(f => f.name === name);
        if (ficha) {
            const lower = (ficha.duration || '').toLowerCase();
            let totalMinutes = 0;
            const hoursMatch = lower.match(/(\d+)\s*hora/);
            if (hoursMatch) totalMinutes += parseInt(hoursMatch[1]) * 60;
            const minutesMatch = lower.match(/(\d+)\s*minuto/);
            if (minutesMatch) totalMinutes += parseInt(minutesMatch[1]);
            if (totalMinutes === 0) {
                const match = lower.match(/(\d+)/);
                if (match) totalMinutes = parseInt(match[1]);
            }
            const dTotal = totalMinutes || 60;
            const scheduleParts = ficha.schedule.split('-');
            const tInicio = scheduleParts.length > 0 ? parseTimeToMinutes(scheduleParts[0].trim()) : 0;
            
            // Find category for this program
            let category: keyof TransmissionBreakdown = 'variados';
            if (categoryPrograms) {
                for (const [cat, programs] of Object.entries(categoryPrograms)) {
                    if ((programs as string[]).includes(name)) {
                        category = cat as keyof TransmissionBreakdown;
                        break;
                    }
                }
            }

            return { dTotal, category, tInicio };
        }
        return null;
    };

    const isProgramOnDay = (program: any, dateStr: string) => {
        // Use T12:00:00 to avoid timezone issues with YYYY-MM-DD
        const date = new Date(dateStr + 'T12:00:00');
        const day = date.getDay(); // 0 = Sunday, 1 = Monday, ...
        
        // If it's a cabina segment, assume daily
        if (!program.frequency) return true;

        const freq = program.frequency.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        // Normalize frequency string
        if (freq.includes('diario') || freq.includes('lunes a domingo') || freq.includes('lunes-domingo') || freq.includes('lunes - domingo')) return true;
        if ((freq.includes('lunes a sabado') || freq.includes('lunes-sabado') || freq.includes('lunes - sabado')) && day !== 0) return true;
        if ((freq.includes('lunes a viernes') || freq.includes('lunes-viernes') || freq.includes('lunes - viernes')) && day >= 1 && day <= 5) return true;
        if ((freq.includes('lunes a jueves') || freq.includes('lunes-jueves') || freq.includes('lunes - jueves')) && day >= 1 && day <= 4) return true;
        if ((freq.includes('lunes a miercoles') || freq.includes('lunes-miercoles') || freq.includes('lunes - miercoles')) && day >= 1 && day <= 3) return true;
        if ((freq.includes('martes a viernes') || freq.includes('martes-viernes') || freq.includes('martes - viernes')) && day >= 2 && day <= 5) return true;
        if ((freq.includes('martes a jueves') || freq.includes('martes-jueves') || freq.includes('martes - jueves')) && day >= 2 && day <= 4) return true;
        if ((freq.includes('miercoles a viernes') || freq.includes('miercoles-viernes') || freq.includes('miercoles - viernes')) && day >= 3 && day <= 5) return true;
        if ((freq.includes('jueves a domingo') || freq.includes('jueves-domingo') || freq.includes('jueves - domingo')) && (day >= 4 || day === 0)) return true;
        if ((freq.includes('viernes a domingo') || freq.includes('viernes-domingo') || freq.includes('viernes - domingo')) && (day >= 5 || day === 0)) return true;
        if ((freq.includes('fines de semana') || freq.includes('fin de semana')) && (day === 0 || day === 6)) return true;
        
        const daysMap: { [key: number]: string[] } = {
            0: ['domingo', 'dominical'],
            1: ['lunes'],
            2: ['martes'],
            3: ['miercoles'],
            4: ['jueves'],
            5: ['viernes'],
            6: ['sabado', 'sabatina']
        };

        return daysMap[day].some(d => freq.includes(d));
    };

    const calculateAffectedPrograms = () => {
        const affected: { name: string; minutes: number; category: keyof TransmissionBreakdown }[] = [];

        // Check Cabina Segments
        CABINA_SEGMENTS.forEach(cabina => {
            const tInicio = parseTimeToMinutes(cabina.schedule.split('-')[0].trim());
            const tFin = tInicio + cabina.duration;
            
            const ruleA = iInicio >= (tInicio + 5);
            const ruleB = iFin <= (tInicio + (0.75 * cabina.duration));
            const hasOverlap = Math.max(iInicio, tInicio) < Math.min(iFin, tFin);

            if (hasOverlap && !ruleA && !ruleB) {
                affected.push({ name: cabina.name, minutes: cabina.duration, category: cabina.category });
            }
        });

        // Check Fichas
        fichas.forEach(ficha => {
            if (!isProgramOnDay(ficha, date)) return;

            const details = getProgramDetails(ficha.name);
            if (!details) return;

            const { dTotal, category, tInicio } = details;
            const tFin = tInicio + dTotal;

            const ruleA = iInicio >= (tInicio + 5);
            const ruleB = iFin <= (tInicio + (0.75 * dTotal));
            const hasOverlap = Math.max(iInicio, tInicio) < Math.min(iFin, tFin);

            if (hasOverlap && !ruleA && !ruleB) {
                affected.push({ name: ficha.name, minutes: dTotal, category });
            }
        });

        return affected;
    };

    const affectedPrograms = calculateAffectedPrograms();

    const handleSave = () => {
        if (affectedPrograms.length === 0) return;

        const hasComplices = affectedPrograms.some(p => p.name.toLowerCase() === 'cómplices' || p.name.toLowerCase() === 'complices');
        const timestamp = Date.now();

        const newInterruptions: Interruption[] = affectedPrograms.map(p => {
            let finalMinutes = p.minutes;
            const pNameLower = p.name.toLowerCase();
            if (hasComplices && (pNameLower === 'alba y crisol' || pNameLower === 'coloreando melodías' || pNameLower === 'coloreando melodias')) {
                finalMinutes = 0;
            }

            return {
                id: `${timestamp}-${p.name}`,
                date,
                programName: p.name,
                category: p.category,
                affectedMinutes: finalMinutes,
                percentage: 100,
                startTime: formatMinutesToTime(iInicio),
                endTime: formatMinutesToTime(iFin)
            };
        });

        onSave(newInterruptions);
    };

    const handleManualTimeChange = (type: 'inicio' | 'fin', field: 'h' | 'm', value: number) => {
        if (type === 'inicio') {
            const h = field === 'h' ? value : Math.floor(iInicio / 60);
            const m = field === 'm' ? value : iInicio % 60;
            setIInicio(Math.min(900, Math.max(420, h * 60 + m)));
        } else {
            const h = field === 'h' ? value : Math.floor(iFin / 60);
            const m = field === 'm' ? value : iFin % 60;
            setIFin(Math.min(900, Math.max(420, h * 60 + m)));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20 p-6 max-w-lg w-full shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Registrar Interrupción Técnica</h3>
                    <button onClick={onClose} className="text-[#E8DCCF]/50 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="space-y-6 mb-8">
                    <div>
                        <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider mb-1 block">Fecha</label>
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-3 text-white" 
                        />
                    </div>

                    <div className="space-y-4 bg-[#1A100C] p-4 rounded-xl border border-[#9E7649]/10">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-[#9E7649]">Rango de Interrupción</span>
                            <span className="text-xs text-[#E8DCCF]/40">07:00 AM - 03:00 PM</span>
                        </div>

                        <div className="space-y-6">
                            {/* Inicio Slider */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-[#E8DCCF]/60">Inicio: {formatMinutesToTime(iInicio)}</span>
                                    <div className="flex gap-2">
                                        <input 
                                            type="number" min="7" max="15" 
                                            value={Math.floor(iInicio / 60)}
                                            onChange={e => handleManualTimeChange('inicio', 'h', parseInt(e.target.value) || 0)}
                                            className="w-12 bg-[#2C1B15] border border-[#9E7649]/30 rounded p-1 text-center text-xs"
                                        />
                                        <span className="text-[#E8DCCF]/30">:</span>
                                        <input 
                                            type="number" min="0" max="59" 
                                            value={iInicio % 60}
                                            onChange={e => handleManualTimeChange('inicio', 'm', parseInt(e.target.value) || 0)}
                                            className="w-12 bg-[#2C1B15] border border-[#9E7649]/30 rounded p-1 text-center text-xs"
                                        />
                                    </div>
                                </div>
                                <input 
                                    type="range" min="420" max="900" step="1"
                                    value={iInicio}
                                    onChange={e => setIInicio(parseInt(e.target.value))}
                                    className="w-full accent-[#9E7649]"
                                />
                            </div>

                            {/* Fin Slider */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-[#E8DCCF]/60">Fin: {formatMinutesToTime(iFin)}</span>
                                    <div className="flex gap-2">
                                        <input 
                                            type="number" min="7" max="15" 
                                            value={Math.floor(iFin / 60)}
                                            onChange={e => handleManualTimeChange('fin', 'h', parseInt(e.target.value) || 0)}
                                            className="w-12 bg-[#2C1B15] border border-[#9E7649]/30 rounded p-1 text-center text-xs"
                                        />
                                        <span className="text-[#E8DCCF]/30">:</span>
                                        <input 
                                            type="number" min="0" max="59" 
                                            value={iFin % 60}
                                            onChange={e => handleManualTimeChange('fin', 'm', parseInt(e.target.value) || 0)}
                                            className="w-12 bg-[#2C1B15] border border-[#9E7649]/30 rounded p-1 text-center text-xs"
                                        />
                                    </div>
                                </div>
                                <input 
                                    type="range" min="420" max="900" step="1"
                                    value={iFin}
                                    onChange={e => setIFin(parseInt(e.target.value))}
                                    className="w-full accent-[#9E7649]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-[#E8DCCF]/50 uppercase tracking-wider block">Programas Afectados</label>
                        <div className="bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
                            {affectedPrograms.length > 0 ? (
                                <ul className="space-y-2">
                                    {affectedPrograms.map(p => (
                                        <li key={p.name} className="flex justify-between items-center text-sm">
                                            <span className="text-white">{p.name}</span>
                                            <span className="text-red-400 font-mono font-bold">{p.minutes} min</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-[#E8DCCF]/30 text-sm italic text-center mt-8">No hay programas afectados en este rango</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold text-[#9E7649] hover:bg-[#9E7649]/10">Cancelar</button>
                    <button 
                        onClick={handleSave} 
                        disabled={affectedPrograms.length === 0 || iFin <= iInicio}
                        className="px-6 py-2 rounded-lg text-sm font-bold bg-[#9E7649] text-white hover:bg-[#8B653D] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-[#9E7649]/20"
                    >
                        <Save size={16} /> Registrar Interrupción
                    </button>
                </div>
            </div>
        </div>
    );
};
