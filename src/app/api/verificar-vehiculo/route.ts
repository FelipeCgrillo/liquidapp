import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/verificar-vehiculo
 * Endpoint mock para validar patentes (ej: contra RNVM).
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { patente } = body;

        if (!patente) {
            return NextResponse.json({ error: 'Patente es requerida' }, { status: 400 });
        }

        // Mock Logic: Rechazar si empieza con 'XXX'
        if (patente.toUpperCase().startsWith('XXX')) {
            return NextResponse.json({
                success: false,
                vehiculo: null,
                motivo: 'Patente sin requerimientos en registro nacional.'
            });
        }

        return NextResponse.json({
            success: true,
            vehiculo: {
                patente: patente.toUpperCase(),
                encargo_robo: false,
                marca: 'MockMarca',
                modelo: 'MockModelo',
                anio: 2024
            }
        });

    } catch (error) {
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
