import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(
    request: NextRequest,
    context: { params: any }
) {
    try {
        const id = context.params?.id || context.params?.id; // Suporta param directo
        
        if (!id) return NextResponse.json({ error: 'Siniestro ID indefinido' }, { status: 400 });

        const body = await request.json();
        const motivo = body.motivo?.trim();

        if (!motivo) {
            return NextResponse.json({ error: 'Motivo es requerido' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: siniestro, error: errS } = await supabase
            .from('siniestros')
            .select('estado, apelacion_plazo_vence')
            .eq('id', id)
            .single();

        if (errS || !siniestro) {
            return NextResponse.json({ error: 'Siniestro no encontrado' }, { status: 404 });
        }

        if (siniestro.estado !== 'rechazado') {
            return NextResponse.json({ error: 'El siniestro no está en estado rechazado para apelar.' }, { status: 400 });
        }

        // Validación Guard: Plazo Legal (10 días)
        if (siniestro.apelacion_plazo_vence) {
            const vence = new Date(siniestro.apelacion_plazo_vence);
            if (new Date() > vence) {
                return NextResponse.json({ error: 'Plazo legal de 10 días hábiles para apelar ha vencido.' }, { status: 403 });
            }
        }

        // Transicionar a apelado
        const { error: errUpdate } = await supabase
            .from('siniestros')
            .update({
                estado: 'apelado',
                apelacion_motivo: motivo,
                apelacion_fecha: new Date().toISOString()
            })
            .eq('id', id);

        if (errUpdate) {
            throw errUpdate;
        }

        return NextResponse.json({ success: true, message: 'Apelación registrada con éxito.' });
    } catch (e: any) {
        console.error('Error procesando apelacion:', e);
        return NextResponse.json({ error: 'Error procesando apelación', detail: e?.message }, { status: 500 });
    }
}
