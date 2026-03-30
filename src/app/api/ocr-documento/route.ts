import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { checkRateLimit } from '@/lib/rate-limit';

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
});

const OCR_SYSTEM_PROMPT = `Eres un experto en extracción de datos de documentos de identidad chilenos.
Extraes información de:
- Cédula de identidad / Carnet de identidad
- Licencia de conducir
- Tarjeta verde (permiso de circulación)

Responde SIEMPRE en JSON válido. Si un campo no es legible, usa null.
No inventes datos que no puedas leer claramente.`;

const OCR_USER_PROMPT = `Extrae los datos del documento en esta imagen. Responde con este JSON:

{
  "tipo_documento": <"cedula_identidad"|"licencia_conducir"|"permiso_circulacion"|"otro"|"no_documento">,
  "datos_persona": {
    "nombre_completo": <string o null>,
    "rut": <string formato "12345678-9" o null>,
    "nacionalidad": <string o null>
  },
  "datos_vehiculo": {
    "patente": <string formato "AA-BB-12" o null>,
    "marca": <string o null>,
    "modelo": <string o null>,
    "anio": <número o null>,
    "color": <string o null>
  },
  "datos_licencia": {
    "clase": <string o null>,
    "vencimiento": <string formato "YYYY-MM-DD" o null>
  },
  "aseguradora": <string o null>,
  "confianza_lectura": <0.0-1.0, qué tan legible estaba el documento>,
  "notas": "<observaciones sobre la calidad de lectura>"
}

IMPORTANTE: Si la imagen NO es un documento, pon tipo_documento como "no_documento".
Responde SOLO con el JSON.`;

/**
 * POST /api/ocr-documento
 * 
 * Extrae datos de un documento (carnet, licencia, permiso de circulación)
 * usando Llama 4 Scout para OCR.
 * 
 * Body: { imagen_base64: string } (data:image/jpeg;base64,...)
 */
export async function POST(request: NextRequest) {
    try {
        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json({ error: 'GROQ_API_KEY no configurada' }, { status: 500 });
        }

        // Rate limit
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
            || request.headers.get('x-real-ip')
            || '127.0.0.1';
        const { success: rateLimitOk, resetAt } = checkRateLimit(ip, 10, 3_600_000);
        if (!rateLimitOk) {
            return NextResponse.json(
                { error: 'Límite de OCR alcanzado. Intenta en una hora.' },
                {
                    status: 429,
                    headers: { 'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString() },
                }
            );
        }

        const body = await request.json();
        const { imagen_base64 } = body;

        if (!imagen_base64 || typeof imagen_base64 !== 'string') {
            return NextResponse.json(
                { error: 'imagen_base64 es requerida' },
                { status: 400 }
            );
        }

        // Validar que es una imagen base64 válida
        if (!imagen_base64.startsWith('data:image/')) {
            return NextResponse.json(
                { error: 'Formato inválido. Se espera data:image/*;base64,...' },
                { status: 400 }
            );
        }

        // Llamar a Groq Vision
        const response = await groq.chat.completions.create({
            model: 'llama-3.2-11b-vision-preview',
            response_format: { type: 'json_object' },
            max_tokens: 1000,
            messages: [
                { role: 'system', content: OCR_SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: { url: imagen_base64, detail: 'high' },
                        },
                        { type: 'text', text: OCR_USER_PROMPT },
                    ],
                },
            ],
        });

        const raw = response.choices[0]?.message?.content || '{}';
        let resultado;

        try {
            resultado = JSON.parse(raw);
        } catch {
            console.error('Error parseando OCR:', raw);
            return NextResponse.json(
                { error: 'Error procesando el documento' },
                { status: 500 }
            );
        }

        // Verificar que no es "no_documento"
        if (resultado.tipo_documento === 'no_documento') {
            return NextResponse.json({
                success: false,
                error: 'La imagen no parece ser un documento de identidad o vehículo.',
                resultado,
            }, { status: 422 });
        }

        return NextResponse.json({
            success: true,
            resultado,
            tokens_usados: response.usage?.total_tokens,
        });

    } catch (error) {
        console.error('Error en OCR:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
