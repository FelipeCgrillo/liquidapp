/**
 * Pipeline IA Orquestador
 * 
 * Coordina las 4 etapas del pipeline de análisis:
 * 
 * Etapa 0: Metadata (sin IA) — SHA-256, tamaño, GPS
 * Etapa 1: Visión ampliada (Llama 4 Scout) — daños + OCR patente + tipo impacto
 * Etapa 2: Análisis cruzado (Llama 4 Maverick) — consistencia entre fotos
 * Etapa 3: Cruce patente — OCR vs declarada
 * 
 * Cada etapa es independiente y puede fallar sin romper las demás.
 */

import OpenAI from 'openai';
import { extraerMetadata, validarProximidadGPS, type MetadataResult } from './metadata';
import { analizarVisionAmpliada, type VisionAmpliadaResult } from './vision';
import { analizarCruzado, type AnalisisCruzadoResult } from './cross-analysis';
import { verificarPatente, verificarConsistenciaPatentes, type PlateCheckResult } from './plate-check';

export interface PipelineInput {
    imagenUrl: string;
    evidenciaId: string;
    siniestroId: string;
    // Metadata opcionales
    gpsLat?: number;
    gpsLng?: number;
    fechaCaptura?: string;
    tamanoBytes?: number;
    tipoMime?: string;
}

export interface PipelineEtapa0Result {
    metadata: MetadataResult;
    completada: boolean;
}

export interface PipelineEtapa1Result {
    vision: VisionAmpliadaResult;
    completada: boolean;
    tokensUsados?: number;
}

export interface PipelineCompleteResult {
    etapa0: PipelineEtapa0Result;
    etapa1: PipelineEtapa1Result;
    errores: string[];
}

/**
 * Ejecuta Etapa 0 + Etapa 1 para una sola evidencia.
 * Se llama por cada foto individual.
 */
export async function ejecutarPipelineIndividual(
    groqClient: OpenAI,
    input: PipelineInput
): Promise<PipelineCompleteResult> {
    const errores: string[] = [];

    // ─── Etapa 0: Metadata ───────────────────────────────────────────
    let metadata: MetadataResult;
    try {
        metadata = await extraerMetadata(input.imagenUrl, {
            gpsLat: input.gpsLat,
            gpsLng: input.gpsLng,
            fechaCaptura: input.fechaCaptura,
            tamanoBytes: input.tamanoBytes,
            tipoMime: input.tipoMime,
        });
    } catch (error) {
        errores.push(`Etapa 0 falló: ${error instanceof Error ? error.message : String(error)}`);
        metadata = {
            sha256: '',
            tamanoBytes: 0,
            tipoMime: '',
            esImagenValida: false,
            errores: ['Error en extracción de metadata'],
            alertas_fraude_exif: ['Falla al evaluar metadata. No hay exifs disponibles.'],
        };
    }

    // ─── Etapa 1: Visión ampliada ────────────────────────────────────
    let vision: VisionAmpliadaResult;
    let tokensUsados: number | undefined;
    try {
        const result = await analizarVisionAmpliada(groqClient, input.imagenUrl);
        vision = result;
        tokensUsados = (result as VisionAmpliadaResult & { _tokens?: number })._tokens;
    } catch (error) {
        errores.push(`Etapa 1 falló: ${error instanceof Error ? error.message : String(error)}`);
        vision = {
            antifraude: { score: 0.5, nivel: 'medio', indicadores: ['Error en análisis'], justificacion: 'Análisis no disponible' },
            triage: { severidad: 'moderado', partes_danadas: [], descripcion: 'No se pudo analizar' },
            costos: { min: 0, max: 0, desglose: [] },
            deteccion_vehiculo: {
                patente_detectada: null,
                confianza_patente: 0,
                tipo_impacto: 'frontal',
                airbags_desplegados: false,
                deformacion_estructural: false,
                color_vehiculo: null,
                marca_modelo_estimado: null,
            },
        };
    }

    return {
        etapa0: { metadata, completada: metadata.esImagenValida },
        etapa1: { vision, completada: !errores.some(e => e.startsWith('Etapa 1')), tokensUsados },
        errores,
    };
}

export interface PipelineGlobalResult {
    cruzado: AnalisisCruzadoResult;
    patente: PlateCheckResult;
    gpsDistanciaMaxKm?: number;
    errores: string[];
}

/**
 * Ejecuta Etapa 2 + Etapa 3 para el siniestro completo.
 * Se llama DESPUÉS de que todas las fotos han sido analizadas individualmente.
 */
export async function ejecutarPipelineGlobal(
    groqClient: OpenAI,
    imagenesUrls: string[],
    patentesDetectadas: (string | null)[],
    patenteDeclarada: string,
    options?: {
        ubicacionDeclarada?: { lat: number; lng: number };
        ubicacionesFotos?: { lat: number; lng: number }[];
    }
): Promise<PipelineGlobalResult> {
    const errores: string[] = [];

    // ─── Etapa 2: Análisis cruzado ───────────────────────────────────
    let cruzado: AnalisisCruzadoResult;
    try {
        cruzado = await analizarCruzado(groqClient, imagenesUrls);
    } catch (error) {
        errores.push(`Etapa 2 falló: ${error instanceof Error ? error.message : String(error)}`);
        cruzado = {
            consistencia_score: 0.70,
            mismo_vehiculo: true,
            patentes_detectadas: [],
            patentes_coinciden: true,
            inconsistencias: ['Análisis cruzado no disponible'],
            veredicto: 'No se pudo completar el análisis cruzado.',
            fotos_sospechosas: [],
        };
    }

    // ─── Etapa 3: Cruce patente ──────────────────────────────────────
    const patente = verificarPatente(patentesDetectadas, patenteDeclarada);

    // ─── Bonus: Calcular distancia GPS máxima ────────────────────────
    let gpsDistanciaMaxKm: number | undefined;
    if (options?.ubicacionDeclarada && options?.ubicacionesFotos?.length) {
        const distancias = options.ubicacionesFotos.map(foto =>
            validarProximidadGPS(
                foto.lat, foto.lng,
                options.ubicacionDeclarada!.lat, options.ubicacionDeclarada!.lng,
                50 // umbral en km
            )
        );
        gpsDistanciaMaxKm = Math.max(...distancias.map(d => d.distanciaKm));
    }

    return {
        cruzado,
        patente,
        gpsDistanciaMaxKm,
        errores,
    };
}

// Re-exportar tipos
export type { MetadataResult, VisionAmpliadaResult, AnalisisCruzadoResult, PlateCheckResult };
