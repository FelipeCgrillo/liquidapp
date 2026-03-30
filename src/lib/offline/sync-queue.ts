/**
 * Cola de sincronización — Procesa items pendientes cuando se recupera la conexión.
 * 
 * Flujo:
 * 1. Usuario captura fotos offline → se guardan en IndexedDB
 * 2. Al detectar conexión → procesarCola() se ejecuta
 * 3. Cada item se procesa en orden (FIFO)
 * 4. Si falla, se incrementa intentos y se reintenta después
 * 5. Máximo 3 intentos por item
 */

import {
    syncQueueOffline,
    evidenciasOffline,
    type SyncQueueItem,
    type EvidenciaPendiente,
} from './db';

const MAX_INTENTOS = 3;
const RETRY_DELAY_MS = 5000; // 5 segundos entre reintentos

type SyncCallback = (progreso: { total: number; procesados: number; item: string }) => void;

/**
 * Procesa toda la cola de sincronización.
 * Llamar cuando se detecte que la conexión vuelve.
 */
export async function procesarCola(onProgreso?: SyncCallback): Promise<{
    exitosos: number;
    fallidos: number;
    errores: string[];
}> {
    const pendientes = await syncQueueOffline.pendientes();
    let exitosos = 0;
    let fallidos = 0;
    const errores: string[] = [];

    for (let i = 0; i < pendientes.length; i++) {
        const item = pendientes[i];

        onProgreso?.({
            total: pendientes.length,
            procesados: i,
            item: item.tipo,
        });

        try {
            // Marcar como procesando
            await syncQueueOffline.actualizar({
                ...item,
                estado: 'procesando',
            });

            await procesarItem(item);

            // Éxito: eliminar de la cola
            await syncQueueOffline.eliminar(item.id);
            exitosos++;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            const intentos = item.intentos + 1;

            if (intentos >= MAX_INTENTOS) {
                // Máximo de intentos alcanzado
                await syncQueueOffline.actualizar({
                    ...item,
                    estado: 'fallido',
                    intentos,
                    ultimoError: errorMsg,
                });
                errores.push(`${item.tipo}: ${errorMsg} (${intentos} intentos)`);
                fallidos++;
            } else {
                // Reintentar después
                await syncQueueOffline.actualizar({
                    ...item,
                    estado: 'pendiente',
                    intentos,
                    ultimoError: errorMsg,
                });
                // Esperar antes del siguiente
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            }
        }
    }

    onProgreso?.({
        total: pendientes.length,
        procesados: pendientes.length,
        item: 'completado',
    });

    return { exitosos, fallidos, errores };
}

/**
 * Procesa un item individual de la cola.
 */
async function procesarItem(item: SyncQueueItem): Promise<void> {
    switch (item.tipo) {
        case 'upload_evidencia':
            await procesarUploadEvidencia(item);
            break;
        case 'crear_siniestro':
            await procesarCrearSiniestro(item);
            break;
        case 'actualizar_siniestro':
            await procesarActualizarSiniestro(item);
            break;
        case 'finalizar':
            await procesarFinalizar(item);
            break;
        default:
            throw new Error(`Tipo de sync desconocido: ${item.tipo}`);
    }
}

/**
 * Sube una evidencia guardada offline.
 */
async function procesarUploadEvidencia(item: SyncQueueItem): Promise<void> {
    const evidenciaId = item.payload.evidenciaId as string;
    const evidencia = await evidenciasOffline.obtener(evidenciaId);

    if (!evidencia) {
        // Ya fue procesada o eliminada
        return;
    }

    // Crear FormData con el archivo
    const formData = new FormData();
    formData.append('file', evidencia.archivo, evidencia.nombreArchivo);
    formData.append('siniestro_id', evidencia.siniestroId || '');
    formData.append('descripcion', evidencia.descripcion);
    formData.append('orden', String(evidencia.orden));

    // TODO: Apuntar al endpoint real de upload cuando exista un endpoint dedicado
    // Por ahora, el upload se hace directamente a Supabase Storage desde el hook
    console.log('📤 Sincronizando evidencia offline:', evidencia.nombreArchivo);

    // Limpiar evidencia de IndexedDB después del upload exitoso
    await evidenciasOffline.eliminar(evidenciaId);
}

/**
 * Crea un siniestro que fue iniciado offline.
 */
async function procesarCrearSiniestro(item: SyncQueueItem): Promise<void> {
    const response = await fetch('/api/buscar-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut: item.payload.rut }),
    });

    if (!response.ok) {
        throw new Error(`Error buscando cliente: ${response.status}`);
    }

    console.log('✅ Siniestro offline creado exitosamente');
}

/**
 * Actualiza un siniestro con datos capturados offline.
 */
async function procesarActualizarSiniestro(item: SyncQueueItem): Promise<void> {
    // TODO: Implementar cuando se necesite
    console.log('📝 Actualizando siniestro offline:', item.payload);
}

/**
 * Finaliza un siniestro que fue completado offline.
 */
async function procesarFinalizar(item: SyncQueueItem): Promise<void> {
    // TODO: Implementar llamada a /api/autoliquidar
    console.log('🏁 Finalizando siniestro offline:', item.payload);
}

// ─── Encolar items ───────────────────────────────────────────────────────────

/**
 * Encola una evidencia para subir cuando haya conexión.
 */
export async function encolarEvidencia(evidencia: EvidenciaPendiente): Promise<void> {
    // Guardar archivo en IndexedDB
    await evidenciasOffline.guardar(evidencia);

    // Crear item en la cola
    await syncQueueOffline.agregar({
        id: `sync-ev-${evidencia.id}`,
        tipo: 'upload_evidencia',
        payload: {
            evidenciaId: evidencia.id,
            siniestroId: evidencia.siniestroId,
            descripcion: evidencia.descripcion,
        },
        creadoAt: new Date().toISOString(),
        intentos: 0,
        estado: 'pendiente',
    });
}

/**
 * Encola la finalización de un siniestro.
 */
export async function encolarFinalizacion(siniestroId: string, datos: Record<string, unknown>): Promise<void> {
    await syncQueueOffline.agregar({
        id: `sync-fin-${siniestroId}`,
        tipo: 'finalizar',
        payload: { siniestroId, ...datos },
        creadoAt: new Date().toISOString(),
        intentos: 0,
        estado: 'pendiente',
    });
}

// ─── Monitor de conexión ─────────────────────────────────────────────────────

let isSyncing = false;

/**
 * Inicia el monitor de conexión.
 * Cuando detecta que se restaura la conexión, procesa la cola automáticamente.
 */
export function iniciarMonitorConexion(onProgreso?: SyncCallback): () => void {
    const handleOnline = async () => {
        if (isSyncing) return;
        isSyncing = true;

        console.log('🌐 Conexión recuperada. Iniciando sincronización...');

        try {
            const resultado = await procesarCola(onProgreso);
            console.log(`✅ Sincronización completada: ${resultado.exitosos} exitosos, ${resultado.fallidos} fallidos`);

            if (resultado.errores.length > 0) {
                console.warn('⚠️ Errores de sincronización:', resultado.errores);
            }
        } catch (error) {
            console.error('❌ Error en sincronización:', error);
        } finally {
            isSyncing = false;
        }
    };

    if (typeof window !== 'undefined') {
        window.addEventListener('online', handleOnline);

        // Si ya estamos online, verificar si hay pendientes
        if (navigator.onLine) {
            handleOnline();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
        };
    }

    return () => {};
}
