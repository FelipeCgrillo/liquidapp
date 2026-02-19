'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { EvidenciaConAnalisis, Siniestro } from '@/types';
import toast from 'react-hot-toast';
import { useEvidenceUpload } from '@/hooks/useEvidenceUpload';

interface ClaimContextType {
    siniestroId: string | null;
    evidencias: EvidenciaConAnalisis[];
    setEvidencias: React.Dispatch<React.SetStateAction<EvidenciaConAnalisis[]>>;
    agregarEvidencia: (file: File, tipo: string) => Promise<void>;
    eliminarEvidencia: (id: string) => void;
    crearSiniestro: () => Promise<string | null>;
    finalizarSiniestro: () => Promise<boolean>;
    actualizarUbicacion: (lat: number, lng: number) => Promise<void>;
    isLoading: boolean;
    pasoActual: number;
    setPasoActual: React.Dispatch<React.SetStateAction<number>>;
}

const ClaimContext = createContext<ClaimContextType | undefined>(undefined);

export function ClaimProvider({ children }: { children: React.ReactNode }) {
    const [siniestroId, setSiniestroId] = useState<string | null>(null);
    const [evidencias, setEvidencias] = useState<EvidenciaConAnalisis[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [pasoActual, setPasoActual] = useState(0);

    // Inicializar siniestro si no existe
    const crearSiniestro = React.useCallback(async () => {
        if (siniestroId) return siniestroId; // Ya existe

        setIsLoading(true);
        const supabase = createClient();

        try {
            // Crear un siniestro temporal/borrador
            const { data, error } = await supabase
                .from('siniestros')
                .insert({
                    estado: 'borrador',
                    fecha_siniestro: new Date().toISOString(),
                    direccion: 'Ubicación pendiente',
                    patente: 'PENDIENTE',
                    marca: 'Desconocido',
                    modelo: 'Desconocido',
                    anio: new Date().getFullYear(),
                    nombre_asegurado: 'Usuario App',
                    tipo_siniestro: 'choque'
                })
                .select('id')
                .single();

            if (error) throw error;

            setSiniestroId(data.id);
            return data.id;
        } catch (error) {
            console.error('Error creando siniestro:', error);
            toast.error('Error al iniciar el reporte');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [siniestroId]);

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
                    // Cuando llega un nuevo análisis, actualizar la evidencia correspondiente
                    const nuevoAnalisis = payload.new;
                    setEvidencias(prev => prev.map(ev => {
                        if (ev.id === nuevoAnalisis.evidencia_id) {
                            return {
                                ...ev,
                                analizando: false,
                                analizado: true,
                                analisis: nuevoAnalisis as any // Cast necesario por tipos generados/dinámicos
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

        // 1. Estado optimista
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
            // 2. Usar hook centralizado para subir y analizar (ENCOLADO / ASYNC)
            // Pasamos queueAnalysis: true para evitar bloqueo de UI
            const evidenciaSubida = await uploadAndAnalyze(file, {
                siniestroId: currentSiniestroId!,
                description: tipo,
                order: evidencias.length
            }, true);

            // 3. Actualizar estado con la evidencia persistida (aún analizando)
            setEvidencias(prev => prev.map(ev =>
                ev.id === tempId ? {
                    ...evidenciaSubida,
                    previewUrl, // Mantener previewUrl local
                    analizando: true // Asegurar que sigue analizando
                } : ev
            ));

            // No hacemos toast de éxito aquí, esperamos al Realtime o ignoramos si es background
            // toast.success('Evidencia subida, analizando...');

        } catch (error) {
            console.error('Error procesando evidencia:', error);
            toast.error('Error al procesar la imagen');
            // Revertir estado
            setEvidencias(prev => prev.filter(ev => ev.id !== tempId));
        }
    }, [siniestroId, evidencias.length, crearSiniestro, uploadAndAnalyze]);

    const eliminarEvidencia = React.useCallback(async (id: string) => {
        setEvidencias(prev => prev.filter(ev => ev.id !== id));
        // TODO: Eliminar de BD y Storage si no es temp
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
                    direccion: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}` // Simple reverse geocoding fallback
                })
                .eq('id', currentSiniestroId);

            if (error) throw error;
        } catch (error) {
            console.error('Error actualizando ubicación:', error);
            // No bloqueamos el flujo, solo logueamos
        }
    }, [siniestroId, crearSiniestro]);

    return (
        <ClaimContext.Provider value={{
            siniestroId,
            evidencias,
            setEvidencias,
            agregarEvidencia,
            eliminarEvidencia,
            crearSiniestro,
            finalizarSiniestro,
            actualizarUbicacion,
            isLoading,
            pasoActual,
            setPasoActual
        }}>
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
