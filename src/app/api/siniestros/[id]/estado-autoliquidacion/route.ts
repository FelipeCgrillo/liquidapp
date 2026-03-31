import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/siniestros/[id]/estado-autoliquidacion
 * Retorna el estado en vivo del siniestro y la decisión del motor si existe.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: siniestro, error } = await supabase
            .from('siniestros')
            .select(`
                id,
                estado,
                fecha_siniestro,
                decisiones_autoliquidacion (
                    id, decision, acl_score, monto_final, explicacion_asegurado, created_at
                )
            `)
            .eq('id', id)
            .single();

        if (error || !siniestro) {
            return NextResponse.json({ error: 'Siniestro no encontrado', detail: error?.message }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            estado: siniestro.estado,
            autoliquidacion: siniestro.decisiones_autoliquidacion?.[0] || null
        });

    } catch (error) {
        console.error('Error en /api/siniestros/estado-autoliquidacion:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
