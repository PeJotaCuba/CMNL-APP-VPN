import { Track, Report, Production } from '../types';

const getDBName = () => {
    const username = localStorage.getItem('rcm_user_username') || 'default';
    return `RCM_Music_DB_${username}`;
};
const TRACKS_STORE = 'tracks';
const REPORTS_STORE = 'reports';
const PRODUCTIONS_STORE = 'productions';
const SELECTIONS_STORE = 'selections';
const SAVED_SELECTIONS_STORE = 'saved_selections_groups';
const DB_VERSION = 6; // Incremented version

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject("IndexedDB no es soportado en este navegador.");
            return;
        }
        const request = indexedDB.open(getDBName(), DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onblocked = () => {
            console.warn("Database upgrade blocked. Please close other tabs or reload.");
            reject("Database blocked");
        };
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            
            if (!db.objectStoreNames.contains(TRACKS_STORE)) {
                db.createObjectStore(TRACKS_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(REPORTS_STORE)) {
                db.createObjectStore(REPORTS_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(PRODUCTIONS_STORE)) {
                db.createObjectStore(PRODUCTIONS_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(SELECTIONS_STORE)) {
                db.createObjectStore(SELECTIONS_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(SAVED_SELECTIONS_STORE)) {
                db.createObjectStore(SAVED_SELECTIONS_STORE, { keyPath: 'id' });
            }
        };
    });
};

// ... (existing operations)

// --- SAVED SELECTIONS GROUPS OPERATIONS ---

export const saveSavedSelectionsListToDB = async (selections: any[]): Promise<void> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(SAVED_SELECTIONS_STORE, 'readwrite');
            const store = tx.objectStore(SAVED_SELECTIONS_STORE);
            
            const clearReq = store.clear();
            
            clearReq.onsuccess = () => {
                selections.forEach(sel => store.put(sel));
            };

            tx.oncomplete = () => {
                db?.close();
                resolve();
            };
            tx.onerror = () => {
                db?.close();
                reject(tx.error);
            };
        });
    } catch (error) {
        db?.close();
        console.error("Error guardando grupos de selecciones en DB:", error);
        throw error;
    }
};

export const loadSavedSelectionsListFromDB = async (): Promise<any[]> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(SAVED_SELECTIONS_STORE, 'readonly');
            const store = tx.objectStore(SAVED_SELECTIONS_STORE);
            const request = store.getAll();
            
            request.onsuccess = () => {
                db?.close();
                resolve(request.result || []);
            };
            request.onerror = () => {
                db?.close();
                reject(request.error);
            };
        });
    } catch (error) {
        db?.close();
        console.error("Error cargando grupos de selecciones de DB:", error);
        return [];
    }
};

// --- SELECTIONS OPERATIONS ---

export const saveSelectionsToDB = async (selections: Track[]): Promise<void> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(SELECTIONS_STORE, 'readwrite');
            const store = tx.objectStore(SELECTIONS_STORE);
            
            const clearReq = store.clear();
            
            clearReq.onsuccess = () => {
                selections.forEach(track => store.put(track));
            };

            tx.oncomplete = () => {
                db?.close();
                resolve();
            };
            tx.onerror = () => {
                db?.close();
                reject(tx.error);
            };
        });
    } catch (error) {
        db?.close();
        console.error("Error guardando selecciones en DB:", error);
        throw error;
    }
};

export const loadSelectionsFromDB = async (): Promise<Track[]> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(SELECTIONS_STORE, 'readonly');
            const store = tx.objectStore(SELECTIONS_STORE);
            const request = store.getAll();
            
            request.onsuccess = () => {
                db?.close();
                resolve(request.result || []);
            };
            request.onerror = () => {
                db?.close();
                reject(request.error);
            };
        });
    } catch (error) {
        db?.close();
        console.error("Error cargando selecciones de DB:", error);
        return [];
    }
};


// --- TRACKS OPERATIONS ---

export const saveTracksToDB = async (tracks: Track[]): Promise<void> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(TRACKS_STORE, 'readwrite');
            const store = tx.objectStore(TRACKS_STORE);
            
            const clearReq = store.clear();
            
            clearReq.onsuccess = () => {
                if (tracks.length === 0) {
                    resolve();
                    return;
                }
                tracks.forEach(track => store.put(track));
            };

            tx.oncomplete = () => {
                db?.close();
                resolve();
            };
            tx.onerror = () => {
                db?.close();
                reject(tx.error);
            };
        });
    } catch (error) {
        db?.close();
        console.error("Error guardando en DB:", error);
        throw error;
    }
};

export const loadTracksFromDB = async (): Promise<Track[]> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(TRACKS_STORE, 'readonly');
            const store = tx.objectStore(TRACKS_STORE);
            const request = store.getAll();
            
            request.onsuccess = () => {
                db?.close();
                resolve(request.result || []);
            };
            request.onerror = () => {
                db?.close();
                reject(request.error);
            };
        });
    } catch (error) {
        db?.close();
        console.error("Error cargando DB:", error);
        return [];
    }
};

// --- REPORTS OPERATIONS ---

export const saveReportToDB = async (report: Report): Promise<void> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(REPORTS_STORE, 'readwrite');
            const store = tx.objectStore(REPORTS_STORE);
            const request = store.put(report);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            tx.oncomplete = () => db?.close();
            tx.onabort = () => db?.close();
        });
    } catch (error) {
        db?.close();
        console.error("Error guardando reporte:", error);
    }
};

export const updateReportStatus = async (id: string, statusPartial: { downloaded?: boolean; sent?: boolean }): Promise<void> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(REPORTS_STORE, 'readwrite');
            const store = tx.objectStore(REPORTS_STORE);
            const getReq = store.get(id);

            getReq.onsuccess = () => {
                const report = getReq.result as Report;
                if (report) {
                    report.status = { 
                        downloaded: statusPartial.downloaded ?? report.status?.downloaded ?? false,
                        sent: statusPartial.sent ?? report.status?.sent ?? false
                    };
                    store.put(report);
                }
                resolve();
            };
            getReq.onerror = () => reject();
            tx.oncomplete = () => db?.close();
            tx.onabort = () => db?.close();
        });
    } catch (e) { 
        db?.close();
        console.error(e); 
    }
};

export const loadReportsFromDB = async (usernameFilter?: string): Promise<Report[]> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(REPORTS_STORE, 'readonly');
            const store = tx.objectStore(REPORTS_STORE);
            const request = store.getAll();
            
            request.onsuccess = () => {
                let results = request.result || [];
                // Filter if username is provided
                if (usernameFilter) {
                    results = results.filter((r: Report) => r.generatedBy === usernameFilter);
                }
                // Sort by date desc
                results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                resolve(results);
            };
            request.onerror = () => reject(request.error);
            tx.oncomplete = () => db?.close();
        });
    } catch (error) {
        db?.close();
        return [];
    }
};

export const deleteReportFromDB = async (id: string): Promise<void> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(REPORTS_STORE, 'readwrite');
            const store = tx.objectStore(REPORTS_STORE);
            store.delete(id);
            tx.oncomplete = () => {
                db?.close();
                resolve();
            };
            tx.onerror = () => {
                db?.close();
                reject(tx.error);
            };
        });
    } catch (e) {
        db?.close();
        throw e;
    }
};

// --- PRODUCTIONS OPERATIONS ---

export const saveProductionToDB = async (production: Production): Promise<void> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(PRODUCTIONS_STORE, 'readwrite');
            const store = tx.objectStore(PRODUCTIONS_STORE);
            const request = store.put(production);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            tx.oncomplete = () => db?.close();
            tx.onabort = () => db?.close();
        });
    } catch (error) {
        db?.close();
        console.error("Error guardando producción:", error);
        throw error;
    }
};

export const bulkUpdateProductions = async (productions: Production[]): Promise<void> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(PRODUCTIONS_STORE, 'readwrite');
            const store = tx.objectStore(PRODUCTIONS_STORE);
            productions.forEach(p => store.put(p));
            tx.oncomplete = () => {
                db?.close();
                resolve();
            };
            tx.onerror = () => {
                db?.close();
                reject(tx.error);
            };
            tx.onabort = () => db?.close();
        });
    } catch (error) {
        db?.close();
        console.error("Error en actualización masiva de producciones:", error);
        throw error;
    }
};

export const loadProductionsFromDB = async (): Promise<Production[]> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(PRODUCTIONS_STORE, 'readonly');
            const store = tx.objectStore(PRODUCTIONS_STORE);
            const request = store.getAll();
            request.onsuccess = () => {
                db?.close();
                resolve(request.result || []);
            };
            request.onerror = () => {
                db?.close();
                reject(request.error);
            };
        });
    } catch (error) {
        db?.close();
        return [];
    }
};

export const deleteProductionFromDB = async (id: string): Promise<void> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(PRODUCTIONS_STORE, 'readwrite');
            const store = tx.objectStore(PRODUCTIONS_STORE);
            store.delete(id);
            tx.oncomplete = () => {
                db?.close();
                resolve();
            };
            tx.onerror = () => {
                db?.close();
                reject(tx.error);
            };
        });
    } catch (e) {
        db?.close();
        throw e;
    }
};

export const clearReportsDB = async (): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(REPORTS_STORE, 'readwrite');
            const store = tx.objectStore(REPORTS_STORE);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error limpiando reportes:", error);
    }
};

export const clearProductionsDB = async (): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PRODUCTIONS_STORE, 'readwrite');
            const store = tx.objectStore(PRODUCTIONS_STORE);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error limpiando producciones:", error);
    }
};

export const clearTracksDB = async (): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TRACKS_STORE, 'readwrite');
        const store = tx.objectStore(TRACKS_STORE);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};
