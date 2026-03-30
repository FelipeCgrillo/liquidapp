'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { EvidenciaConAnalisis, TipoEvento, TipoImpacto, DatosTercero } from '@/types';
import toast from 'react-hot-toast';
import { useEvidenceUpload } from '@/hooks/useEvidenceUpload';

// Tipos para el cliente identificado
interface VehiculoAsegurado {
    id: string;
    patente: string;
    marca: string;
    modelo: string;
    anio: number | null;
    color: string | null;
}

interface ClienteAsegurado {
    id: string;
    nombre_completo: string;
    rut: string;
    telefono: string | null;
    email: string | null;
    poliza_numero: string | null;
    vehiculos: VehiculoAsegurado[];
}

interface ClaimContextType {
    siniestroId: string | null;
    evidencias: EvidenciaConAnalisis[];
    setEvidencias: React.Dispatch<React.SetStateAction<EvidenciaConAnalisis[]>>;
    agregarEvidencia: (file: File, tipo: string) => Promise<void>;
    eliminarEvidencia: (id: string) => void;
    crearSiniestro: () => Promise<string | null>;
    finalizarSiniestro: () => Promise<boolean>;
    actualizarUbicacion: (lat: number, lng: number) => Promise<void>;
    // Datos del cliente identificado
    clienteData: ClienteAsegurado | null;
    vehiculoSeleccionado: VehiculoAsegurado | null;
    identificarCliente: (cliente: ClienteAsegurado, vehiculo: VehiculoAsegurado) => Promise<void>;
    // Nuevos campos autoliquidador
    tipoEvento: TipoEvento | null;
    setTipoEvento: (tipo: TipoEvento) => void;
    tipoImpacto: TipoImpacto | null;
    setTipoImpacto: (tipo: TipoImpacto) => void;
    hayHeridos: boolean;
    setHayHeridos: (val: boolean) => void;
    hayTerceros: boolean;
    setHayTerceros: (val: boolean) => void;
    datosTercero: DatosTercero | null;
    setDatosTercero: (datos: DatosTercero) => void;
    relatoTexto: string;
    setRelatoTexto: (texto: string) => void;
    // UI state
    isLoading: boolean;
    error: string | null;
    pasoActual: number;
    setPasoActual: React.Dispatch<React.SetStateAction<number>>;
}

const ClaimContext = createContext<ClaimContextType | undefined>(undefined);

export function ClaimProvider({ children }: { children: React.ReactNode }) {
    const [siniestroId, setSiniestroId] = useState<string | null>(null);
    const [evidencias, setEvidencias] = useState<EvidenciaConAnalisis[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [pasoActual, setPasoActual] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Estado del cliente identificado
    const [clienteData, setClienteData] = useState<ClienteAsegurado | null>(null);
    const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<VehiculoAsegurado | null>(null);

    // Nuevos campos autoliquidador
    const [tipoEvento, setTipoEvento] = useState<TipoEvento | null>(null);
    const [tipoImpacto, setTipoImpacto] = useState<TipoImpacto | null>(null);
    const [hayHeridos, setHayHeridos] = useState(false);
    const [hayTerceros, setHayTerceros] = useState(false);
    const [datosTercero, setDatosTercero] = useState<DatosTercero | null>(null);
    const [relatoTexto, setRelatoTexto] = useState('');

    // Crea el siniestro usando los datos reales del cliente/vehículo identificado
    const crearSiniestro = React.useCallback(async () => {
        if (siniestroId) return siniestroId;
        if (error) return null;

        setIsLoading(true);
        setError(null);
        const supabase = createClient();

        try {
            const datosSiniestro = vehiculoSeleccionado && clienteData
                ? {
                    estado: 'borrador' as const,
                    fecha_siniestro: new Date().toISOString(),
                    direccion: 'Ubicación pendiente',
                    patente: vehiculoSeleccionado.patente,
                    marca: vehiculoSeleccionado.marca,
                    modelo: vehiculoSeleccionado.modelo,
                    anio: vehiculoSeleccionado.anio ?? new Date().getFullYear(),
                    color: vehiculoSeleccionado.color ?? undefined,
                    nombre_asegurado: clienteData.nombre_completo,
                    rut_asegurado: clienteData.rut,
                    telefono_asegurado: clienteData.telefono ?? undefined,
                    email_asegurado: clienteData.email ?? undefined,
                    poliza_numero: clienteData.poliza_numero ?? undefined,
                    // Usar tipo_evento del contexto en lugar de hardcoded 'choque'
                    tipo_siniestro: tipoEvento || 'choque',
                }
                : {
                    estado: 'borrador' as const,
                    fecha_siniestro: new Date().toISOString(),
                    direccion: 'Ubicación pendiente',
                    patente: 'PENDIENTE',
                    marca: 'Desconocido',
                    modelo: 'Desconocido',
                    anio: new Date().getFullYear(),
                    nombre_asegurado: 'Usuario App',
                    tipo_siniestro: tipoEvento || 'choque',
                };

            const { data, error: supabaseError } = await supabase
                .from('siniestros')
                .insert(datosSiniestro)
                .select('id')
                .single();

            if (supabaseError) throw supabaseError;

            if (data) {
                setSiniestroId(data.id);
                return data.id;
            }
            throw new Error('No se recibió ID del siniestro');
        } catch (e) {
            console.error('❌ Error creando siniestro:', e);
            const errorMessage = e instanceof Error
                ? e.message
                : (e && typeof e === 'object' && 'message' in e)
                    ? String((e as { message: unknown }).message)
                    : 'Error desconocido';
            setError(errorMessage);
            toast.error('Error al iniciar tu reporte. Verifica tu conexión.');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [siniestroId, error, clienteData, vehiculoSeleccionado, tipoEvento]);

    // Identificar cliente: guarda datos y crea el siniestro inmediatamente
    const identificarCliente = React.useCallback(async (
        cliente: ClienteAsegurado,
        vehiculo: VehiculoAsegurado
    ) => {
        setClienteData(cliente);
        setVehiculoSeleccionado(vehiculo);
    }, []);

    // Crear siniestro cuando se hayan identificado cliente Y vehículo
    useEffect(() => {
        if (clienteData && vehiculoSeleccionado && !siniestroId && !isLoading && !error) {
            crearSiniestro();
        }
    }, [clienteData, vehiculoSeleccionado, siniestroId, isLoading, error, crearSiniestro]);

    // Suscripción Realtime a cambios en análisis
    // Degradación graceful: si WebSocket no está disponible (ej: navegadores móviles
    // con restricciones de seguridad), la app sigue funcionando sin Realtime.
    useEffect(() => {
        if (!siniestroId) return;

        let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null;

        try {
            const supabase = createClient();
            channel = supabase
                .channel('analisis-changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'analisis_ia',
                        filter: `siniestro_id=eq.${siniestroId}`
                    },
                    (payload) => {
                        const nuevoAnalisis = payload.new;
                        setEvidencias(prev => prev.map(ev => {
                            if (ev.id === nuevoAnalisis.evidencia_id) {
                                return {
                                    ...ev,
                                    analizando: false,
                                    analizado: true,
                                    analisis: nuevoAnalisis as never
                                };
                            }
                            return ev;
                        }));
                        toast.success('Foto procesada correctamente');
                    }
                )
                .subscribe((status) => {
                    if (status === 'CHANNEL_ERROR') {
                        console.warn('Realtime no disponible, la app funciona sin actualizaciones en tiempo real.');
                    }
                });
        } catch (err) {
            // WebSocket no disponible (ej: "The operation is insecure" en móviles)
            console.warn('Realtime deshabilitado:', err instanceof Error ? err.message : err);
        }

        return () => {
            try {
                channel?.unsubscribe();
            } catch {
                // Ignorar errores de cleanup
            }
        };
    }, [siniestroId]);

    const { uploadAndAnalyze } = useEvidenceUpload();

    const agregarEvidencia = React.useCallback(async (file: File, tipo: string) => {
        const MAX_EVIDENCIAS = 20;
        if (evidencias.length >= MAX_EVIDENCIAS) {
            toast.error('Se alcanzó el límite máximo de fotos (20).');
            return;
        }
        let currentSiniestroId = siniestroId;
        if (!currentSiniestroId) {
            currentSiniestroId = await crearSiniestro();
            if (!currentSiniestroId) return;
        }

        const tempId = `temp-${Date.now()}`;
        const previewUrl = URL.createObjectURL(file);

        const nuevaEvidencia: EvidenciaConAnalisis = {
            id: tempId,
            siniestro_id: currentSiniestroId!,
            storage_path: '',
            orden: evidencias.length,
            analizado: false,
            analizando: true,
            capturado_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            previewUrl,
            descripcion: tipo
        };

        setEvidencias(prev => [...prev, nuevaEvidencia]);

        try {
            const evidenciaSubida = await uploadAndAnalyze(file, {
                siniestroId: currentSiniestroId!,
                description: tipo,
                order: evidencias.length
            }, false);

            setEvidencias(prev => prev.map(ev =>
                ev.id === tempId ? {
                    ...evidenciaSubida,
                    previewUrl,
                } : ev
            ));

        } catch (error) {
            console.error('Error procesando foto:', error);
            toast.error('Error al procesar la foto');
            setEvidencias(prev => prev.filter(ev => ev.id !== tempId));
        }
    }, [siniestroId, evidencias.length, crearSiniestro, uploadAndAnalyze]);

    const eliminarEvidencia = React.useCallback(async (id: string) => {
        setEvidencias(prev => {
            const ev = prev.find(e => e.id === id);
            if (ev?.previewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(ev.previewUrl);
            }
            return prev.filter(e => e.id !== id);
        });
    }, []);

    const finalizarSiniestro = React.useCallback(async () => {
        if (!siniestroId) return false;
        setIsLoading(true);
        const supabase = createClient();
        try {
            // Guardar datos adicionales del autoliquidador al finalizar
            const updateData: Record<string, unknown> = {
                estado: 'en_revision',
                enviado_revision_at: new Date().toISOString(),
            };

            // Agregar campos nuevos si existen
            if (tipoEvento) updateData.tipo_evento = tipoEvento;
            if (tipoImpacto) updateData.tipo_impacto = tipoImpacto;
            if (hayHeridos !== undefined) updateData.hay_heridos = hayHeridos;
            if (hayTerceros !== undefined) updateData.hay_terceros = hayTerceros;
            if (relatoTexto) updateData.relato_texto = relatoTexto;

            // Datos del tercero
            if (datosTercero) {
                updateData.tercero_nombre = datosTercero.nombre;
                updateData.tercero_patente = datosTercero.patente;
                updateData.tercero_aseguradora = datosTercero.aseguradora;
                updateData.tercero_telefono = datosTercero.telefono;
            }

            const { error } = await supabase
                .from('siniestros')
                .update(updateData)
                .eq('id', siniestroId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error finalizando siniestro:', error);
            toast.error('Error al enviar tu reporte');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [siniestroId, tipoEvento, tipoImpacto, hayHeridos, hayTerceros, relatoTexto, datosTercero]);

    const actualizarUbicacion = React.useCallback(async (lat: number, lng: number) => {
        let currentSiniestroId = siniestroId;
        if (!currentSiniestroId) {
            currentSiniestroId = await crearSiniestro();
            if (!currentSiniestroId) return;
        }

        const supabase = createClient();
        try {
            const { error } = await supabase
                .from('siniestros')
                .update({
                    latitud: lat,
                    longitud: lng,
                    direccion: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`
                })
                .eq('id', currentSiniestroId);

            if (error) throw error;
        } catch (error) {
            console.error('Error actualizando ubicación:', error);
        }
    }, [siniestroId, crearSiniestro]);

    const value = React.useMemo(() => ({
        siniestroId,
        evidencias,
        setEvidencias,
        agregarEvidencia,
        eliminarEvidencia,
        crearSiniestro,
        finalizarSiniestro,
        actualizarUbicacion,
        clienteData,
        vehiculoSeleccionado,
        identificarCliente,
        // Nuevos campos
        tipoEvento,
        setTipoEvento,
        tipoImpacto,
        setTipoImpacto,
        hayHeridos,
        setHayHeridos,
        hayTerceros,
        setHayTerceros,
        datosTercero,
        setDatosTercero,
        relatoTexto,
        setRelatoTexto,
        // UI state
        isLoading,
        error,
        pasoActual,
        setPasoActual
    }), [
        siniestroId,
        evidencias,
        isLoading,
        error,
        pasoActual,
        clienteData,
        vehiculoSeleccionado,
        tipoEvento,
        tipoImpacto,
        hayHeridos,
        hayTerceros,
        datosTercero,
        relatoTexto,
        agregarEvidencia,
        eliminarEvidencia,
        crearSiniestro,
        finalizarSiniestro,
        actualizarUbicacion,
        identificarCliente
    ]);

    return (
        <ClaimContext.Provider value={value}>
            {children}
        </ClaimContext.Provider>
    );
}

export const useClaim = () => {
    const context = useContext(ClaimContext);
    if (context === undefined) {
        throw new Error('useClaim must be used within a ClaimProvider');
    }
    return context;
};
