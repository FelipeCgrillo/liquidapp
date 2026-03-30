/**
 * Wrapper para IndexedDB — Almacenamiento offline de LiquidApp
 * 
 * Almacena:
 * - Evidencias pendientes de subir (fotos + metadata)
 * - Estado parcial del wizard
 * - Cola de sincronización
 * 
 * Usa la librería nativa de IndexedDB con wrapper simple (sin dependencia externa).
 */

const DB_NAME = 'liquidapp-offline';
const DB_VERSION = 1;

// Stores
const STORES = {
    evidenciasPendientes: 'evidencias_pendientes',
    wizardState: 'wizard_state',
    syncQueue: 'sync_queue',
} as const;

export interface EvidenciaPendiente {
    id: string; // temp ID
    siniestroId: string | null;
    archivo: Blob;
    nombreArchivo: string;
    tipoMime: string;
    descripcion: string;
    orden: number;
    capturadoAt: string;
    latitud?: number;
    longitud?: number;
    intentos: number;
    ultimoIntento?: string;
}

export interface SyncQueueItem {
    id: string;
    tipo: 'upload_evidencia' | 'crear_siniestro' | 'actualizar_siniestro' | 'finalizar';
    payload: Record<string, unknown>;
    creadoAt: string;
    intentos: number;
    ultimoError?: string;
    estado: 'pendiente' | 'procesando' | 'fallido';
}

export interface WizardStateOffline {
    id: string; // Siempre 'current'
    tipoEvento?: string;
    tipoImpacto?: string;
    hayHeridos?: boolean;
    hayTerceros?: boolean;
    relatoTexto?: string;
    datosTercero?: Record<string, unknown>;
    clienteRut?: string;
    vehiculoPatente?: string;
    latitud?: number;
    longitud?: number;
    pasoActual: number;
    updatedAt: string;
}

// ─── Abrir DB ────────────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB no disponible'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains(STORES.evidenciasPendientes)) {
                db.createObjectStore(STORES.evidenciasPendientes, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.wizardState)) {
                db.createObjectStore(STORES.wizardState, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.syncQueue)) {
                const store = db.createObjectStore(STORES.syncQueue, { keyPath: 'id' });
                store.createIndex('estado', 'estado', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ─── Operaciones genéricas ───────────────────────────────────────────────────

async function dbPut<T>(storeName: string, value: T): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(value);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

async function dbGet<T>(storeName: string, key: string): Promise<T | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).get(key);
        request.onsuccess = () => { db.close(); resolve(request.result as T | undefined); };
        request.onerror = () => { db.close(); reject(request.error); };
    });
}

async function dbGetAll<T>(storeName: string): Promise<T[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const request = tx.objectStore(storeName).getAll();
        request.onsuccess = () => { db.close(); resolve(request.result as T[]); };
        request.onerror = () => { db.close(); reject(request.error); };
    });
}

async function dbDelete(storeName: string, key: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(key);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

async function dbClear(storeName: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

// ─── API de Evidencias Pendientes ────────────────────────────────────────────

export const evidenciasOffline = {
    guardar: (evidencia: EvidenciaPendiente) => dbPut(STORES.evidenciasPendientes, evidencia),
    obtener: (id: string) => dbGet<EvidenciaPendiente>(STORES.evidenciasPendientes, id),
    listar: () => dbGetAll<EvidenciaPendiente>(STORES.evidenciasPendientes),
    eliminar: (id: string) => dbDelete(STORES.evidenciasPendientes, id),
    limpiar: () => dbClear(STORES.evidenciasPendientes),
};

// ─── API de Wizard State ─────────────────────────────────────────────────────

export const wizardOffline = {
    guardar: (state: WizardStateOffline) => dbPut(STORES.wizardState, { ...state, id: 'current' }),
    obtener: () => dbGet<WizardStateOffline>(STORES.wizardState, 'current'),
    limpiar: () => dbClear(STORES.wizardState),
};

// ─── API de Sync Queue ───────────────────────────────────────────────────────

export const syncQueueOffline = {
    agregar: (item: SyncQueueItem) => dbPut(STORES.syncQueue, item),
    listar: () => dbGetAll<SyncQueueItem>(STORES.syncQueue),
    obtener: (id: string) => dbGet<SyncQueueItem>(STORES.syncQueue, id),
    eliminar: (id: string) => dbDelete(STORES.syncQueue, id),
    actualizar: (item: SyncQueueItem) => dbPut(STORES.syncQueue, item),
    limpiar: () => dbClear(STORES.syncQueue),
    
    /** Obtiene items pendientes ordenados por fecha */
    pendientes: async (): Promise<SyncQueueItem[]> => {
        const all = await dbGetAll<SyncQueueItem>(STORES.syncQueue);
        return all
            .filter(item => item.estado === 'pendiente' || item.estado === 'fallido')
            .sort((a, b) => new Date(a.creadoAt).getTime() - new Date(b.creadoAt).getTime());
    },
};

// ─── Utilidades ──────────────────────────────────────────────────────────────

/** Verifica si IndexedDB está disponible */
export function isIndexedDBAvailable(): boolean {
    try {
        return typeof indexedDB !== 'undefined';
    } catch {
        return false;
    }
}

/** Verifica si hay items pendientes de sincronizar */
export async function tienePendientes(): Promise<boolean> {
    try {
        const evidencias = await evidenciasOffline.listar();
        const queue = await syncQueueOffline.pendientes();
        return evidencias.length > 0 || queue.length > 0;
    } catch {
        return false;
    }
}
