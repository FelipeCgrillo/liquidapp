import { createClient } from '@/lib/supabase/server';

/**
 * Actualiza el resumen del siniestro con la severidad y score de fraude más críticos
 * basándose en todos los análisis IA asociados.
 */
export async function actualizarResumenSiniestro(
    supabase: Awaited<ReturnType<typeof createClient>>,
    siniestroId: string
) {
    const { data: analisis } = await supabase
        .from('analisis_ia')
        .select('severidad, score_fraude, costo_estimado_min, costo_estimado_max')
        .eq('siniestro_id', siniestroId);

    if (!analisis || analisis.length === 0) return;

    const ordenSeveridad: Record<string, number> = {
        leve: 1, moderado: 2, grave: 3, perdida_total: 4,
    };

    const severidadMax = analisis.reduce((max: string, a: { severidad: string }) => {
        return (ordenSeveridad[a.severidad] || 0) > (ordenSeveridad[max] || 0)
            ? a.severidad : max;
    }, 'leve');

    const scoreFraudeMax = Math.max(...analisis.map((a: { score_fraude: number | null }) => a.score_fraude || 0));
    const costoMin = analisis.reduce((sum: number, a: { costo_estimado_min: number | null }) => sum + (a.costo_estimado_min || 0), 0);
    const costoMax = analisis.reduce((sum: number, a: { costo_estimado_max: number | null }) => sum + (a.costo_estimado_max || 0), 0);

    await supabase
        .from('siniestros')
        .update({
            severidad_general: severidadMax,
            score_fraude_general: scoreFraudeMax,
            costo_estimado_min: costoMin,
            costo_estimado_max: costoMax,
        })
        .eq('id', siniestroId);
}
