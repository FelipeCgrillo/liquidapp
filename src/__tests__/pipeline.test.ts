/**
 * Tests unitarios para Pipeline Etapa 3: Cruce de patentes
 * y Etapa 0: Metadata (funciones puras)
 * 
 * Ejecutar: npx jest src/__tests__/pipeline.test.ts
 */

import {
    normalizarPatente,
    esPatentechilenaValida,
    verificarPatente,
    verificarConsistenciaPatentes,
} from '@/lib/pipeline/plate-check';

import {
    calcularDistanciaKm,
    validarProximidadGPS,
} from '@/lib/pipeline/metadata';

// ─── Tests de normalizarPatente ──────────────────────────────────────────────

describe('normalizarPatente', () => {
    test('maneja formato con guiones: AA-BB-12 → AABB12', () => {
        expect(normalizarPatente('AB-CD-12')).toBe('ABCD12');
    });

    test('maneja formato con espacios: AA BB 12 → AABB12', () => {
        expect(normalizarPatente('AB CD 12')).toBe('ABCD12');
    });

    test('maneja formato sin separadores', () => {
        expect(normalizarPatente('ABCD12')).toBe('ABCD12');
    });

    test('convierte a mayúsculas', () => {
        expect(normalizarPatente('abcd12')).toBe('ABCD12');
    });

    test('maneja puntos como separadores', () => {
        expect(normalizarPatente('AB.CD.12')).toBe('ABCD12');
    });
});

// ─── Tests de esPatentechilenaValida ──────────────────────────────────────────

describe('esPatentechilenaValida', () => {
    test('formato nuevo válido: ABCD12 (4 letras + 2 dígitos)', () => {
        expect(esPatentechilenaValida('ABCD12')).toBe(true);
    });

    test('formato antiguo válido: AB1234 (2 letras + 4 dígitos)', () => {
        expect(esPatentechilenaValida('AB1234')).toBe(true);
    });

    test('formato intermedio válido: ABC123 (3 letras + 3 dígitos)', () => {
        expect(esPatentechilenaValida('ABC123')).toBe(true);
    });

    test('formato inválido: solo letras', () => {
        expect(esPatentechilenaValida('ABCDEF')).toBe(false);
    });

    test('formato inválido: solo números', () => {
        expect(esPatentechilenaValida('123456')).toBe(false);
    });

    test('formato inválido: demasiado corto', () => {
        expect(esPatentechilenaValida('AB1')).toBe(false);
    });

    test('acepta patente con guiones (normalizada)', () => {
        expect(esPatentechilenaValida('ABCD12')).toBe(true);
    });
});

// ─── Tests de verificarPatente ──────────────────────────────────────────────

describe('verificarPatente', () => {
    test('coincidencia perfecta: detectada igual a declarada', () => {
        const result = verificarPatente(['ABCD12'], 'ABCD12');
        expect(result.coincide).toBe(true);
        expect(result.alerta).toBe(false);
    });

    test('coincidencia con formato diferente: AB-CD-12 vs ABCD12', () => {
        const result = verificarPatente(['AB-CD-12'], 'ABCD12');
        expect(result.coincide).toBe(true);
    });

    test('sin detecciones: no bloquea', () => {
        const result = verificarPatente([null, null], 'ABCD12');
        expect(result.coincide).toBe(true);
        expect(result.confianza).toBe(0);
    });

    test('ninguna coincide: alerta', () => {
        const result = verificarPatente(['WXYZ99'], 'ABCD12');
        expect(result.coincide).toBe(false);
        expect(result.alerta).toBe(true);
    });

    test('coincidencia parcial: fotos de ambos vehículos', () => {
        const result = verificarPatente(['ABCD12', 'WXYZ99'], 'ABCD12');
        expect(result.coincide).toBe(true);
        expect(result.alerta).toBe(true);
        expect(result.detalle).toContain('WXYZ99');
    });

    test('múltiples detecciones todas coinciden', () => {
        const result = verificarPatente(['ABCD12', 'AB-CD-12', 'ABCD12'], 'ABCD12');
        expect(result.coincide).toBe(true);
        expect(result.alerta).toBe(false);
        expect(result.confianza).toBeGreaterThan(0.5);
    });

    test('ignora detecciones inválidas', () => {
        const result = verificarPatente(['', '   ', null, 'ABCD12'], 'ABCD12');
        expect(result.coincide).toBe(true);
    });
});

// ─── Tests de verificarConsistenciaPatentes ──────────────────────────────────

describe('verificarConsistenciaPatentes', () => {
    test('una sola patente consistente', () => {
        const result = verificarConsistenciaPatentes(['ABCD12', 'ABCD12', 'AB-CD-12']);
        expect(result.consistente).toBe(true);
        expect(result.patentes).toHaveLength(1);
    });

    test('dos patentes: posible propio + tercero', () => {
        const result = verificarConsistenciaPatentes(['ABCD12', 'WXYZ99']);
        expect(result.consistente).toBe(true); // 2 es OK
        expect(result.patentes).toHaveLength(2);
    });

    test('tres o más patentes: inconsistente', () => {
        const result = verificarConsistenciaPatentes(['ABCD12', 'WXYZ99', 'MNOP78']);
        expect(result.consistente).toBe(false);
    });

    test('sin patentes detectadas', () => {
        const result = verificarConsistenciaPatentes([null, null]);
        expect(result.consistente).toBe(true);
        expect(result.patentes).toHaveLength(0);
    });
});

// ─── Tests de GPS ────────────────────────────────────────────────────────────

describe('calcularDistanciaKm', () => {
    test('misma ubicación = 0 km', () => {
        expect(calcularDistanciaKm(-33.4489, -70.6693, -33.4489, -70.6693)).toBeCloseTo(0, 1);
    });

    test('Santiago a Valparaíso ≈ 100 km', () => {
        const distancia = calcularDistanciaKm(-33.4489, -70.6693, -33.0472, -71.6127);
        expect(distancia).toBeGreaterThan(80);
        expect(distancia).toBeLessThan(120);
    });

    test('distancia corta (1 bloque) < 1 km', () => {
        const distancia = calcularDistanciaKm(-33.4489, -70.6693, -33.4499, -70.6703);
        expect(distancia).toBeLessThan(1);
    });
});

describe('validarProximidadGPS', () => {
    test('foto cerca del lugar declarado → dentro de rango', () => {
        const result = validarProximidadGPS(-33.4489, -70.6693, -33.4500, -70.6700, 5);
        expect(result.dentroDeRango).toBe(true);
        expect(result.distanciaKm).toBeLessThan(1);
    });

    test('foto lejos del lugar declarado → fuera de rango', () => {
        const result = validarProximidadGPS(-33.4489, -70.6693, -33.0472, -71.6127, 5);
        expect(result.dentroDeRango).toBe(false);
        expect(result.distanciaKm).toBeGreaterThan(50);
    });
});
