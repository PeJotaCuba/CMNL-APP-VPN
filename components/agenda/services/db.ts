export interface GeneratedAgenda {
    id: string;
    filename: string;
    blob: Blob;
    createdAt: string; // ISO date
    month: string;
    weekLabel: string;
}

const DB_NAME = 'RCM_Agenda_DB';
const STORE_NAME = 'generated_agendas';
const DB_VERSION = 1;

export const openAgendaDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject("IndexedDB no es soportado en este navegador.");
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

export const saveAgendaPdf = async (agenda: GeneratedAgenda): Promise<void> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openAgendaDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(agenda);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            tx.oncomplete = () => db?.close();
            tx.onabort = () => db?.close();
        });
    } catch (error) {
        db?.close();
        console.error("Error guardando agenda pdf:", error);
        throw error;
    }
};

export const loadAgendaPdfs = async (): Promise<GeneratedAgenda[]> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openAgendaDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => {
                db?.close();
                let results = request.result || [];
                results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                resolve(results);
            };
            request.onerror = () => {
                db?.close();
                reject(request.error);
            };
        });
    } catch (error) {
        db?.close();
        console.error("Error cargando agendas de DB:", error);
        return [];
    }
};

export const deleteAgendaPdf = async (id: string): Promise<void> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openAgendaDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
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

export const deleteAllAgendaPdfs = async (): Promise<void> => {
    let db: IDBDatabase | null = null;
    try {
        db = await openAgendaDB();
        return new Promise((resolve, reject) => {
            const tx = db!.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.clear();
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
