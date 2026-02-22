import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import type { SiniestroCompleto, AnalisisIA } from '@/types';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1',
});

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { siniestro_id } = await request.json();

        if (!siniestro_id) {
            return NextResponse.json({ error: 'Se requiere siniestro_id' }, { status: 400 });
        }

        // Obtener datos completos del siniestro
        const { data } = await supabase
            .from('siniestros')
            .select(`
        *,
        evidencias (
          id, descripcion, latitud, longitud, capturado_at,
          analisis_ia (
            severidad, score_fraude, nivel_fraude, indicadores_fraude,
            justificacion_fraude, partes_danadas, descripcion_danos,
            costo_estimado_min, costo_estimado_max, desglose_costos
          )
        )
      `)
            .eq('id', siniestro_id)
            .single();

        if (!data) {
            return NextResponse.json({ error: 'Siniestro no encontrado' }, { status: 404 });
        }

        const siniestro = data as unknown as SiniestroCompleto;

        // Construir contexto para el pre-informe
        const evidenciasTexto = siniestro.evidencias?.map((ev, i: number) => {
            const analisis = ev.analisis_ia?.[0];
            if (!analisis) return `Evidencia ${i + 1}: Sin análisis`;
            return `
Evidencia ${i + 1}:
- Descripción: ${ev.descripcion || 'Sin descripción'}
- Severidad: ${analisis.severidad}
- Score Fraude: ${(analisis.score_fraude * 100).toFixed(0)}% (${analisis.nivel_fraude})
- Partes dañadas: ${analisis.partes_danadas?.join(', ') || 'No especificado'}
- Daños: ${analisis.descripcion_danos}
- Costo estimado: $${analisis.costo_estimado_min.toLocaleString('es-CL')} - $${analisis.costo_estimado_max.toLocaleString('es-CL')} CLP
${analisis.indicadores_fraude?.length ? `- ⚠️ Indicadores de fraude: ${analisis.indicadores_fraude.join(', ')}` : ''}`;
        }).join('\n') || 'Sin evidencias analizadas';

        const prompt = `Genera un pre-informe técnico de liquidación de siniestro automotriz en formato Markdown.

DATOS DEL SINIESTRO:
- Número: ${siniestro.numero_siniestro}
- Fecha: ${new Date(siniestro.fecha_siniestro).toLocaleDateString('es-CL')}
- Tipo: ${siniestro.tipo_siniestro}
- Patente: ${siniestro.patente}
- Vehículo: ${siniestro.marca || ''} ${siniestro.modelo || ''} ${siniestro.anio || ''}
- Asegurado: ${siniestro.nombre_asegurado}
- Póliza: ${siniestro.poliza_numero || 'No especificada'}
- Ubicación: ${siniestro.direccion || `${siniestro.latitud}, ${siniestro.longitud}`}

ANÁLISIS DE EVIDENCIAS:
${evidenciasTexto}

RESUMEN IA:
- Severidad General: ${siniestro.severidad_general || 'No determinada'}
- Score Fraude General: ${((siniestro.score_fraude_general || 0) * 100).toFixed(0)}%
- Costo Total Estimado: $${(siniestro.costo_estimado_min || 0).toLocaleString('es-CL')} - $${(siniestro.costo_estimado_max || 0).toLocaleString('es-CL')} CLP

Genera el pre-informe con las siguientes secciones en Markdown:
1. ## Resumen Ejecutivo
2. ## Datos del Siniestro
3. ## Evaluación de Daños
4. ## Análisis Antifraude
5. ## Estimación de Costos
6. ## Recomendación del Liquidador IA
7. ## Observaciones y Notas

El informe debe ser técnico, profesional y en español. Incluye tablas donde sea apropiado.
Al final incluye: "---\n*Pre-informe generado automáticamente por LiquidApp IA. Requiere revisión y firma de liquidador autorizado.*"`;

        const response = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 3000,
            messages: [
                {
                    role: 'system',
                    content: 'Eres un perito liquidador experto. Redactas informes técnicos precisos, claros y profesionales en español para compañías de seguros chilenas.',
                },
                { role: 'user', content: prompt },
            ],
        });

        const contenidoMarkdown = response.choices[0]?.message?.content || '';

        // Guardar o actualizar el pre-informe
        const { data: informeExistente } = await supabase
            .from('pre_informes')
            .select('id, version')
            .eq('siniestro_id', siniestro_id)
            .single();

        let informe;
        if (informeExistente) {
            const { data } = await supabase
                .from('pre_informes')
                .update({
                    contenido_markdown: contenidoMarkdown,
                    estado: 'borrador',
                    version: (informeExistente.version || 1) + 1,
                })
                .eq('id', informeExistente.id)
                .select()
                .single();
            informe = data;
        } else {
            const { data } = await supabase
                .from('pre_informes')
                .insert({
                    siniestro_id,
                    contenido_markdown: contenidoMarkdown,
                    generado_por_ia: true,
                })
                .select()
                .single();
            informe = data;
        }

        return NextResponse.json({ success: true, informe });
    } catch (error) {
        console.error('Error generando pre-informe:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
