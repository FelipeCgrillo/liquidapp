import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { analizarEvidenciaSchema } from '@/lib/validations/api';
import { checkRateLimit } from '@/lib/rate-limit';
import { actualizarResumenSiniestro } from '@/lib/analisis';
import { ejecutarPipelineIndividual } from '@/lib/pipeline';

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
});

/**
 * POST /api/analizar-evidencia
 * 
 * Pipeline V2 — Ejecuta Etapa 0 (metadata) + Etapa 1 (visión ampliada) para una foto.
 * Etapas 2+3 se ejecutan aparte en /api/analisis-cruzado cuando todas las fotos están listas.
 */
export async function POST(request: NextRequest) {
    try {
        if (!process.env.GROQ_API_KEY) {
            console.error('CRÍTICO: GROQ_API_KEY no está definida');
            return NextResponse.json({ error: 'GROQ_API_KEY no configurada' }, { status: 500 });
        }

        const supabase = await createClient();

        // Rate limit
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || request.headers.get('x-real-ip')
            || '127.0.0.1';
        const { success: rateLimitOk, resetAt } = checkRateLimit(ip, 15, 3_600_000);
        if (!rateLimitOk) {
            return NextResponse.json(
                { error: 'Límite de análisis alcanzado. Intenta en una hora.' },
                {
                    status: 429,
                    headers: { 'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString() },
                }
            );
        }

        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 100_000) {
            return NextResponse.json({ error: 'Payload demasiado grande' }, { status: 413 });
        }

        const body = await request.json();
        const validation = analizarEvidenciaSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: 'Datos inválidos', details: validation.error.flatten() },
                { status: 400 }
            );
        }
        const { evidencia_id, imagen_url, siniestro_id } = validation.data;

        // Obtener metadata de la evidencia (GPS, etc.)
        const { data: evidencia } = await supabase
            .from('evidencias')
            .select(`
                latitud,
                longitud,
                tipo_mime,
                siniestros!inner(
                    fecha_siniestro
                )
            `)
            .eq('id', evidencia_id)
            .single();

        // ─── Ejecutar Pipeline Individual (Etapas 0 + 1) ────────────────
        const resultado = await ejecutarPipelineIndividual(groq, {
            imagenUrl: imagen_url,
            evidenciaId: evidencia_id,
            siniestroId: siniestro_id,
            gpsLat: evidencia?.latitud,
            gpsLng: evidencia?.longitud,
            fechaCaptura: (evidencia as any)?.siniestros?.fecha_siniestro,
            tipoMime: evidencia?.tipo_mime,
        });

        const { vision } = resultado.etapa1;

        // Combinar flags de Exif al motor de fraude visual de Llama
        if (resultado.etapa0.metadata.alertas_fraude_exif && resultado.etapa0.metadata.alertas_fraude_exif.length > 0) {
            vision.antifraude.indicadores = [
                ...(vision.antifraude.indicadores || []),
                ...resultado.etapa0.metadata.alertas_fraude_exif
            ];

            const tieneAlertasCriticas = resultado.etapa0.metadata.alertas_fraude_exif.some(a => !a.includes('purgada'));
            if (tieneAlertasCriticas) {
                vision.antifraude.score = Math.max(vision.antifraude.score, 0.85); // Hackea score para bloquear autoaprobado
            } else {
                vision.antifraude.score = Math.max(vision.antifraude.score, 0.40); // Penalty por falta de EXIF (ej: WhatsApp)
            }
        }

        // Determinar nivel de fraude
        const determinarNivelFraude = (score: number): string => {
            if (score < 0.25) return 'bajo';
            if (score < 0.5) return 'medio';
            if (score < 0.75) return 'alto';
            return 'critico';
        };

        const nivelFraude = vision.antifraude.nivel ||
            determinarNivelFraude(vision.antifraude.score);

        // ─── Guardar en BD ───────────────────────────────────────────────
        const { data: analisis, error: errorAnalisis } = await supabase
            .from('analisis_ia')
            .insert({
                evidencia_id,
                siniestro_id,
                // Antifraude
                score_fraude: vision.antifraude.score,
                nivel_fraude: nivelFraude,
                indicadores_fraude: vision.antifraude.indicadores || [],
                justificacion_fraude: vision.antifraude.justificacion,
                // Triaje
                severidad: vision.triage.severidad,
                partes_danadas: vision.triage.partes_danadas || [],
                descripcion_danos: vision.triage.descripcion,
                // Costos
                costo_estimado_min: vision.costos.min,
                costo_estimado_max: vision.costos.max,
                desglose_costos: vision.costos.desglose,
                // Detección vehicular (Sprint 3)
                patente_detectada: vision.deteccion_vehiculo?.patente_detectada || null,
                tipo_impacto_detectado: vision.deteccion_vehiculo?.tipo_impacto || null,
                // Compliance
                prompt_hash: (vision as unknown as Record<string, string>)._promptHash || null,
                prompt_version: 'v2',
                modelo_ia: 'llama-3.2-11b-vision-preview',
                respuesta_raw: { vision, pipeline_errors: resultado.errores },
                tokens_usados: resultado.etapa1.tokensUsados,
            })
            .select()
            .single();

        if (errorAnalisis) {
            console.error('Error guardando análisis:', errorAnalisis);
            return NextResponse.json(
                { error: 'Error al guardar el análisis' },
                { status: 500 }
            );
        }

        // Actualizar evidencia: hash SHA-256 + analizado
        await supabase
            .from('evidencias')
            .update({
                analizado: true,
                sha256_hash: resultado.etapa0.metadata.sha256 || null,
            })
            .eq('id', evidencia_id);

        // Actualizar resumen del siniestro
        await actualizarResumenSiniestro(supabase, siniestro_id);

        return NextResponse.json({
            success: true,
            analisis,
            resultado: {
                antifraude: vision.antifraude,
                triage: vision.triage,
                costos: vision.costos,
                deteccion_vehiculo: vision.deteccion_vehiculo,
            },
            pipeline: {
                etapa0_ok: resultado.etapa0.completada,
                etapa1_ok: resultado.etapa1.completada,
                sha256: resultado.etapa0.metadata.sha256,
                errores: resultado.errores,
            },
        });
    } catch (error) {
        console.error('Error en análisis IA:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
