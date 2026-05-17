
export interface TransmissionBreakdown {
    informativos: number;
    boletines: number;
    publicidad: number;
    educativos: number;
    orientacion: number;
    cienciaTecnica: number;
    variados: number;
    historicosGrabado: number;
    variadoInfantilGrabado: number;
    dramatizados: number;
    literaturaArte: number;
    musicales: number;
    deportivos: number;
    reposiciones: number;
    total: number;
}

export type DayType = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export const DEFAULT_DAY_MINUTES: Record<DayType, TransmissionBreakdown> = {
    MONDAY: {
        informativos: 69, boletines: 15, publicidad: 20, educativos: 0, orientacion: 171,
        cienciaTecnica: 3, variados: 101, historicosGrabado: 0,
        variadoInfantilGrabado: 0, dramatizados: 0, literaturaArte: 43, musicales: 58, deportivos: 0, reposiciones: 0, total: 480
    },
    TUESDAY: {
        informativos: 69, boletines: 15, publicidad: 20, educativos: 0, orientacion: 171,
        cienciaTecnica: 3, variados: 101, historicosGrabado: 0,
        variadoInfantilGrabado: 0, dramatizados: 0, literaturaArte: 43, musicales: 58, deportivos: 0, reposiciones: 0, total: 480
    },
    WEDNESDAY: {
        informativos: 69, boletines: 15, publicidad: 20, educativos: 0, orientacion: 171,
        cienciaTecnica: 3, variados: 101, historicosGrabado: 0,
        variadoInfantilGrabado: 0, dramatizados: 0, literaturaArte: 43, musicales: 58, deportivos: 0, reposiciones: 0, total: 480
    },
    THURSDAY: {
        informativos: 69, boletines: 15, publicidad: 20, educativos: 0, orientacion: 171,
        cienciaTecnica: 3, variados: 101, historicosGrabado: 0,
        variadoInfantilGrabado: 0, dramatizados: 0, literaturaArte: 43, musicales: 58, deportivos: 0, reposiciones: 0, total: 480
    },
    FRIDAY: {
        informativos: 69, boletines: 15, publicidad: 20, educativos: 0, orientacion: 171,
        cienciaTecnica: 3, variados: 101, historicosGrabado: 0,
        variadoInfantilGrabado: 0, dramatizados: 0, literaturaArte: 43, musicales: 58, deportivos: 0, reposiciones: 0, total: 480
    },
    SATURDAY: {
        informativos: 69, boletines: 15, publicidad: 16, educativos: 0, orientacion: 80,
        cienciaTecnica: 0, variados: 195, historicosGrabado: 0,
        variadoInfantilGrabado: 0, dramatizados: 0, literaturaArte: 0, musicales: 105, deportivos: 0, reposiciones: 0, total: 480
    },
    SUNDAY: {
        informativos: 28, boletines: 15, publicidad: 10, educativos: 0, orientacion: 139,
        cienciaTecnica: 5, variados: 0, historicosGrabado: 13,
        variadoInfantilGrabado: 13, dramatizados: 0, literaturaArte: 85, musicales: 172, deportivos: 0, reposiciones: 0, total: 480
    }
};

export const getDayMinutesConfig = (): Record<DayType, TransmissionBreakdown> & { categoryPrograms?: Record<string, string[]> } => {
    const saved = localStorage.getItem('rcm_transmission_config');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Migrate old WEEKDAY format if present
            if (parsed.WEEKDAY && !parsed.MONDAY) {
                return {
                    MONDAY: { ...DEFAULT_DAY_MINUTES.MONDAY, ...(parsed.WEEKDAY || {}) },
                    TUESDAY: { ...DEFAULT_DAY_MINUTES.TUESDAY, ...(parsed.WEEKDAY || {}) },
                    WEDNESDAY: { ...DEFAULT_DAY_MINUTES.WEDNESDAY, ...(parsed.WEEKDAY || {}) },
                    THURSDAY: { ...DEFAULT_DAY_MINUTES.THURSDAY, ...(parsed.WEEKDAY || {}) },
                    FRIDAY: { ...DEFAULT_DAY_MINUTES.FRIDAY, ...(parsed.WEEKDAY || {}) },
                    SATURDAY: { ...DEFAULT_DAY_MINUTES.SATURDAY, ...(parsed.SATURDAY || {}) },
                    SUNDAY: { ...DEFAULT_DAY_MINUTES.SUNDAY, ...(parsed.SUNDAY || {}) },
                    categoryPrograms: parsed.categoryPrograms || {}
                };
            }
            return {
                MONDAY: { ...DEFAULT_DAY_MINUTES.MONDAY, ...(parsed.MONDAY || {}) },
                TUESDAY: { ...DEFAULT_DAY_MINUTES.TUESDAY, ...(parsed.TUESDAY || {}) },
                WEDNESDAY: { ...DEFAULT_DAY_MINUTES.WEDNESDAY, ...(parsed.WEDNESDAY || {}) },
                THURSDAY: { ...DEFAULT_DAY_MINUTES.THURSDAY, ...(parsed.THURSDAY || {}) },
                FRIDAY: { ...DEFAULT_DAY_MINUTES.FRIDAY, ...(parsed.FRIDAY || {}) },
                SATURDAY: { ...DEFAULT_DAY_MINUTES.SATURDAY, ...(parsed.SATURDAY || {}) },
                SUNDAY: { ...DEFAULT_DAY_MINUTES.SUNDAY, ...(parsed.SUNDAY || {}) },
                categoryPrograms: parsed.categoryPrograms || {}
            };
        } catch (e) {
            console.error(e);
        }
    }
    return {
        ...DEFAULT_DAY_MINUTES,
        categoryPrograms: {
            informativos: ["Noticiero Nacional", "Noticiero Provincial", "RCM Noticias"],
            variados: ["Buenos Días Bayamo"],
            orientacion: ["Todos en Casa", "Parada Joven", "Hablando con Juana", "Cómplices", "Coloreando Melodías", "Sigue a tu ritmo"],
            literaturaArte: ["Arte Bayamo", "Alba y Crisol", "Palco de domingo"],
            musicales: ["La Cumbancha", "Estación 95.3"]
        }
    };
};

export const saveDayMinutesConfig = (config: Record<DayType, TransmissionBreakdown> & { categoryPrograms?: Record<string, string[]> }) => {
    for (const key of ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as DayType[]) {
        if (config[key]) {
            const day = config[key];
            let total = 0;
            for (const cat of Object.keys(day) as (keyof TransmissionBreakdown)[]) {
                if (cat !== 'total') {
                    total += Number(day[cat]) || 0;
                }
            }
            day.total = total;
        }
    }
    localStorage.setItem('rcm_transmission_config', JSON.stringify(config));
};

/**
 * Determines the type of day for a given date.
 * @param date The date to check.
 * @returns 'MONDAY', 'TUESDAY', etc.
 */
export const getDayType = (date: Date): DayType => {
    const days: DayType[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
};

/**
 * Calculates accumulated transmission data from the start of the month to the target date (D-1).
 * @param targetDate The end date for accumulation.
 * @param config The configuration matrix.
 * @returns An object with total hours and breakdown.
 */
export const getAccumulatedData = (targetDate: Date, config: Record<DayType, TransmissionBreakdown>) => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const dayOfMonth = targetDate.getDate() - 1; // Calculate up to D-1

    const accumulated: TransmissionBreakdown = {
        informativos: 0,
        boletines: 0,
        publicidad: 0,
        educativos: 0,
        orientacion: 0,
        cienciaTecnica: 0,
        variados: 0,
        historicosGrabado: 0,
        variadoInfantilGrabado: 0,
        dramatizados: 0,
        literaturaArte: 0,
        musicales: 0,
        deportivos: 0,
        reposiciones: 0,
        total: 0
    };

    for (let d = 1; d <= dayOfMonth; d++) {
        const current = new Date(year, month, d);
        const dayType = getDayType(current);
        const minutes = config[dayType] || DEFAULT_DAY_MINUTES[dayType];

        Object.keys(accumulated).forEach((key) => {
            const k = key as keyof TransmissionBreakdown;
            accumulated[k] += Number(minutes[k]) || 0;
        });
    }

    return {
        hours: parseFloat((accumulated.total / 60).toFixed(2)) || 0,
        breakdown: accumulated
    };
};

/**
 * Calculates total transmission data for a specific month.
 * @param month 0-indexed month (0 = Jan).
 * @param year The year.
 * @param config The configuration matrix.
 * @returns An object with total hours and breakdown.
 */
export const getMonthlyTotalData = (month: number, year: number, config: Record<DayType, TransmissionBreakdown>) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const total: TransmissionBreakdown = {
        informativos: 0,
        boletines: 0,
        publicidad: 0,
        educativos: 0,
        orientacion: 0,
        cienciaTecnica: 0,
        variados: 0,
        historicosGrabado: 0,
        variadoInfantilGrabado: 0,
        dramatizados: 0,
        literaturaArte: 0,
        musicales: 0,
        deportivos: 0,
        reposiciones: 0,
        total: 0
    };

    for (let d = 1; d <= daysInMonth; d++) {
        const current = new Date(year, month, d);
        const dayType = getDayType(current);
        const minutes = config[dayType] || DEFAULT_DAY_MINUTES[dayType];

        Object.keys(total).forEach((key) => {
            const k = key as keyof TransmissionBreakdown;
            total[k] += Number(minutes[k]) || 0;
        });
    }

    return {
        hours: parseFloat((total.total / 60).toFixed(2)) || 0,
        breakdown: total
    };
};

/**
 * Calculates the totals for the main program groups as requested by the user.
 * Groups: INFORMACIÓN, ORIENTACIÓN, CULTURA, MÚSICA, DEPORTES, REPOSICIONES.
 * @param breakdown The transmission breakdown data.
 * @returns An object with the totals for each group.
 */
export const getGroupTotals = (breakdown: TransmissionBreakdown) => {
    return {
        INFORMACION: (Number(breakdown.informativos) || 0) + (Number(breakdown.boletines) || 0) + (Number(breakdown.publicidad) || 0),
        ORIENTACION: (Number(breakdown.orientacion) || 0) + (Number(breakdown.educativos) || 0) + (Number(breakdown.cienciaTecnica) || 0),
        CULTURA: (Number(breakdown.literaturaArte) || 0) + (Number(breakdown.dramatizados) || 0) + (Number(breakdown.historicosGrabado) || 0) + (Number(breakdown.variadoInfantilGrabado) || 0) + (Number(breakdown.variados) || 0),
        MUSICA: Number(breakdown.musicales) || 0,
        DEPORTES: Number(breakdown.deportivos) || 0,
        REPOSICIONES: Number(breakdown.reposiciones) || 0
    };
};

/**
 * Validates if the sum of group totals equals 8 hours (480 minutes).
 * @param breakdown The transmission breakdown data.
 * @returns Boolean indicating if it sums to 480.
 */
export const validateEightHourRule = (breakdown: TransmissionBreakdown): boolean => {
    const groups = getGroupTotals(breakdown);
    const sum = Object.values(groups).reduce((acc, val) => acc + val, 0);
    return Math.abs(sum - 480) < 0.001;
};
