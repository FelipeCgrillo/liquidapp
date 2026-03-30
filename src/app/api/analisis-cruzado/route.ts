import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { ejecutarPipelineGlobal } from '@/lib/pipeline';

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
});

/**
 * POST /api/analisis-cruzado
 * 
 * Pipeline V2 — Ejecuta Etapa 2 (análisis cruzado) + Etapa 3 (cruce patente)
 * para un siniestro completo. Llamar DESPUÉS de que todas las fotos fueron analizadas.
 * 
 * Body: { siniestro_id: string }
 */
export async function POST(request: NextRequest) {
    try {
        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json({ error: 'GROQ_API_KEY no configurada' }, { status: 500 });
        }

        const body = await request.json();
        const { siniestro_id } = body;

        if (!siniestro_id) {
            return NextResponse.json({ error: 'siniestro_id requerido' }, { status: 400 });
        }

        const supabase = await createClient();

        // ─── Obtener datos del siniestro + evidencias + análisis ─────────
        const { data: siniestro, error: errSiniestro } = await supabase
            .from('siniestros')
            .select('patente, latitud, longitud')
            .eq('id', siniestro_id)
            .single();

        if (errSiniestro || !siniestro) {
            return NextResponse.json(
                { error: 'Siniestro no encontrado' },
                { status: 404 }
            );
        }

        // Obtener URLs de evidencias
        const { data: evidencias } = await supabase
            .from('evidencias')
            .select('url_publica, latitud, longitud, analisis_ia(patente_detectada)')
            .eq('siniestro_id', siniestro_id)
            .eq('analizado', true);

        if (!evidencias || evidencias.length === 0) {
            return NextResponse.json(
                { error: 'No hay evidencias analizadas para este siniestro' },
                { status: 422 }
            );
        }

        // Preparar datos para pipeline global
        const imagenesUrls = evidencias
            .map(ev => ev.url_publica)
            .filter((url): url is string => url !== null);

        const patentesDetectadas = evidencias.flatMap(ev =>
            (ev.analisis_ia as unknown as { patente_detectada: string | null }[])?.map(a => a.patente_detectada) || []
        );

        const ubicacionesFotos = evidencias
            .filter(ev => ev.latitud && ev.longitud)
            .map(ev => ({ lat: Number(ev.latitud), lng: Number(ev.longitud) }));

        // ─── Ejecutar Pipeline Global (Etapas 2 + 3) ────────────────────
        const resultado = await ejecutarPipelineGlobal(
            groq,
            imagenesUrls,
            patentesDetectadas,
            siniestro.patente || '',
            {
                ubicacionDeclarada: siniestro.latitud && siniestro.longitud
                    ? { lat: Number(siniestro.latitud), lng: Number(siniestro.longitud) }
                    : undefined,
                ubicacionesFotos: ubicacionesFotos.length > 0 ? ubicacionesFotos : undefined,
            }
        );

        return NextResponse.json({
            success: true,
            analisis_cruzado: {
                consistencia_score: resultado.cruzado.consistencia_score,
                mismo_vehiculo: resultado.cruzado.mismo_vehiculo,
                patentes_coinciden: resultado.cruzado.patentes_coinciden,
                inconsistencias: resultado.cruzado.inconsistencias,
                veredicto: resultado.cruzado.veredicto,
                fotos_sospechosas: resultado.cruzado.fotos_sospechosas,
            },
            cruce_patente: {
                coincide: resultado.patente.coincide,
                confianza: resultado.patente.confianza,
                alerta: resultado.patente.alerta,
                detalle: resultado.patente.detalle,
                patentes_detectadas: resultado.patente.patentesDetectadas,
            },
            gps_distancia_max_km: resultado.gpsDistanciaMaxKm,
            errores: resultado.errores,
        });

    } catch (error) {
        console.error('Error en análisis cruzado:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
