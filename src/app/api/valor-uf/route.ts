import { NextResponse } from 'next/server';

/**
 * GET /api/valor-uf
 * 
 * Obtiene el valor actual de la UF (Unidad de Fomento) desde la API de mindicador.cl
 * Cache en memoria de 24h + fallback a último valor conocido.
 */

// Cache en memoria
let cachedUF: { valor: number; fecha: string; cachedAt: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

// Fallback hardcoded (actualizar periódicamente)
const FALLBACK_UF = 38_847.46; // Valor aproximado marzo 2026

export async function GET() {
    try {
        // Check cache
        if (cachedUF && Date.now() - cachedUF.cachedAt < CACHE_TTL_MS) {
            return NextResponse.json({
                valor: cachedUF.valor,
                fecha: cachedUF.fecha,
                fuente: 'cache',
            });
        }

        // Fetch desde mindicador.cl (API pública chilena)
        const response = await fetch('https://mindicador.cl/api/uf', {
            next: { revalidate: 86400 }, // Cache de Next.js: 24h
        });

        if (!response.ok) {
            throw new Error(`mindicador.cl respondió ${response.status}`);
        }

        const data = await response.json();
        
        if (data.serie && data.serie.length > 0) {
            const ultimo = data.serie[0];
            const valor = ultimo.valor;
            const fecha = ultimo.fecha;

            // Guardar en cache
            cachedUF = {
                valor,
                fecha,
                cachedAt: Date.now(),
            };

            return NextResponse.json({
                valor,
                fecha,
                fuente: 'mindicador.cl',
            });
        }

        throw new Error('Respuesta de mindicador.cl sin datos');

    } catch (error) {
        console.warn('⚠️ Error obteniendo UF:', error);

        // Usar cache expirado si existe
        if (cachedUF) {
            return NextResponse.json({
                valor: cachedUF.valor,
                fecha: cachedUF.fecha,
                fuente: 'cache_expirado',
            });
        }

        // Fallback hardcoded
        return NextResponse.json({
            valor: FALLBACK_UF,
            fecha: new Date().toISOString(),
            fuente: 'fallback',
        });
    }
}
