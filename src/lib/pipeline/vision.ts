/**
 * Pipeline Etapa 1: Visión ampliada
 * 
 * Extiende el análisis de visión con:
 * - Detección OCR de patente del vehículo
 * - Tipo de impacto (frontal, lateral, trasero, volcamiento)
 * - Detección de airbags desplegados
 * - Evaluación de deformación estructural
 * - Todo el análisis original (antifraude, triaje, costos)
 */

import OpenAI from 'openai';

export interface VisionAmpliadaResult {
    // Original
    antifraude: {
        score: number;
        nivel: string;
        indicadores: string[];
        justificacion: string;
    };
    triage: {
        severidad: string;
        partes_danadas: string[];
        descripcion: string;
    };
    costos: {
        min: number;
        max: number;
        desglose: { parte: string; costo_min: number; costo_max: number }[];
    };
    // Nuevo Sprint 3
    deteccion_vehiculo: {
        patente_detectada: string | null;
        confianza_patente: number; // 0-1
        tipo_impacto: string; // frontal, lateral_izquierdo, lateral_derecho, trasero, superior, multiple
        airbags_desplegados: boolean;
        deformacion_estructural: boolean;
        color_vehiculo: string | null;
        marca_modelo_estimado: string | null;
    };
}

const SYSTEM_PROMPT_V2 = `Eres un perito experto en liquidación de siniestros automotrices con 20 años de experiencia.
Analizas imágenes de vehículos dañados. Tu análisis incluye:

1. ANTIFRAUDE: Detectar inconsistencias, manipulación digital, daños preexistentes o escenificados.
2. TRIAJE: Clasificar severidad (leve, moderado, grave, perdida_total).
3. COSTOS: Estimar rangos de reparación en CLP (mercado chileno actual).
4. DETECCIÓN VEHICULAR:
   - Leer la PATENTE del vehículo (formato chileno: AA-BB-12 o AABB12)
   - Identificar el TIPO DE IMPACTO (frontal, lateral_izquierdo, lateral_derecho, trasero, superior, multiple)
   - Detectar si hay AIRBAGS DESPLEGADOS
   - Evaluar si hay DEFORMACIÓN ESTRUCTURAL (chasis comprometido)
   - Identificar COLOR del vehículo
   - Estimar MARCA y MODELO si es posible

Responde SIEMPRE en JSON válido. Sé conservador en fraude (solo marca alto/critico con evidencia clara).
Si no puedes leer la patente, devuelve null para patente_detectada con confianza 0.`;

const USER_PROMPT_V2 = `Analiza esta imagen de un vehículo siniestrado. Responde con este JSON exacto:

{
  "antifraude": {
    "score": <0.0-1.0>,
    "nivel": <"bajo"|"medio"|"alto"|"critico">,
    "indicadores": [<lista de indicadores>],
    "justificacion": "<explicación>"
  },
  "triage": {
    "severidad": <"leve"|"moderado"|"grave"|"perdida_total">,
    "partes_danadas": [<lista en español>],
    "descripcion": "<descripción técnica>"
  },
  "costos": {
    "min": <CLP entero>,
    "max": <CLP entero>,
    "desglose": [{"parte": "<nombre>", "costo_min": <CLP>, "costo_max": <CLP>}]
  },
  "deteccion_vehiculo": {
    "patente_detectada": <"AA-BB-12" o null si no visible>,
    "confianza_patente": <0.0-1.0>,
    "tipo_impacto": <"frontal"|"lateral_izquierdo"|"lateral_derecho"|"trasero"|"superior"|"multiple">,
    "airbags_desplegados": <true|false>,
    "deformacion_estructural": <true|false>,
    "color_vehiculo": <string o null>,
    "marca_modelo_estimado": <string o null>
  }
}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional.`;

/**
 * Ejecuta análisis de visión ampliada usando Llama 4 Scout (Groq).
 */
export async function analizarVisionAmpliada(
    groqClient: OpenAI,
    imagenUrl: string,
    maxRetries: number = 3
): Promise<VisionAmpliadaResult> {
    let lastError: unknown;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await groqClient.chat.completions.create({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                response_format: { type: 'json_object' },
                max_tokens: 2000,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT_V2 },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image_url',
                                image_url: { url: imagenUrl, detail: 'high' },
                            },
                            { type: 'text', text: USER_PROMPT_V2 },
                        ],
                    },
                ],
            });

            const raw = response.choices[0]?.message?.content || '{}';
            const parsed = JSON.parse(raw) as VisionAmpliadaResult;

            // Asegurar que deteccion_vehiculo existe
            if (!parsed.deteccion_vehiculo) {
                parsed.deteccion_vehiculo = {
                    patente_detectada: null,
                    confianza_patente: 0,
                    tipo_impacto: 'frontal',
                    airbags_desplegados: false,
                    deformacion_estructural: false,
                    color_vehiculo: null,
                    marca_modelo_estimado: null,
                };
            }

            return {
                ...parsed,
                // Metadata para trazabilidad
                _tokens: response.usage?.total_tokens,
                _promptHash: hashPrompt(SYSTEM_PROMPT_V2 + USER_PROMPT_V2),
            } as VisionAmpliadaResult & { _tokens?: number; _promptHash?: string };

        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
            }
        }
    }

    throw lastError;
}

/**
 * Hash simple del prompt para trazabilidad CMF.
 * No es SHA-256 completo (eso iría en el server), solo un fingerprint rápido.
 */
function hashPrompt(prompt: string): string {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
        const char = prompt.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return `prompt_${Math.abs(hash).toString(36)}`;
}

export { SYSTEM_PROMPT_V2, USER_PROMPT_V2 };
