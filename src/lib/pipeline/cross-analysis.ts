/**
 * Pipeline Etapa 2: Análisis cruzado entre evidencias
 * 
 * Usa Llama 4 Maverick para comparar todas las fotos de un siniestro
 * y producir un veredicto de consistencia:
 * 
 * - ¿Las fotos muestran el mismo vehículo?
 * - ¿El tipo de daño es consistente entre fotos?
 * - ¿Hay fotos que parecen ser de otro evento?
 * - ¿La patente coincide entre fotos?
 * - Score de consistencia (0-1)
 */

import OpenAI from 'openai';

export interface AnalisisCruzadoResult {
    consistencia_score: number; // 0-1 (1 = perfecta)
    mismo_vehiculo: boolean;
    patentes_detectadas: string[];
    patentes_coinciden: boolean;
    inconsistencias: string[];
    veredicto: string;
    fotos_sospechosas: number[]; // índices 0-based de fotos sospechosas
}

const CROSS_ANALYSIS_SYSTEM = `Eres un perito forense automotriz especializado en detección de fraude.
Tu trabajo es COMPARAR múltiples fotos del MISMO siniestro y determinar su consistencia.

Analiza:
1. ¿Todas las fotos muestran el MISMO vehículo? (color, marca, modelo, patente)
2. ¿El daño es CONSISTENTE entre fotos? (misma zona de impacto, misma severidad)
3. ¿Hay fotos que parecen ser de OTRO evento/vehículo?
4. ¿Las patentes visibles son la MISMA?
5. ¿Hay indicios de MANIPULACIÓN o fotos descargadas de internet?

Responde SOLO en JSON.`;

function buildCrossAnalysisPrompt(numFotos: number): string {
    return `Compara estas ${numFotos} fotos de un siniestro automotriz. Responde con este JSON:

{
  "consistencia_score": <0.0-1.0, donde 1.0 = todas las fotos son perfectamente consistentes>,
  "mismo_vehiculo": <true si todas las fotos parecen ser del mismo vehículo>,
  "patentes_detectadas": [<lista de patentes legibles en las fotos>],
  "patentes_coinciden": <true si todas las patentes detectadas son iguales o solo se leyó una>,
  "inconsistencias": [<lista de problemas detectados, vacía si no hay>],
  "veredicto": "<párrafo corto con la conclusión del análisis cruzado>",
  "fotos_sospechosas": [<índices 0-based de fotos que parecen no pertenecer al mismo evento>]
}

Sé conservador: solo marca inconsistencias si hay evidencia clara.
IMPORTANTE: Responde SOLO con el JSON.`;
}

/**
 * Ejecuta análisis cruzado de todas las evidencias de un siniestro.
 * Usa Llama 4 Maverick (más potente) para comparación multi-imagen.
 */
export async function analizarCruzado(
    groqClient: OpenAI,
    imagenesUrls: string[],
    maxRetries: number = 2
): Promise<AnalisisCruzadoResult> {
    // Si solo hay 1 foto, no podemos hacer análisis cruzado
    if (imagenesUrls.length < 2) {
        return {
            consistencia_score: 0.60, // Conservative default for single photo
            mismo_vehiculo: true,
            patentes_detectadas: [],
            patentes_coinciden: true,
            inconsistencias: ['Solo una foto disponible, análisis cruzado limitado'],
            veredicto: 'Análisis cruzado no aplicable con una sola foto.',
            fotos_sospechosas: [],
        };
    }

    // Construir contenido multi-imagen
    const imageContent: OpenAI.Chat.ChatCompletionContentPart[] = imagenesUrls.map(
        (url, index) => ({
            type: 'image_url' as const,
            image_url: {
                url,
                detail: 'high' as const,
            },
        })
    );

    // Agregar prompt al final
    imageContent.push({
        type: 'text',
        text: buildCrossAnalysisPrompt(imagenesUrls.length),
    });

    let lastError: unknown;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await groqClient.chat.completions.create({
                model: 'llama-3.2-11b-vision-preview',
                response_format: { type: 'json_object' },
                max_tokens: 1500,
                messages: [
                    { role: 'system', content: CROSS_ANALYSIS_SYSTEM },
                    { role: 'user', content: imageContent },
                ],
            });

            const raw = response.choices[0]?.message?.content || '{}';
            const parsed = JSON.parse(raw) as AnalisisCruzadoResult;

            // Validar rango del score
            parsed.consistencia_score = Math.max(0, Math.min(1, parsed.consistencia_score || 0.5));

            return parsed;
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await new Promise(r => setTimeout(r, 2000 * Math.pow(2, i)));
            }
        }
    }

    // Fallback si Maverick no está disponible
    console.warn('⚠️ Análisis cruzado falló, usando fallback conservador:', lastError);
    return {
        consistencia_score: 0.70,
        mismo_vehiculo: true,
        patentes_detectadas: [],
        patentes_coinciden: true,
        inconsistencias: ['Análisis cruzado no disponible temporalmente'],
        veredicto: 'No se pudo completar el análisis cruzado. Valor conservador asignado.',
        fotos_sospechosas: [],
    };
}
