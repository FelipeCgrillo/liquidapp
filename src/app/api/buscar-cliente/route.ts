import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente Supabase con anon key (el RPC usa SECURITY DEFINER, no se necesita service_role)
function getSupabaseClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

// Valida el dígito verificador del RUT chileno
function validarRut(rut: string): boolean {
    // Normalizar: eliminar puntos y guión
    const rutLimpio = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
    if (rutLimpio.length < 2) return false;

    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1);

    if (!/^\d+$/.test(cuerpo)) return false;

    // Calcular dígito verificador
    let suma = 0;
    let multiplicador = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo[i]) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    const dvCalculado = 11 - (suma % 11);
    const dvEsperado =
        dvCalculado === 11 ? '0' : dvCalculado === 10 ? 'K' : String(dvCalculado);

    return dv === dvEsperado;
}

// Normaliza el RUT al formato "XXXXXXXX-X" (sin puntos, con guión)
function normalizarRut(rut: string): string {
    const limpio = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    return `${cuerpo}-${dv}`;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const rutParam = searchParams.get('rut');

    if (!rutParam) {
        return NextResponse.json(
            { error: 'El parámetro rut es requerido.' },
            { status: 400 }
        );
    }

    // Validar dígito verificador
    if (!validarRut(rutParam)) {
        return NextResponse.json(
            { error: 'RUT inválido. Verifique el dígito verificador.' },
            { status: 400 }
        );
    }

    const rutNormalizado = normalizarRut(rutParam);

    // Cliente con anon key: el RPC tiene SECURITY DEFINER + GRANT EXECUTE TO anon
    const supabase = getSupabaseClient();

    try {
        const { data, error } = await supabase.rpc('buscar_cliente_por_rut', {
            p_rut: rutNormalizado,
        });

        if (error) {
            console.error('❌ Error en RPC buscar_cliente_por_rut:', error);
            return NextResponse.json(
                { error: 'Error al consultar la base de datos.' },
                { status: 500 }
            );
        }

        if (!data) {
            return NextResponse.json(
                { error: 'No se encontró ningún cliente con ese RUT.' },
                { status: 404 }
            );
        }

        return NextResponse.json({ cliente: data });
    } catch (err) {
        console.error('❌ Error inesperado en buscar-cliente:', err);
        return NextResponse.json(
            { error: 'Error interno del servidor.' },
            { status: 500 }
        );
    }
}
