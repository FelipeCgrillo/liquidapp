import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { EvidenciaConAnalisis } from '@/types';
import toast from 'react-hot-toast';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface UploadOptions {
    siniestroId: string;
    description?: string;
    location?: {
        lat: number;
        lng: number;
        precision?: number;
    };
    order?: number;
}

export function useEvidenceUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const { getSignedUrl } = useSignedUrl();

    const uploadAndAnalyze = async (file: File, options: UploadOptions, queueAnalysis: boolean = false): Promise<EvidenciaConAnalisis> => {
        setIsUploading(true);
        const supabase = createClient();
        const { siniestroId, description, location, order = 0 } = options;

        try {
            // 1. Subir imagen a Supabase Storage
            const extension = file.name.split('.').pop() || 'jpg';
            const nombreArchivo = `${siniestroId}/${Date.now()}.${extension}`;

            const { error: uploadError } = await supabase.storage
                .from('evidencias-siniestros')
                .upload(nombreArchivo, file, { contentType: file.type });

            if (uploadError) throw uploadError;

            // 2. Crear registro en BD
            const { data: evidenciaDB, error: dbError } = await supabase
                .from('evidencias')
                .insert({
                    siniestro_id: siniestroId,
                    storage_path: nombreArchivo,
                    nombre_archivo: file.name,
                    tipo_mime: file.type,
                    tamaño_bytes: file.size,
                    descripcion: description,
                    latitud: location?.lat,
                    longitud: location?.lng,
                    precision_metros: location?.precision,
                    orden: order,
                    analizado: false // Inicialmente no analizado
                })
                .select()
                .single();

            if (dbError) throw dbError;

            // 3. Obtener URL firmada
            const signedUrl = await getSignedUrl(nombreArchivo, 'evidencias-siniestros', 3600);

            if (!signedUrl) {
                throw new Error('No se pudo generar la URL firmada para el análisis');
            }

            if (queueAnalysis) {
                // Modo Síncrono-No-Bloqueante (Queue)
                // Lanzamos la petición pero no esperamos la respuesta completa
                console.log('Iniciando análisis LLM (queue)', { evidencia_id: evidenciaDB.id });
                fetch('/api/queue-analisis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        evidencia_id: evidenciaDB.id,
                        imagen_url: signedUrl,
                        siniestro_id: siniestroId,
                    }),
                })
                    .then(async (res) => {
                        if (!res.ok) {
                            const errText = await res.text();
                            console.error("🔥 Error HTTP en backend análisis:", res.status, errText);
                        } else {
                            console.log("✅ Petición de análisis enviada correctamente");
                        }
                    })
                    .catch(err => console.error("❌ Error de red en trigger análisis:", err));

                // Retornamos estado optimista "analizando"
                return {
                    ...evidenciaDB,
                    previewUrl: URL.createObjectURL(file),
                    analizando: true,
                    analizado: false,
                    analisis: undefined
                };

            } else {
                // Modo Síncrono (Legacy/Default)
                const respuestaIA = await fetch('/api/analizar-evidencia', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        evidencia_id: evidenciaDB.id,
                        imagen_url: signedUrl,
                        siniestro_id: siniestroId,
                    }),
                });

                const resultadoIA = await respuestaIA.json();

                return {
                    ...evidenciaDB,
                    previewUrl: URL.createObjectURL(file), // Mantener URL local
                    analizando: false,
                    analizado: true,
                    analisis: resultadoIA.analisis,
                };
            }

        } catch (error) {
            console.error('Error en useEvidenceUpload:', error);
            throw error;
        } finally {
            setIsUploading(false);
        }
    };

    return {
        uploadAndAnalyze,
        isUploading
    };
}
