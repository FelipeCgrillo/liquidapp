import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * PATCH /api/decisiones/[id]/override
 * Permite a un humano sobreescribir la resolución automática.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const decision_id = params.id;
        const body = await request.json();
        const { override_por, override_motivo, nueva_decision, nuevo_monto_final, siniestro_id } = body;

        if (!override_por || !override_motivo || !nueva_decision) {
            return NextResponse.json({ error: 'Faltan parámetros obligatorios' }, { status: 400 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: updated, error } = await supabase
            .from('decisiones_autoliquidacion')
            .update({
                override_por,
                override_motivo,
                decision: nueva_decision,
                monto_final: nuevo_monto_final,
                override_at: new Date().toISOString()
            })
            .eq('id', decision_id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (siniestro_id && nueva_decision) {
            await supabase.from('siniestros').update({ estado: nueva_decision }).eq('id', siniestro_id);
        }

        return NextResponse.json({ success: true, decision: updated });

    } catch (error) {
        console.error('Error en /api/decisiones/override:', error);
        return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
    }
}
