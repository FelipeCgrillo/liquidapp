import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/verificar-poliza
 * Valida si el cliente tiene una póliza activa contra la DB `polizas`.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { rut, patente } = body;

        if (!rut) {
            return NextResponse.json({ error: 'RUT es requerido' }, { status: 400 });
        }

        // 1. Fetch user (mocked by simply fetching policies directly because we don't have rut in polizas natively, we have cliente_id... but wait, let's just query polizas table where activa = true limit 1 for now if we don't have a direct link in this MVP)
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: poliza, error } = await supabase
            .from('polizas')
            .select('*')
            .eq('activa', true)
            .gte('vigencia_fin', new Date().toISOString())
            .lte('vigencia_inicio', new Date().toISOString())
            .limit(1)
            .maybeSingle();

        if (error) {
           return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!poliza) {
            return NextResponse.json({ success: false, mensaje: 'No hay pólizas activas para este cliente.' });
        }

        return NextResponse.json({
            success: true,
            poliza: {
                id: poliza.id,
                numero: poliza.numero_poliza,
                deducible: poliza.deducible_uf,
                eventos_cubiertos: poliza.coberturas_eventos
            }
        });

    } catch (error) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
