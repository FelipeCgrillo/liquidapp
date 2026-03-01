'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { EvidenciaConAnalisis, Siniestro } from '@/types';
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

    // Crea el siniestro usando los datos reales del cliente/vehículo identificado
    const crearSiniestro = React.useCallback(async () => {
        if (siniestroId) return siniestroId; // Ya existe
        if (error) return null; // No reintentar si ya falló

        setIsLoading(true);
        setError(null);
        const supabase = createClient();

        try {
            // Usar datos reales si existen, fallback a placeholder si se llama sin identificación
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
                    tipo_siniestro: 'choque'
                }
                : {
                    // Fallback sin identificación (no debería ocurrir en flujo normal)
                    estado: 'borrador' as const,
                    fecha_siniestro: new Date().toISOString(),
                    direccion: 'Ubicación pendiente',
                    patente: 'PENDIENTE',
                    marca: 'Desconocido',
                    modelo: 'Desconocido',
                    anio: new Date().getFullYear(),
                    nombre_asegurado: 'Usuario App',
                    tipo_siniestro: 'choque'
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
            toast.error('Error al iniciar el reporte. Verifique su conexión.');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [siniestroId, error, clienteData, vehiculoSeleccionado]);

    // Identificar cliente: guarda datos y crea el siniestro inmediatamente
    const identificarCliente = React.useCallback(async (
        cliente: ClienteAsegurado,
        vehiculo: VehiculoAsegurado
    ) => {
        setClienteData(cliente);
        setVehiculoSeleccionado(vehiculo);
        // El siniestro se crea después de que el estado se actualice,
        // lo que hace crearSiniestro en el siguiente render cuando pasen
        // los datos al contexto. La creación la dispara useEffect abajo.
    }, []);

    // Crear siniestro cuando se hayan identificado cliente Y vehículo
    useEffect(() => {
        if (clienteData && vehiculoSeleccionado && !siniestroId && !isLoading && !error) {
            crearSiniestro();
        }
    }, [clienteData, vehiculoSeleccionado, siniestroId, isLoading, error, crearSiniestro]);

    // Suscripción Realtime a cambios en análisis
    useEffect(() => {
        if (!siniestroId) return;

        const supabase = createClient();
        const channel = supabase
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
                    toast.success('Análisis completado');
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [siniestroId]);

    const { uploadAndAnalyze } = useEvidenceUpload();

    const agregarEvidencia = React.useCallback(async (file: File, tipo: string) => {
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
                    // No forzar analizando: true aquí — respetar el valor que retornó uploadAndAnalyze.
                    // En modo síncrono (queueAnalysis=false), el análisis ya completó y analizando=false.
                    // En modo queue (queueAnalysis=true), analizando=true hasta que llegue el resultado Realtime.
                } : ev
            ));

        } catch (error) {
            console.error('Error procesando evidencia:', error);
            toast.error('Error al procesar la imagen');
            setEvidencias(prev => prev.filter(ev => ev.id !== tempId));
        }
    }, [siniestroId, evidencias.length, crearSiniestro, uploadAndAnalyze]);

    const eliminarEvidencia = React.useCallback(async (id: string) => {
        setEvidencias(prev => prev.filter(ev => ev.id !== id));
    }, []);

    const finalizarSiniestro = React.useCallback(async () => {
        if (!siniestroId) return false;
        setIsLoading(true);
        const supabase = createClient();
        try {
            const { error } = await supabase
                .from('siniestros')
                .update({
                    estado: 'en_revision',
                    enviado_revision_at: new Date().toISOString()
                })
                .eq('id', siniestroId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error finalizando siniestro:', error);
            toast.error('Error al enviar el reporte');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [siniestroId]);

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
