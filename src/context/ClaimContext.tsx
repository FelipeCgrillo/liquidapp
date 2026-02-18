'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { EvidenciaConAnalisis, Siniestro } from '@/types';
import toast from 'react-hot-toast';

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
    const crearSiniestro = async () => {
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
    };

    const agregarEvidencia = async (file: File, tipo: string) => {
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
            descripcion: tipo // Usamos descripción para guardar qué vista es (Frente, Trasera, etc)
        };

        setEvidencias(prev => [...prev, nuevaEvidencia]);

        try {
            const supabase = createClient();
            const extension = file.name.split('.').pop() || 'jpg';
            const nombreArchivo = `${currentSiniestroId}/${Date.now()}.${extension}`;

            // 2. Subir a Storage
            const { error: uploadError } = await supabase.storage
                .from('evidencias-siniestros')
                .upload(nombreArchivo, file, { contentType: file.type });

            if (uploadError) throw uploadError;

            // 3. Crear registro en BD
            const { data: dbData, error: dbError } = await supabase
                .from('evidencias')
                .insert({
                    siniestro_id: currentSiniestroId,
                    storage_path: nombreArchivo,
                    nombre_archivo: file.name,
                    tipo_mime: file.type,
                    tamaño_bytes: file.size,
                    descripcion: tipo,
                    orden: evidencias.length
                })
                .select()
                .single();

            if (dbError) throw dbError;

            // 4. Iniciar análisis IA
            // Obtener URL firmada para la IA
            const { data: urlData } = await supabase.storage
                .from('evidencias-siniestros')
                .createSignedUrl(nombreArchivo, 3600);

            const respuestaIA = await fetch('/api/analizar-evidencia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    evidencia_id: dbData.id,
                    imagen_url: urlData?.signedUrl,
                    siniestro_id: currentSiniestroId
                })
            });

            const resultadoIA = await respuestaIA.json();

            // 5. Actualizar estado con resultado real
            setEvidencias(prev => prev.map(ev =>
                ev.id === tempId ? {
                    ...dbData,
                    previewUrl,
                    analizando: false,
                    analizado: true,
                    analisis: resultadoIA.analisis
                } : ev
            ));

            toast.success('Evidencia analizada correctamente');

        } catch (error) {
            console.error('Error procesando evidencia:', error);
            toast.error('Error al procesar la imagen');
            // Revertir estado o marcar error
            setEvidencias(prev => prev.filter(ev => ev.id !== tempId));
        }
    };

    const eliminarEvidencia = async (id: string) => {
        setEvidencias(prev => prev.filter(ev => ev.id !== id));
        // TODO: Eliminar de BD y Storage si no es temp
    };

    const finalizarSiniestro = async () => {
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
    };

    const actualizarUbicacion = async (lat: number, lng: number) => {
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
    };

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
