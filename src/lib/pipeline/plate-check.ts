/**
 * Pipeline Etapa 3: Cruce de patente OCR vs declarada
 * 
 * Compara la patente detectada por IA en las fotos
 * con la patente declarada por el asegurado.
 * 
 * Lógica de normalización:
 * - Remover guiones, espacios
 * - Convertir a mayúsculas
 * - Manejar formatos chilenos: AABB12, AA-BB-12, AA BB 12
 */

export interface PlateCheckResult {
    patentesDetectadas: string[];
    patenteDeclarada: string;
    coincide: boolean;
    confianza: number; // 0-1
    detalle: string;
    alerta: boolean;
}

/**
 * Normaliza una patente chilena para comparación.
 * Formatos: AABB12, AA-BB-12, AA BB 12, etc.
 */
export function normalizarPatente(patente: string): string {
    return patente
        .replace(/[-\s.]/g, '')  // Quitar guiones, espacios, puntos
        .toUpperCase()
        .trim();
}

/**
 * Verifica si una patente tiene formato válido chileno.
 * Formatos válidos: 4 letras + 2 dígitos (nuevo) o 2 letras + 4 dígitos (antiguo)
 */
export function esPatentechilenaValida(patente: string): boolean {
    const normalizada = normalizarPatente(patente);
    // Formato nuevo: AABB12 (4 letras + 2 dígitos)
    if (/^[A-Z]{4}\d{2}$/.test(normalizada)) return true;
    // Formato antiguo: AB1234 (2 letras + 4 dígitos)
    if (/^[A-Z]{2}\d{4}$/.test(normalizada)) return true;
    // Formato intermedio: ABC123 (3 letras + 3 dígitos)
    if (/^[A-Z]{3}\d{3}$/.test(normalizada)) return true;
    return false;
}

/**
 * Ejecuta el cruce de patente OCR vs declarada.
 * Soporta múltiples detecciones de patente (una por foto).
 */
export function verificarPatente(
    patentesDetectadas: (string | null)[],
    patenteDeclarada: string
): PlateCheckResult {
    const declaradaNorm = normalizarPatente(patenteDeclarada);

    // Filtrar nulls y normalizar
    const detectadasValidas = patentesDetectadas
        .filter((p): p is string => p !== null && p.trim().length > 0)
        .map(normalizarPatente)
        .filter(esPatentechilenaValida);

    // Sin detecciones
    if (detectadasValidas.length === 0) {
        return {
            patentesDetectadas: [],
            patenteDeclarada: declaradaNorm,
            coincide: true, // No podemos contrastar → no bloquear
            confianza: 0,
            detalle: 'No se pudo leer la patente en ninguna foto. No se puede validar.',
            alerta: false,
        };
    }

    // Verificar si alguna detectada coincide con la declarada
    const coincidencias = detectadasValidas.filter(d => d === declaradaNorm);
    const noCoincidencias = detectadasValidas.filter(d => d !== declaradaNorm);

    if (coincidencias.length > 0 && noCoincidencias.length === 0) {
        // Todas coinciden
        return {
            patentesDetectadas: detectadasValidas,
            patenteDeclarada: declaradaNorm,
            coincide: true,
            confianza: Math.min(1, coincidencias.length * 0.4 + 0.2),
            detalle: `Patente ${declaradaNorm} verificada en ${coincidencias.length} foto(s).`,
            alerta: false,
        };
    }

    if (coincidencias.length > 0 && noCoincidencias.length > 0) {
        // Coincidencia parcial — posible foto de otro vehículo (tercero)
        return {
            patentesDetectadas: detectadasValidas,
            patenteDeclarada: declaradaNorm,
            coincide: true, // Al menos una coincide
            confianza: 0.5,
            detalle: `Patente ${declaradaNorm} encontrada en ${coincidencias.length} foto(s). Patente(s) diferente(s) también detectada(s): ${noCoincidencias.join(', ')}. Podría ser el otro vehículo involucrado.`,
            alerta: true,
        };
    }

    // Ninguna coincide
    return {
        patentesDetectadas: detectadasValidas,
        patenteDeclarada: declaradaNorm,
        coincide: false,
        confianza: Math.min(1, detectadasValidas.length * 0.3 + 0.2),
        detalle: `¡ALERTA! Patente declarada ${declaradaNorm} NO encontrada en las fotos. Patente(s) detectada(s): ${detectadasValidas.join(', ')}.`,
        alerta: true,
    };
}

/**
 * Verifica consistencia entre patentes detectadas en diferentes fotos.
 * Útil para el análisis cruzado (Etapa 2).
 */
export function verificarConsistenciaPatentes(
    patentesDetectadas: (string | null)[]
): { consistente: boolean; patentes: string[]; detalle: string } {
    const validas = patentesDetectadas
        .filter((p): p is string => p !== null && p.trim().length > 0)
        .map(normalizarPatente);

    if (validas.length === 0) {
        return {
            consistente: true,
            patentes: [],
            detalle: 'No se detectaron patentes.',
        };
    }

    const unicas = Array.from(new Set(validas));

    if (unicas.length === 1) {
        return {
            consistente: true,
            patentes: unicas,
            detalle: `Patente consistente: ${unicas[0]} en ${validas.length} foto(s).`,
        };
    }

    // Más de una patente única
    if (unicas.length === 2) {
        return {
            consistente: true, // Podría ser el vehículo propio + tercero
            patentes: unicas,
            detalle: `Dos patentes diferentes detectadas: ${unicas.join(', ')}. Posible vehículo propio + tercero.`,
        };
    }

    return {
        consistente: false,
        patentes: unicas,
        detalle: `${unicas.length} patentes diferentes detectadas: ${unicas.join(', ')}. Posible mezcla de fotos de diferentes eventos.`,
    };
}
