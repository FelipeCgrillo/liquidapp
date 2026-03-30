import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ejecutarMotorACL, ACL_VERSION } from '@/lib/acl-engine';
import type { ACLInput } from '@/lib/acl-engine';
import type { SeveridadDano, TipoEvento } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/autoliquidar
 * 
 * Ejecuta el motor ACL para un siniestro.
 * Body: { siniestro_id: string, dry_run?: boolean }
 * 
 * Pasos:
 * 1. Obtener siniestro + análisis IA agregados
 * 2. Verificar póliza
 * 3. Obtener valor UF del día
 * 4. Ejecutar motor ACL
 * 5. Guardar decisión en `decisiones_autoliquidacion`
 * 6. Actualizar estado del siniestro
 * 7. Retornar resultado
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { siniestro_id, dry_run = true } = body;

        if (!siniestro_id) {
            return NextResponse.json(
                { error: 'siniestro_id es requerido' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // ─── 1. Obtener siniestro completo ─────────────────────────────────
        const { data: siniestro, error: errSiniestro } = await supabase
            .from('siniestros')
            .select(`
                *,
                evidencias (
                    id,
                    analisis_ia (*)
                )
            `)
            .eq('id', siniestro_id)
            .single();

        if (errSiniestro || !siniestro) {
            return NextResponse.json(
                { error: 'Siniestro no encontrado', detail: errSiniestro?.message },
                { status: 404 }
            );
        }

        // ─── 2. Agregar análisis IA ────────────────────────────────────────
        const analisisArray = siniestro.evidencias
            ?.flatMap((ev: { analisis_ia: unknown[] }) => ev.analisis_ia || []) || [];

        if (analisisArray.length === 0) {
            return NextResponse.json(
                { error: 'No hay análisis de IA disponibles para este siniestro. Se requiere al menos una foto analizada.' },
                { status: 422 }
            );
        }

        // Promedios
        const scoreFraudePromedio = analisisArray.reduce(
            (sum: number, a: { score_fraude: number }) => sum + (a.score_fraude || 0), 0
        ) / analisisArray.length;

        const costoEstimadoMin = analisisArray.reduce(
            (sum: number, a: { costo_estimado_min: number }) => sum + (a.costo_estimado_min || 0), 0
        );
        const costoEstimadoMax = analisisArray.reduce(
            (sum: number, a: { costo_estimado_max: number }) => sum + (a.costo_estimado_max || 0), 0
        );

        // Severidad: tomar la peor
        const severidades: SeveridadDano[] = analisisArray.map(
            (a: { severidad: SeveridadDano }) => a.severidad
        );
        const SEVERIDAD_PESO: Record<SeveridadDano, number> = {
            leve: 1, moderado: 2, grave: 3, perdida_total: 4,
        };
        const severidadGeneral = severidades.reduce(
            (peor, s) => SEVERIDAD_PESO[s] > SEVERIDAD_PESO[peor] ? s : peor,
            'leve' as SeveridadDano
        );

        // Consistencia: placeholder — Sprint 3 mejorará con análisis cruzado
        const consistenciaFotos = analisisArray.length >= 2 ? 0.80 : 0.60;

        // Patente OCR
        const patentesDetectadas = analisisArray
            .map((a: { patente_detectada?: string }) => a.patente_detectada)
            .filter(Boolean);
        const patenteCoincide = patentesDetectadas.length > 0
            ? patentesDetectadas.some((p: string) =>
                p.replace(/[-\s]/g, '').toUpperCase() === siniestro.patente?.replace(/[-\s]/g, '').toUpperCase()
            )
            : undefined; // No se pudo determinar

        // ─── 3. Verificar póliza ──────────────────────────────────────────
        let coberturaVerificada = false;
        let deducibleUF = 3; // Default
        let sumaAseguradaUF = 500; // Default

        if (siniestro.rut_asegurado) {
            const { data: poliza } = await supabase
                .from('polizas')
                .select('*')
                .eq('activa', true)
                .gte('vigencia_fin', new Date().toISOString())
                .lte('vigencia_inicio', new Date().toISOString())
                .limit(1)
                .maybeSingle();

            if (poliza) {
                coberturaVerificada = true;
                deducibleUF = poliza.deducible_uf || 3;
                sumaAseguradaUF = poliza.suma_asegurada_uf || 500;

                // Verificar que el tipo de evento está cubierto
                const tipoEvento = (siniestro.tipo_evento || 'choque') as TipoEvento;
                if (poliza.coberturas_eventos && !poliza.coberturas_eventos.includes(tipoEvento)) {
                    coberturaVerificada = false;
                }
            }
        }

        // ─── 4. Obtener valor UF ──────────────────────────────────────────
        let valorUF = 38500; // Fallback
        try {
            const ufResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/valor-uf`);
            if (ufResponse.ok) {
                const ufData = await ufResponse.json();
                valorUF = ufData.valor || valorUF;
            }
        } catch {
            console.warn('⚠️ No se pudo obtener valor UF. Usando fallback:', valorUF);
        }

        // ─── 5. Ejecutar motor ACL ────────────────────────────────────────
        const aclInput: ACLInput = {
            scoreFraudePromedio,
            severidadGeneral,
            costoEstimadoMin,
            costoEstimadoMax,
            consistenciaFotos,
            coberturaVerificada,
            tipoEvento: (siniestro.tipo_evento || 'choque') as TipoEvento,
            hayHeridos: siniestro.hay_heridos || false,
            deducibleUF,
            sumaAseguradaUF,
            valorUF,
            patenteCoincide,
            anioVehiculo: siniestro.anio,
        };

        const resultado = ejecutarMotorACL(aclInput);

        // ─── 6. Guardar decisión ──────────────────────────────────────────
        const { data: decision, error: errDecision } = await supabase
            .from('decisiones_autoliquidacion')
            .insert({
                siniestro_id,
                score_fraude_invertido: resultado.scoreFraudeInvertido,
                score_severidad: resultado.scoreSeveridad,
                score_costo_uf: resultado.scoreCostoUF,
                score_consistencia: resultado.scoreConsistencia,
                score_cobertura: resultado.scoreCobertura,
                acl_score: resultado.aclScore,
                decision: resultado.decision,
                bloqueos: resultado.bloqueos,
                monto_estimado_min: resultado.montoEstimadoMin,
                monto_estimado_max: resultado.montoEstimadoMax,
                monto_final: resultado.montoFinal,
                deducible_aplicado: resultado.deducibleAplicado,
                factor_depreciacion: resultado.factorDepreciacion,
                explicacion_asegurado: resultado.explicacionAsegurado,
                razon_rechazo: resultado.razonRechazo,
                motor_version: ACL_VERSION,
                inputs_snapshot: aclInput,
                dry_run,
            })
            .select('id')
            .single();

        if (errDecision) {
            console.error('❌ Error guardando decisión:', errDecision);
            return NextResponse.json(
                { error: 'Error guardando decisión', detail: errDecision.message },
                { status: 500 }
            );
        }

        // ─── 7. Actualizar estado del siniestro ──────────────────────────
        if (!dry_run && resultado.decision === 'autoaprobado') {
            await supabase
                .from('siniestros')
                .update({
                    estado: 'autoaprobado',
                    severidad_general: severidadGeneral,
                    score_fraude_general: scoreFraudePromedio,
                    costo_estimado_min: costoEstimadoMin,
                    costo_estimado_max: costoEstimadoMax,
                })
                .eq('id', siniestro_id);
        } else {
            // Solo actualizar scores, no cambiar estado
            await supabase
                .from('siniestros')
                .update({
                    severidad_general: severidadGeneral,
                    score_fraude_general: scoreFraudePromedio,
                    costo_estimado_min: costoEstimadoMin,
                    costo_estimado_max: costoEstimadoMax,
                })
                .eq('id', siniestro_id);
        }

        // ─── 8. Retornar resultado ───────────────────────────────────────
        return NextResponse.json({
            success: true,
            decision_id: decision?.id,
            resultado: {
                acl_score: resultado.aclScore,
                decision: resultado.decision,
                bloqueos: resultado.bloqueos,
                monto_estimado_min: resultado.montoEstimadoMin,
                monto_estimado_max: resultado.montoEstimadoMax,
                monto_final: resultado.montoFinal,
                explicacion_asegurado: resultado.explicacionAsegurado,
                dry_run,
            },
        });

    } catch (error) {
        console.error('❌ Error en /api/autoliquidar:', error);
        return NextResponse.json(
            { error: 'Error interno del motor de decisión', detail: String(error) },
            { status: 500 }
        );
    }
}
