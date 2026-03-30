/**
 * Motor ACL — Auto-Claim Liquidation Score
 * Lógica pura del motor de decisión para autoliquidación de siniestros.
 * 
 * Fórmula:
 *   ACL = 40% × fraude_invertido
 *       + 25% × score_severidad
 *       + 20% × score_costo_en_UF
 *       + 10% × consistencia_entre_fotos
 *       +  5% × cobertura_verificada
 * 
 * Decisiones:
 *   ≥ 75  → autoaprobado (pago directo)
 *   50-74 → revision_senior (liquidador senior revisa)
 *   25-49 → escalado_humano (equipo completo)
 *   < 25  → perito_externo (inspección presencial)
 * 
 * Bloqueos duros (anulan cualquier score):
 *   - Fraude > 0.60
 *   - Pérdida total
 *   - Costo > 150 UF
 *   - Hay heridos
 *   - Metadata GPS diverge > 50km
 */

import type { DecisionACL, SeveridadDano, TipoEvento } from '@/types';

// ─── Tipos de entrada ────────────────────────────────────────────────────────

export interface ACLInput {
    // Scores de análisis IA (promedio de todas las evidencias)
    scoreFraudePromedio: number;      // 0-1 (0 = sin fraude, 1 = fraude seguro)
    severidadGeneral: SeveridadDano;
    costoEstimadoMin: number;         // CLP
    costoEstimadoMax: number;         // CLP
    
    // Consistencia (¿las fotos coinciden entre sí?)
    consistenciaFotos: number;        // 0-1 (1 = perfecta consistencia)
    
    // Cobertura
    coberturaVerificada: boolean;     // ¿Póliza válida y cubre este evento?
    tipoEvento: TipoEvento;
    
    // Datos del siniestro
    hayHeridos: boolean;
    
    // Póliza
    deducibleUF: number;              // UF del deducible
    sumaAseguradaUF: number;          // UF máximo de cobertura
    
    // Valor UF del día
    valorUF: number;                  // CLP por 1 UF
    
    // Metadata
    gpsDistanciaKm?: number;          // Distancia entre foto y ubicación declarada
    patenteCoincide?: boolean;        // Patente OCR coincide con la declarada
    anioVehiculo?: number;            // Para calcular depreciación
}

export interface ACLResult {
    // Scores por dimensión (0-100)
    scoreFraudeInvertido: number;
    scoreSeveridad: number;
    scoreCostoUF: number;
    scoreConsistencia: number;
    scoreCobertura: number;
    
    // Score final
    aclScore: number;
    decision: DecisionACL;
    bloqueos: string[];
    
    // Monto calculado
    montoEstimadoMin: number;
    montoEstimadoMax: number;
    montoFinal: number;
    deducibleAplicado: number;
    factorDepreciacion: number;
    
    // Explicación
    explicacionAsegurado: string;
    razonRechazo?: string;
    
    // Metadata
    motorVersion: string;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

export const ACL_VERSION = 'v1.0';

const PESOS = {
    fraude: 0.40,
    severidad: 0.25,
    costo: 0.20,
    consistencia: 0.10,
    cobertura: 0.05,
} as const;

const UMBRALES = {
    autoaprobado: 75,
    revisionSenior: 50,
    escaladoHumano: 25,
    // < 25 → perito_externo
} as const;

const BLOQUEOS = {
    fraudeAlto: 0.60,
    costoMaximoUF: 150,
    gpsMaxDistanciaKm: 50,
} as const;

// ─── Funciones puras ─────────────────────────────────────────────────────────

/**
 * Calcula el score ACL (0-100) a partir de los inputs.
 * Función pura, sin side effects.
 */
export function calcularACLScore(input: ACLInput): {
    scoreFraudeInvertido: number;
    scoreSeveridad: number;
    scoreCostoUF: number;
    scoreConsistencia: number;
    scoreCobertura: number;
    aclScore: number;
} {
    // 1) Fraude invertido (0 = fraude seguro → 0 pts, 0 = sin fraude → 100 pts)
    const scoreFraudeInvertido = Math.round((1 - input.scoreFraudePromedio) * 100);
    
    // 2) Severidad → score (leve → alto score, pérdida total → bajo score)
    const SEVERIDAD_MAP: Record<SeveridadDano, number> = {
        leve: 95,
        moderado: 70,
        grave: 35,
        perdida_total: 10,
    };
    const scoreSeveridad = SEVERIDAD_MAP[input.severidadGeneral];
    
    // 3) Costo en UF → score (menor costo = mayor score)
    const costoPromedioClp = (input.costoEstimadoMin + input.costoEstimadoMax) / 2;
    const costoEnUF = costoPromedioClp / input.valorUF;
    // Curva logarítmica: 0 UF → 100, 50 UF → 65, 150 UF → 20, 500+ UF → 5
    const scoreCostoUF = Math.round(
        Math.max(5, Math.min(100, 100 - (Math.log(costoEnUF + 1) / Math.log(500)) * 95))
    );
    
    // 4) Consistencia entre fotos (ya viene como 0-1 desde análisis cruzado)
    const scoreConsistencia = Math.round(input.consistenciaFotos * 100);
    
    // 5) Cobertura verificada (binario)
    const scoreCobertura = input.coberturaVerificada ? 100 : 0;
    
    // Score ponderado
    const aclScore = Math.round(
        scoreFraudeInvertido * PESOS.fraude +
        scoreSeveridad * PESOS.severidad +
        scoreCostoUF * PESOS.costo +
        scoreConsistencia * PESOS.consistencia +
        scoreCobertura * PESOS.cobertura
    );
    
    return {
        scoreFraudeInvertido,
        scoreSeveridad,
        scoreCostoUF,
        scoreConsistencia,
        scoreCobertura,
        aclScore,
    };
}

/**
 * Aplica bloqueos duros que anulan el score ACL.
 * Retorna lista de razones de bloqueo (vacía si no hay bloqueos).
 */
export function aplicarBloqueosDuros(input: ACLInput): string[] {
    const bloqueos: string[] = [];
    
    if (input.scoreFraudePromedio > BLOQUEOS.fraudeAlto) {
        bloqueos.push(`fraude_alto: score ${(input.scoreFraudePromedio * 100).toFixed(0)}% supera umbral de ${BLOQUEOS.fraudeAlto * 100}%`);
    }
    
    if (input.severidadGeneral === 'perdida_total') {
        bloqueos.push('perdida_total: daño calificado como pérdida total requiere inspección presencial');
    }
    
    const costoPromedioClp = (input.costoEstimadoMin + input.costoEstimadoMax) / 2;
    const costoEnUF = costoPromedioClp / input.valorUF;
    if (costoEnUF > BLOQUEOS.costoMaximoUF) {
        bloqueos.push(`costo_excedido: ${costoEnUF.toFixed(1)} UF supera el límite de ${BLOQUEOS.costoMaximoUF} UF`);
    }
    
    if (input.hayHeridos) {
        bloqueos.push('hay_heridos: siniestro con lesiones personales requiere liquidador presencial');
    }
    
    if (input.gpsDistanciaKm !== undefined && input.gpsDistanciaKm > BLOQUEOS.gpsMaxDistanciaKm) {
        bloqueos.push(`gps_divergente: distancia de ${input.gpsDistanciaKm.toFixed(0)}km entre foto y ubicación declarada`);
    }
    
    if (input.patenteCoincide === false) {
        bloqueos.push('patente_no_coincide: la patente detectada en las fotos no coincide con la declarada');
    }
    
    return bloqueos;
}

/**
 * Calcula el monto final de indemnización.
 * Fórmula: promedio(min,max) − deducible × factor_depreciación
 */
export function calcularMonto(input: ACLInput): {
    montoEstimadoMin: number;
    montoEstimadoMax: number;
    montoFinal: number;
    deducibleAplicado: number;
    factorDepreciacion: number;
} {
    const deducibleClp = input.deducibleUF * input.valorUF;
    
    // Factor de depreciación según antigüedad del vehículo
    const anioActual = new Date().getFullYear();
    const antiguedad = input.anioVehiculo
        ? Math.max(0, anioActual - input.anioVehiculo)
        : 5; // Default 5 años si no se conoce
    
    // Depreciación: 0-2 años → 1.0, 3-5 → 0.90, 6-10 → 0.75, 11+ → 0.60
    let factorDepreciacion: number;
    if (antiguedad <= 2) factorDepreciacion = 1.0;
    else if (antiguedad <= 5) factorDepreciacion = 0.90;
    else if (antiguedad <= 10) factorDepreciacion = 0.75;
    else factorDepreciacion = 0.60;
    
    // Monto con depreciación
    const montoEstimadoMin = Math.round(input.costoEstimadoMin * factorDepreciacion);
    const montoEstimadoMax = Math.round(input.costoEstimadoMax * factorDepreciacion);
    
    // Monto final: promedio - deducible, nunca menor a 0
    const promedio = (montoEstimadoMin + montoEstimadoMax) / 2;
    const montoFinal = Math.max(0, Math.round(promedio - deducibleClp));
    
    // Tope por suma asegurada
    const topeClp = input.sumaAseguradaUF * input.valorUF;
    
    return {
        montoEstimadoMin,
        montoEstimadoMax,
        montoFinal: Math.min(montoFinal, topeClp),
        deducibleAplicado: deducibleClp,
        factorDepreciacion,
    };
}

/**
 * Genera explicación en lenguaje simple para el asegurado.
 * NUNCA muestra scores, porcentajes ni terminología técnica.
 */
export function generarExplicacionSimple(
    decision: DecisionACL,
    montoFinal: number,
    bloqueos: string[]
): { explicacion: string; razonRechazo?: string } {
    const formatCLP = (n: number) =>
        n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
    
    if (bloqueos.length > 0) {
        // Determinar razón principal en lenguaje simple
        let razonSimple: string;
        if (bloqueos.some(b => b.startsWith('hay_heridos'))) {
            razonSimple = 'Tu caso involucra lesiones personales, por lo que un liquidador especializado debe revisarlo presencialmente para asegurar una evaluación completa.';
        } else if (bloqueos.some(b => b.startsWith('perdida_total'))) {
            razonSimple = 'El nivel de daño detectado requiere una inspección presencial para determinar la mejor solución para ti.';
        } else if (bloqueos.some(b => b.startsWith('fraude_alto'))) {
            razonSimple = 'Necesitamos verificar algunos detalles adicionales. Un ejecutivo te contactará pronto.';
        } else if (bloqueos.some(b => b.startsWith('costo_excedido'))) {
            razonSimple = 'El monto estimado de reparación requiere una revisión presencial por un liquidador autorizado.';
        } else if (bloqueos.some(b => b.startsWith('gps_divergente'))) {
            razonSimple = 'Detectamos una diferencia en la ubicación. Un ejecutivo te contactará para aclarar los detalles.';
        } else {
            razonSimple = 'Tu caso requiere una revisión adicional. Te contactaremos pronto.';
        }
        
        return {
            explicacion: `Tu caso ha sido recibido y necesita una revisión especial. ${razonSimple}`,
            razonRechazo: razonSimple,
        };
    }
    
    switch (decision) {
        case 'autoaprobado':
            return {
                explicacion: `¡Buenas noticias! Tu caso fue preaprobado. La indemnización estimada es de ${formatCLP(montoFinal)}. Un liquidador autorizado confirmará el monto final y procesaremos tu pago.`,
            };
        case 'revision_senior':
            return {
                explicacion: `Tu caso fue recibido correctamente. Está siendo revisado por un liquidador autorizado para confirmar los detalles. Te notificaremos el resultado pronto.`,
            };
        case 'escalado_humano':
            return {
                explicacion: `Tu caso fue recibido y está siendo evaluado por nuestro equipo. Necesitamos revisar algunos detalles antes de darte una respuesta. Te contactaremos dentro de las próximas horas.`,
            };
        case 'perito_externo':
            return {
                explicacion: `Tu caso fue recibido. Dado el tipo de daño, necesitamos coordinar una inspección presencial. Un liquidador te contactará para agendar una visita.`,
            };
        default:
            return {
                explicacion: 'Tu caso fue recibido correctamente. Te notificaremos el resultado pronto.',
            };
    }
}

/**
 * Determina la decisión basada en el score ACL y bloqueos.
 */
export function determinarDecision(aclScore: number, bloqueos: string[]): DecisionACL {
    // Si hay bloqueos duros, siempre escalar
    if (bloqueos.length > 0) {
        // Bloqueos de fraude/GPS → perito externo
        if (bloqueos.some(b => b.startsWith('fraude_alto') || b.startsWith('gps_divergente') || b.startsWith('patente_no_coincide'))) {
            return 'perito_externo';
        }
        // Otros bloqueos → escalado humano
        return 'escalado_humano';
    }
    
    if (aclScore >= UMBRALES.autoaprobado) return 'autoaprobado';
    if (aclScore >= UMBRALES.revisionSenior) return 'revision_senior';
    if (aclScore >= UMBRALES.escaladoHumano) return 'escalado_humano';
    return 'perito_externo';
}

/**
 * Función principal: ejecuta el motor ACL completo.
 * Combina cálculo de score, bloqueos, monto y explicación.
 */
export function ejecutarMotorACL(input: ACLInput): ACLResult {
    // 1) Calcular scores
    const scores = calcularACLScore(input);
    
    // 2) Verificar bloqueos duros
    const bloqueos = aplicarBloqueosDuros(input);
    
    // 3) Determinar decisión
    const decision = determinarDecision(scores.aclScore, bloqueos);
    
    // 4) Calcular monto
    const monto = calcularMonto(input);
    
    // 5) Generar explicación
    const { explicacion, razonRechazo } = generarExplicacionSimple(
        decision,
        monto.montoFinal,
        bloqueos
    );
    
    return {
        ...scores,
        decision,
        bloqueos,
        ...monto,
        explicacionAsegurado: explicacion,
        razonRechazo,
        motorVersion: ACL_VERSION,
    };
}

// ─── Exportar constantes para tests ──────────────────────────────────────────
export { PESOS, UMBRALES, BLOQUEOS };
