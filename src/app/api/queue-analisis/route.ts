import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import type { ResultadoAnalisisIA } from '@/types';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1',
});

// Extender el tiempo máximo en Vercel (si se usa plan Pro o para evitar el default de 15s)
export const maxDuration = 60;

// Prompt de sistema (Reused from analisar-evidencia)
const SYSTEM_PROMPT = `Eres un perito experto en liquidación de siniestros automotrices con 20 años de experiencia.
Analizas imágenes de vehículos dañados para:
1. ANTIFRAUDE: Detectar inconsistencias, manipulación digital, daños preexistentes o escenificados
2. TRIAJE: Clasificar la severidad del daño (leve/moderado/grave/perdida_total)
3. COSTOS: Estimar rangos de costo de reparación en pesos chilenos (CLP)

Responde SIEMPRE en formato JSON válido con la estructura exacta especificada.
Sé conservador en las estimaciones de fraude (solo marca alto/critico si hay evidencia clara).
Los costos deben reflejar el mercado chileno actual (talleres certificados).`;

const USER_PROMPT = `Analiza esta imagen de un vehículo siniestrado y responde con el siguiente JSON exacto:

{
  "antifraude": {
    "score": <número 0.0-1.0, donde 0=sin fraude, 1=fraude evidente>,
    "nivel": <"bajo"|"medio"|"alto"|"critico">,
    "indicadores": [<lista de indicadores detectados, vacía si no hay>],
    "justificacion": "<explicación breve de la evaluación antifraude>"
  },
  "triage": {
    "severidad": <"leve"|"moderado"|"grave"|"perdida_total">,
    "partes_danadas": [<lista de partes dañadas en español, ej: "parachoque_delantero", "capot", "faro_derecho">],
    "descripcion": "<descripción técnica de los daños observados>"
  },
  "costos": {
    "min": <costo mínimo en CLP como número entero>,
    "max": <costo máximo en CLP como número entero>,
    "desglose": [
      {
        "parte": "<nombre de la parte>",
        "costo_min": <número entero CLP>,
        "costo_max": <número entero CLP>
      }
    ]
  }
}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional.`;

export async function POST(request: NextRequest) {
    // Return accepted immediately if possible, but in Vercel functions execution might stop.
    // For this implementation, we will perform the logic but the client will not await the full response.
    // Ideally, for true background jobs, we would use Inngest, BullMQ or Supabase Edge Functions.
    // Here we replicate logic to support the "fire and forget" pattern from the client side.

    try {
        console.log("Iniciando Request POST a /api/queue-analisis");
        if (!process.env.OPENAI_API_KEY) {
            console.error("CRÍTICO: OPENAI_API_KEY no está definida en las variables de entorno");
        }

        const supabase = await createClient();
        const body = await request.json();
        const { evidencia_id, imagen_url, siniestro_id } = body;

        if (!evidencia_id || !imagen_url || !siniestro_id) {
            console.warn("Faltan parámetros requeridos:", { evidencia_id, imagen_url, siniestro_id });
            return NextResponse.json(
                { error: 'Se requieren evidencia_id, imagen_url y siniestro_id' },
                { status: 400 }
            );
        }

        // Llamar a Groq Vision (Llama 3.2 90B)
        console.log("Llamando a Groq API con", { evidencia_id, modelo: 'llama-3.2-90b-vision-preview' });
        const response = await openai.chat.completions.create({
            model: 'llama-3.2-90b-vision-preview',
            response_format: { type: "json_object" },
            max_tokens: 1500,
            messages: [
                {
                    role: 'system',
                    content: SYSTEM_PROMPT,
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: {
                                url: imagen_url,
                                detail: 'high',
                            },
                        },
                        {
                            type: 'text',
                            text: USER_PROMPT,
                        },
                    ],
                },
            ],
        });

        const contenidoRaw = response.choices[0]?.message?.content || '{}';
        console.log("Respuesta raw de OpenAI:", contenidoRaw);
        let resultado: ResultadoAnalisisIA;

        try {
            resultado = JSON.parse(contenidoRaw);
        } catch {
            console.error('Error parseando respuesta IA:', contenidoRaw);
            // Even if we fail, we should probably record an error state in DB
            return NextResponse.json(
                { error: 'Error al procesar la respuesta de la IA' },
                { status: 500 }
            );
        }

        // Determinar nivel de fraude
        const determinarNivelFraude = (score: number): string => {
            if (score < 0.25) return 'bajo';
            if (score < 0.5) return 'medio';
            if (score < 0.75) return 'alto';
            return 'critico';
        };

        const nivelFraude = resultado?.antifraude?.nivel ||
            determinarNivelFraude(resultado?.antifraude?.score || 0);

        // Guardar análisis en la base de datos
        const { error: errorAnalisis } = await supabase
            .from('analisis_ia')
            .insert({
                evidencia_id,
                siniestro_id,
                score_fraude: resultado?.antifraude?.score || 0,
                nivel_fraude: nivelFraude,
                indicadores_fraude: resultado?.antifraude?.indicadores || [],
                justificacion_fraude: resultado?.antifraude?.justificacion || '',
                severidad: resultado?.triage?.severidad || 'leve',
                partes_danadas: resultado?.triage?.partes_danadas || [],
                descripcion_danos: resultado?.triage?.descripcion || '',
                costo_estimado_min: resultado?.costos?.min || 0,
                costo_estimado_max: resultado?.costos?.max || 0,
                desglose_costos: resultado?.costos?.desglose || [],
                modelo_ia: 'gpt-4o',
                respuesta_raw: { contenido: contenidoRaw, parsed: resultado },
                tokens_usados: response.usage?.total_tokens,
            });

        if (errorAnalisis) {
            console.error('Error DB guardando análisis:', JSON.stringify(errorAnalisis));
            return NextResponse.json({ error: 'Error al guardar el análisis' }, { status: 500 });
        }

        // Marcar evidencia como analizada
        await supabase
            .from('evidencias')
            .update({ analizado: true })
            .eq('id', evidencia_id);

        // Actualizar resumen del siniestro
        await actualizarResumenSiniestro(supabase, siniestro_id);

        return NextResponse.json({
            success: true,
            message: 'Análisis completado en background'
        });

    } catch (error) {
        const errDetails = error instanceof Error ? error.message : JSON.stringify(error);
        console.error('Error en queue-analisis:', errDetails);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: errDetails },
            { status: 500 }
        );
    }
}

async function actualizarResumenSiniestro(
    supabase: Awaited<ReturnType<typeof createClient>>,
    siniestroId: string
) {
    // Logic reused from analizar-evidencia
    const { data: analisis } = await supabase
        .from('analisis_ia')
        .select('severidad, score_fraude, costo_estimado_min, costo_estimado_max')
        .eq('siniestro_id', siniestroId);

    if (!analisis || analisis.length === 0) return;

    const ordenSeveridad: Record<string, number> = {
        leve: 1, moderado: 2, grave: 3, perdida_total: 4,
    };

    const severidadMax = analisis.reduce((max: string, a: { severidad: string }) => {
        return (ordenSeveridad[a.severidad] || 0) > (ordenSeveridad[max] || 0)
            ? a.severidad : max;
    }, 'leve');

    const scoreFraudeMax = Math.max(...analisis.map((a: { score_fraude: number | null }) => a.score_fraude || 0));
    const costoMin = analisis.reduce((sum: number, a: { costo_estimado_min: number | null }) => sum + (a.costo_estimado_min || 0), 0);
    const costoMax = analisis.reduce((sum: number, a: { costo_estimado_max: number | null }) => sum + (a.costo_estimado_max || 0), 0);

    await supabase
        .from('siniestros')
        .update({
            severidad_general: severidadMax,
            score_fraude_general: scoreFraudeMax,
            costo_estimado_min: costoMin,
            costo_estimado_max: costoMax,
        })
        .eq('id', siniestroId);
}
