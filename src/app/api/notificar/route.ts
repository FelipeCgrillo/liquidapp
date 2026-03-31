import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/notificar
 * Inserta un registro en "notificaciones" para despachar correo/SMS.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { siniestro_id, canal, destinatario, asunto, contenido } = body;

        if (!siniestro_id || !canal || !destinatario || !contenido) {
            return NextResponse.json({ error: 'Faltan parámetros obligatorios' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase
            .from('notificaciones')
            .insert({
                siniestro_id,
                canal,
                destinatario,
                asunto,
                contenido,
                estado: 'pendiente'
            });

        if (error) {
            console.error('Error insertando notificación:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Notificación encolada exitosamente' });

    } catch (error) {
        console.error('Excepción en /api/notificar:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
