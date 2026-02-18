// Tipos TypeScript para LiquidApp — generados desde el schema de Supabase

export type RolUsuario = 'liquidador_campo' | 'liquidador_senior' | 'admin';
export type EstadoSiniestro = 'borrador' | 'en_revision' | 'aprobado' | 'rechazado' | 'cerrado';
export type SeveridadDano = 'leve' | 'moderado' | 'grave' | 'perdida_total';
export type NivelFraude = 'bajo' | 'medio' | 'alto' | 'critico';
export type EstadoInforme = 'borrador' | 'revisado' | 'firmado';

export interface Perfil {
    id: string;
    nombre_completo: string;
    rut?: string;
    rol: RolUsuario;
    telefono?: string;
    empresa?: string;
    avatar_url?: string;
    activo: boolean;
    created_at: string;
    updated_at: string;
}

export interface Siniestro {
    id: string;
    numero_siniestro: string;
    // Vehículo
    patente: string;
    marca: string;
    modelo: string;
    anio: number;
    color?: string;
    // Asegurado
    nombre_asegurado: string;
    rut_asegurado?: string;
    telefono_asegurado?: string;
    email_asegurado?: string;
    poliza_numero?: string;
    // Siniestro
    fecha_siniestro: string; // timestampz
    tipo_siniestro: string;
    descripcion?: string;
    // Geolocalización
    latitud?: number;
    longitud?: number;
    direccion: string;
    // Estado
    estado: EstadoSiniestro;
    liquidador_campo_id?: string;
    liquidador_senior_id?: string;
    // Resumen IA
    severidad_general?: SeveridadDano;
    score_fraude_general?: number;
    costo_estimado_min: number;
    costo_estimado_max: number;
    // Timestamps
    created_at: string;
    updated_at: string;
    enviado_revision_at?: string;
    cerrado_at?: string;
}

export interface Evidencia {
    id: string;
    siniestro_id: string;
    storage_path: string;
    url_publica?: string; // Propiedad virtual/inyectada
    nombre_archivo?: string;
    tipo_mime?: string;
    tamaño_bytes?: number;
    latitud?: number;
    longitud?: number;
    precision_metros?: number;
    descripcion?: string;
    orden: number;
    analizado: boolean;
    capturado_at: string;
    created_at: string;
    // Relaciones (Raw Supabase)
    analisis_ia?: AnalisisIA[];
}

export interface EvidenciaConAnalisis extends Evidencia {
    // Propiedades de conveniencia/UI
    analisis?: AnalisisIA; // Para compatibilidad con useEvidenceUpload (resultado inmediato)
    analizando?: boolean;
    previewUrl?: string;
}

export interface SiniestroCompleto extends Siniestro {
    // Relaciones expandidas
    evidencias: (Evidencia & { analisis_ia: AnalisisIA[] })[];
    pre_informe: PreInforme | null; // Asumiendo relación 1:1 o 0:1
    liquidador_campo: { nombre_completo: string; telefono: string | null } | null;
    liquidador_senior: { nombre_completo: string; telefono: string | null } | null;
}

export interface AnalisisIA {
    id: string;
    evidencia_id: string;
    siniestro_id: string;
    // Antifraude
    score_fraude: number;
    nivel_fraude: NivelFraude;
    indicadores_fraude?: string[];
    justificacion_fraude?: string;
    // Triaje
    severidad: SeveridadDano;
    partes_danadas?: string[];
    descripcion_danos?: string;
    // Costos
    costo_estimado_min: number;
    costo_estimado_max: number;
    desglose_costos?: Record<string, unknown>; // JSONB
    // Metadata IA
    prompt_version?: string;
    modelo_ia?: string;
    respuesta_raw?: Record<string, unknown>; // JSONB
    tokens_usados?: number;
    created_at: string;
    procesado_at: string;
}

export interface PreInforme {
    id: string;
    siniestro_id: string;
    contenido_markdown: string;
    contenido_html?: string;
    estado: EstadoInforme;
    revisado_por?: string;
    notas_revision?: string;
    firmado_por?: string;
    firma_imagen_base64?: string;
    firmado_at?: string;
    generado_por_ia: boolean;
    version: number;
    created_at: string;
    updated_at: string;
}

// Tipos para la API de análisis IA
export interface ResultadoAnalisisIA {
    antifraude: {
        score: number; // 0.0 a 1.0
        nivel: NivelFraude;
        indicadores: string[];
        justificacion: string;
    };
    triage: {
        severidad: SeveridadDano;
        partes_danadas: string[];
        descripcion: string;
    };
    costos: {
        min: number; // CLP
        max: number; // CLP
        desglose: Array<{
            parte: string;
            costo_min: number;
            costo_max: number;
        }>;
    };
}

// Tipos para formularios
export interface NuevoSiniestroForm {
    patente: string;
    marca?: string;
    modelo?: string;
    anio?: number;
    color?: string;
    nombre_asegurado: string;
    rut_asegurado?: string;
    telefono_asegurado?: string;
    poliza_numero?: string;
    tipo_siniestro: string;
    descripcion?: string;
}
