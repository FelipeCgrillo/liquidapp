import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import type { ResultadoAnalisisIA } from '@/types';
import { actualizarResumenSiniestro } from '@/lib/analisis';

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
});

// Prompt de sistema para análisis de siniestros automotrices
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
    try {
        // Guard: verificar que la API key esté configurada
        if (!process.env.GROQ_API_KEY) {
            console.error('CRÍTICO: GROQ_API_KEY no está definida en las variables de entorno');
            return NextResponse.json({ error: 'GROQ_API_KEY no configurada' }, { status: 500 });
        }

        // Autenticación opcional para soportar el wizard público
        const supabase = await createClient();
        // const { data: { user } } = await supabase.auth.getUser();

        // if (!user) {
        //     return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        // }

        const body = await request.json();
        const { evidencia_id, imagen_url, siniestro_id } = body;

        if (!evidencia_id || !imagen_url || !siniestro_id) {
            return NextResponse.json(
                { error: 'Se requieren evidencia_id, imagen_url y siniestro_id' },
                { status: 400 }
            );
        }

        // Llamar a Groq Vision (Llama 4 Scout — reemplazo oficial de los modelos 3.2 vision)
        const response = await groq.chat.completions.create({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
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
        let resultado: ResultadoAnalisisIA;

        try {
            resultado = JSON.parse(contenidoRaw);
        } catch {
            console.error('Error parseando respuesta IA:', contenidoRaw);
            return NextResponse.json(
                { error: 'Error al procesar la respuesta de la IA' },
                { status: 500 }
            );
        }

        // Determinar nivel de fraude desde el score
        const determinarNivelFraude = (score: number): string => {
            if (score < 0.25) return 'bajo';
            if (score < 0.5) return 'medio';
            if (score < 0.75) return 'alto';
            return 'critico';
        };

        const nivelFraude = resultado.antifraude.nivel ||
            determinarNivelFraude(resultado.antifraude.score);

        // Guardar análisis en la base de datos
        const { data: analisis, error: errorAnalisis } = await supabase
            .from('analisis_ia')
            .insert({
                evidencia_id,
                siniestro_id,
                score_fraude: resultado.antifraude.score,
                nivel_fraude: nivelFraude,
                indicadores_fraude: resultado.antifraude.indicadores || [],
                justificacion_fraude: resultado.antifraude.justificacion,
                severidad: resultado.triage.severidad,
                partes_danadas: resultado.triage.partes_danadas || [],
                descripcion_danos: resultado.triage.descripcion,
                costo_estimado_min: resultado.costos.min,
                costo_estimado_max: resultado.costos.max,
                desglose_costos: resultado.costos.desglose,
                modelo_ia: 'meta-llama/llama-4-scout-17b-16e-instruct',
                respuesta_raw: { contenido: contenidoRaw, parsed: resultado },
                tokens_usados: response.usage?.total_tokens,
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

        // Marcar evidencia como analizada
        await supabase
            .from('evidencias')
            .update({ analizado: true })
            .eq('id', evidencia_id);

        // Actualizar resumen del siniestro con el análisis más crítico
        await actualizarResumenSiniestro(supabase, siniestro_id);

        return NextResponse.json({
            success: true,
            analisis,
            resultado,
        });
    } catch (error) {
        console.error('Error en análisis IA:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

