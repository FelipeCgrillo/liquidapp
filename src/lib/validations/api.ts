import { z } from 'zod';

const imageUrlSchema = z.string()
    .url('URL inválida')
    .refine(
        (url) => {
            try {
                const parsed = new URL(url);
                return parsed.protocol === 'https:' && parsed.hostname.endsWith('supabase.co');
            } catch {
                return false;
            }
        },
        'Solo se permiten URLs HTTPS de Supabase Storage'
    );

export const analizarEvidenciaSchema = z.object({
    evidencia_id: z.string().uuid('evidencia_id debe ser un UUID válido'),
    imagen_url: imageUrlSchema,
    siniestro_id: z.string().uuid('siniestro_id debe ser un UUID válido'),
});

export const queueAnalisisSchema = z.object({
    evidencia_id: z.string().uuid('evidencia_id debe ser un UUID válido'),
    imagen_url: imageUrlSchema,
    siniestro_id: z.string().uuid('siniestro_id debe ser un UUID válido'),
});

export const generarPreinformeSchema = z.object({
    siniestro_id: z.string().uuid('siniestro_id debe ser un UUID válido'),
});
