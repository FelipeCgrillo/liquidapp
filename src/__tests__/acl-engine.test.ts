/**
 * Tests unitarios para el Motor ACL (Auto-Claim Liquidation Score)
 * 
 * Ejecutar: npx jest src/__tests__/acl-engine.test.ts
 */

import {
    calcularACLScore,
    aplicarBloqueosDuros,
    calcularMonto,
    determinarDecision,
    ejecutarMotorACL,
    generarExplicacionSimple,
    PESOS,
    UMBRALES,
    BLOQUEOS,
} from '@/lib/acl-engine';
import type { ACLInput } from '@/lib/acl-engine';

// ─── Factories ───────────────────────────────────────────────────────────────

function crearInputBase(overrides: Partial<ACLInput> = {}): ACLInput {
    return {
        scoreFraudePromedio: 0.10,
        severidadGeneral: 'moderado',
        costoEstimadoMin: 300_000,
        costoEstimadoMax: 500_000,
        consistenciaFotos: 0.85,
        coberturaVerificada: true,
        tipoEvento: 'choque',
        hayHeridos: false,
        deducibleUF: 3,
        sumaAseguradaUF: 500,
        valorUF: 38_500,
        anioVehiculo: 2022,
        ...overrides,
    };
}

// ─── Tests de calcularACLScore ───────────────────────────────────────────────

describe('calcularACLScore', () => {
    test('caso ideal: bajo fraude, leve, barato, consistente, cubierto → score alto', () => {
        const input = crearInputBase({
            scoreFraudePromedio: 0.05,
            severidadGeneral: 'leve',
            costoEstimadoMin: 100_000,
            costoEstimadoMax: 200_000,
            consistenciaFotos: 0.95,
            coberturaVerificada: true,
        });
        const result = calcularACLScore(input);

        expect(result.aclScore).toBeGreaterThanOrEqual(UMBRALES.autoaprobado);
        expect(result.scoreFraudeInvertido).toBe(95);
        expect(result.scoreSeveridad).toBe(95); // leve → 95
        expect(result.scoreCobertura).toBe(100);
    });

    test('caso malo: alto fraude, grave, caro, sin cobertura → score bajo', () => {
        const input = crearInputBase({
            scoreFraudePromedio: 0.55,
            severidadGeneral: 'grave',
            costoEstimadoMin: 3_000_000,
            costoEstimadoMax: 5_000_000,
            consistenciaFotos: 0.30,
            coberturaVerificada: false,
        });
        const result = calcularACLScore(input);

        expect(result.aclScore).toBeLessThan(UMBRALES.revisionSenior);
        expect(result.scoreFraudeInvertido).toBe(45);
        expect(result.scoreSeveridad).toBe(35); // grave → 35
        expect(result.scoreCobertura).toBe(0);
    });

    test('los pesos suman 1.0', () => {
        const sumaPesos = Object.values(PESOS).reduce((s, p) => s + p, 0);
        expect(sumaPesos).toBeCloseTo(1.0, 5);
    });

    test('score siempre entre 0 y 100', () => {
        // Caso extremo bajo
        const inputBajo = crearInputBase({
            scoreFraudePromedio: 1.0,
            severidadGeneral: 'perdida_total',
            costoEstimadoMin: 50_000_000,
            costoEstimadoMax: 80_000_000,
            consistenciaFotos: 0,
            coberturaVerificada: false,
        });
        const resultBajo = calcularACLScore(inputBajo);
        expect(resultBajo.aclScore).toBeGreaterThanOrEqual(0);

        // Caso extremo alto
        const inputAlto = crearInputBase({
            scoreFraudePromedio: 0,
            severidadGeneral: 'leve',
            costoEstimadoMin: 10_000,
            costoEstimadoMax: 20_000,
            consistenciaFotos: 1.0,
            coberturaVerificada: true,
        });
        const resultAlto = calcularACLScore(inputAlto);
        expect(resultAlto.aclScore).toBeLessThanOrEqual(100);
    });

    test('pérdida total tiene score de severidad 10', () => {
        const input = crearInputBase({ severidadGeneral: 'perdida_total' });
        const result = calcularACLScore(input);
        expect(result.scoreSeveridad).toBe(10);
    });
});

// ─── Tests de aplicarBloqueosDuros ───────────────────────────────────────────

describe('aplicarBloqueosDuros', () => {
    test('sin bloqueos para caso normal', () => {
        const input = crearInputBase();
        const bloqueos = aplicarBloqueosDuros(input);
        expect(bloqueos).toHaveLength(0);
    });

    test('bloqueo por fraude alto (>0.60)', () => {
        const input = crearInputBase({ scoreFraudePromedio: 0.65 });
        const bloqueos = aplicarBloqueosDuros(input);
        expect(bloqueos).toHaveLength(1);
        expect(bloqueos[0]).toContain('fraude_alto');
    });

    test('bloqueo por pérdida total', () => {
        const input = crearInputBase({ severidadGeneral: 'perdida_total' });
        const bloqueos = aplicarBloqueosDuros(input);
        expect(bloqueos.some(b => b.includes('perdida_total'))).toBe(true);
    });

    test('bloqueo por costo > 150 UF', () => {
        // 150 UF × 38500 = 5,775,000 CLP
        const input = crearInputBase({
            costoEstimadoMin: 6_000_000,
            costoEstimadoMax: 7_000_000,
        });
        const bloqueos = aplicarBloqueosDuros(input);
        expect(bloqueos.some(b => b.includes('costo_excedido'))).toBe(true);
    });

    test('bloqueo por heridos', () => {
        const input = crearInputBase({ hayHeridos: true });
        const bloqueos = aplicarBloqueosDuros(input);
        expect(bloqueos.some(b => b.includes('hay_heridos'))).toBe(true);
    });

    test('bloqueo por GPS divergente (>50km)', () => {
        const input = crearInputBase({ gpsDistanciaKm: 100 });
        const bloqueos = aplicarBloqueosDuros(input);
        expect(bloqueos.some(b => b.includes('gps_divergente'))).toBe(true);
    });

    test('bloqueo por patente no coincide', () => {
        const input = crearInputBase({ patenteCoincide: false });
        const bloqueos = aplicarBloqueosDuros(input);
        expect(bloqueos.some(b => b.includes('patente_no_coincide'))).toBe(true);
    });

    test('múltiples bloqueos simultáneos', () => {
        const input = crearInputBase({
            scoreFraudePromedio: 0.70,
            hayHeridos: true,
            severidadGeneral: 'perdida_total',
        });
        const bloqueos = aplicarBloqueosDuros(input);
        expect(bloqueos.length).toBeGreaterThanOrEqual(3);
    });

    test('fraude exactamente en 0.60 NO bloquea', () => {
        const input = crearInputBase({ scoreFraudePromedio: 0.60 });
        const bloqueos = aplicarBloqueosDuros(input);
        expect(bloqueos.some(b => b.includes('fraude_alto'))).toBe(false);
    });

    test('GPS exactamente en 50km NO bloquea', () => {
        const input = crearInputBase({ gpsDistanciaKm: 50 });
        const bloqueos = aplicarBloqueosDuros(input);
        expect(bloqueos.some(b => b.includes('gps_divergente'))).toBe(false);
    });
});

// ─── Tests de calcularMonto ──────────────────────────────────────────────────

describe('calcularMonto', () => {
    test('monto básico: promedio - deducible', () => {
        const input = crearInputBase({
            costoEstimadoMin: 400_000,
            costoEstimadoMax: 600_000,
            deducibleUF: 3,
            valorUF: 38_500,
            anioVehiculo: 2024, // Sin depreciación
        });
        const result = calcularMonto(input);

        // Promedio = 500_000, deducible = 3 × 38_500 = 115_500
        // Monto final = 500_000 - 115_500 = 384_500
        expect(result.montoFinal).toBe(384_500);
        expect(result.deducibleAplicado).toBe(115_500);
        expect(result.factorDepreciacion).toBe(1.0);
    });

    test('depreciación por antigüedad: 6-10 años → 0.75', () => {
        const input = crearInputBase({
            costoEstimadoMin: 1_000_000,
            costoEstimadoMax: 1_000_000,
            deducibleUF: 0,
            valorUF: 38_500,
            anioVehiculo: new Date().getFullYear() - 8, // 8 años
        });
        const result = calcularMonto(input);

        expect(result.factorDepreciacion).toBe(0.75);
        expect(result.montoEstimadoMin).toBe(750_000);
        expect(result.montoFinal).toBe(750_000);
    });

    test('monto final nunca negativo', () => {
        const input = crearInputBase({
            costoEstimadoMin: 50_000,
            costoEstimadoMax: 50_000,
            deducibleUF: 10, // Deducible mayor al costo
            valorUF: 38_500,
        });
        const result = calcularMonto(input);

        expect(result.montoFinal).toBe(0);
    });

    test('monto limitado por suma asegurada', () => {
        const input = crearInputBase({
            costoEstimadoMin: 30_000_000,
            costoEstimadoMax: 40_000_000,
            deducibleUF: 0,
            sumaAseguradaUF: 10, // Solo 10 UF de cobertura
            valorUF: 38_500,
        });
        const result = calcularMonto(input);

        expect(result.montoFinal).toBe(385_000); // 10 × 38_500
    });

    test('auto nuevo (2 años) sin depreciación', () => {
        const input = crearInputBase({ anioVehiculo: new Date().getFullYear() - 1 });
        const result = calcularMonto(input);
        expect(result.factorDepreciacion).toBe(1.0);
    });

    test('auto viejo (15 años) depreciación 0.60', () => {
        const input = crearInputBase({ anioVehiculo: new Date().getFullYear() - 15 });
        const result = calcularMonto(input);
        expect(result.factorDepreciacion).toBe(0.60);
    });
});

// ─── Tests de determinarDecision ─────────────────────────────────────────────

describe('determinarDecision', () => {
    test('score ≥ 75 sin bloqueos → autoaprobado', () => {
        expect(determinarDecision(80, [])).toBe('autoaprobado');
        expect(determinarDecision(75, [])).toBe('autoaprobado');
    });

    test('score 50-74 sin bloqueos → revision_senior', () => {
        expect(determinarDecision(60, [])).toBe('revision_senior');
        expect(determinarDecision(50, [])).toBe('revision_senior');
    });

    test('score 25-49 sin bloqueos → escalado_humano', () => {
        expect(determinarDecision(30, [])).toBe('escalado_humano');
        expect(determinarDecision(25, [])).toBe('escalado_humano');
    });

    test('score < 25 sin bloqueos → perito_externo', () => {
        expect(determinarDecision(20, [])).toBe('perito_externo');
        expect(determinarDecision(0, [])).toBe('perito_externo');
    });

    test('con bloqueo de fraude → perito_externo siempre', () => {
        expect(determinarDecision(90, ['fraude_alto: score 70%'])).toBe('perito_externo');
    });

    test('con bloqueo de heridos → escalado_humano', () => {
        expect(determinarDecision(90, ['hay_heridos: lesiones personales'])).toBe('escalado_humano');
    });
});

// ─── Tests de generarExplicacionSimple ───────────────────────────────────────

describe('generarExplicacionSimple', () => {
    test('autoaprobado menciona monto', () => {
        const { explicacion } = generarExplicacionSimple('autoaprobado', 500_000, []);
        expect(explicacion).toContain('preaprobado');
        expect(explicacion).toContain('500');
    });

    test('NUNCA contiene terminología técnica', () => {
        const decisiones = ['autoaprobado', 'revision_senior', 'escalado_humano', 'perito_externo'] as const;

        for (const decision of decisiones) {
            const { explicacion } = generarExplicacionSimple(decision, 500_000, []);
            expect(explicacion).not.toContain('score');
            expect(explicacion).not.toContain('ACL');
            expect(explicacion).not.toContain('fraude');
            expect(explicacion).not.toContain('pipeline');
            expect(explicacion).not.toContain('threshold');
        }
    });

    test('bloqueo por heridos menciona lesiones', () => {
        const { explicacion, razonRechazo } = generarExplicacionSimple(
            'escalado_humano',
            0,
            ['hay_heridos: lesiones personales']
        );
        expect(razonRechazo).toContain('lesiones');
        expect(explicacion).toContain('revisión especial');
    });

    test('bloqueo por fraude NO dice fraude al asegurado', () => {
        const { razonRechazo } = generarExplicacionSimple(
            'perito_externo',
            0,
            ['fraude_alto: score 70%']
        );
        expect(razonRechazo).not.toContain('fraude');
        expect(razonRechazo).toContain('verificar');
    });
});

// ─── Tests de integración: ejecutarMotorACL ──────────────────────────────────

describe('ejecutarMotorACL (integración)', () => {
    test('caso estándar choque leve → autoaprobado', () => {
        const input = crearInputBase({
            scoreFraudePromedio: 0.05,
            severidadGeneral: 'leve',
            costoEstimadoMin: 150_000,
            costoEstimadoMax: 300_000,
            consistenciaFotos: 0.90,
            coberturaVerificada: true,
            anioVehiculo: 2023,
        });
        const result = ejecutarMotorACL(input);

        expect(result.decision).toBe('autoaprobado');
        expect(result.bloqueos).toHaveLength(0);
        expect(result.montoFinal).toBeGreaterThan(0);
        expect(result.motorVersion).toBe('v1.0');
        expect(result.explicacionAsegurado).toContain('preaprobado');
    });

    test('caso grave con heridos → escalado + bloqueo', () => {
        const input = crearInputBase({
            scoreFraudePromedio: 0.20,
            severidadGeneral: 'grave',
            hayHeridos: true,
        });
        const result = ejecutarMotorACL(input);

        expect(result.bloqueos.length).toBeGreaterThan(0);
        expect(result.decision).not.toBe('autoaprobado');
        expect(result.explicacionAsegurado).toContain('revisión especial');
    });

    test('caso sospechoso fraude + GPS → perito externo', () => {
        const input = crearInputBase({
            scoreFraudePromedio: 0.75,
            gpsDistanciaKm: 200,
            patenteCoincide: false,
        });
        const result = ejecutarMotorACL(input);

        expect(result.decision).toBe('perito_externo');
        expect(result.bloqueos.length).toBeGreaterThanOrEqual(2);
    });

    test('resultado incluye todos los campos requeridos', () => {
        const input = crearInputBase();
        const result = ejecutarMotorACL(input);

        expect(result).toHaveProperty('scoreFraudeInvertido');
        expect(result).toHaveProperty('scoreSeveridad');
        expect(result).toHaveProperty('scoreCostoUF');
        expect(result).toHaveProperty('scoreConsistencia');
        expect(result).toHaveProperty('scoreCobertura');
        expect(result).toHaveProperty('aclScore');
        expect(result).toHaveProperty('decision');
        expect(result).toHaveProperty('bloqueos');
        expect(result).toHaveProperty('montoFinal');
        expect(result).toHaveProperty('explicacionAsegurado');
        expect(result).toHaveProperty('motorVersion');
    });
});
