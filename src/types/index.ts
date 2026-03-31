// Tipos TypeScript para LiquidApp — Autoliquidador v2
// Generados desde el schema de Supabase + spec autoliquidador

// ─── Enums ───────────────────────────────────────────────────────────────────

export type RolUsuario = 'liquidador_campo' | 'liquidador_senior' | 'admin';
export type EstadoSiniestro =
    | 'borrador'
    | 'en_revision'
    | 'aprobado'
    | 'autoaprobado'
    | 'rechazado'
    | 'apelado'
    | 'pagado'
    | 'cerrado';

export type SeveridadDano = 'leve' | 'moderado' | 'grave' | 'perdida_total';
export type NivelFraude = 'bajo' | 'medio' | 'alto' | 'critico';
export type EstadoInforme = 'borrador' | 'revisado' | 'firmado';

/** Tipo de evento desde pantalla de crisis */
export type TipoEvento = 'choque' | 'solo' | 'robo';

/** Tipo de impacto del vehículo */
export type TipoImpacto = 'frontal' | 'lateral' | 'trasero' | 'volcamiento' | 'multiple';

/** Decisión del motor ACL */
export type DecisionACL = 'autoaprobado' | 'revision_senior' | 'escalado_humano' | 'perito_externo';

/** Estado de pago */
export type EstadoPago = 'pendiente' | 'procesando' | 'completado' | 'fallido' | 'revertido';

/** Canal de notificación */
export type CanalNotificacion = 'sms' | 'email' | 'whatsapp' | 'push';

// ─── Interfaces de Datos ─────────────────────────────────────────────────────

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
    numero_caso?: string; // Visible al asegurado (formato humano)
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
    // Conductor (si ≠ asegurado)
    conductor_es_asegurado?: boolean;
    conductor_nombre?: string;
    conductor_rut?: string;
    // Evento
    tipo_evento?: TipoEvento;
    tipo_impacto?: TipoImpacto;
    hay_heridos: boolean;
    hay_terceros: boolean;
    tipo_siniestro: string; // Legacy, mantener para compatibilidad
    descripcion?: string;
    relato_texto?: string;
    relato_audio_path?: string;
    // Tercero involucrado
    tercero_nombre?: string;
    tercero_patente?: string;
    tercero_aseguradora?: string;
    tercero_telefono?: string;
    // Geolocalización
    latitud?: number;
    longitud?: number;
    direccion: string;
    // Estado
    estado: EstadoSiniestro;
    liquidador_campo_id?: string;
    liquidador_senior_id?: string;
    estado_autoliquidacion?: string;
    canal_ingreso?: string;
    apelacion_motivo?: string;
    apelacion_fecha?: string;
    apelacion_plazo_vence?: string;
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
    fecha_siniestro: string;
}

export interface Evidencia {
    id: string;
    siniestro_id: string;
    storage_path: string;
    url_publica?: string;
    nombre_archivo?: string;
    tipo_mime?: string;
    tamaño_bytes?: number;
    sha256_hash?: string;
    latitud?: number;
    longitud?: number;
    precision_metros?: number;
    descripcion?: string;
    orden: number;
    analizado: boolean;
    capturado_at: string;
    created_at: string;
    analisis_ia?: AnalisisIA[];
}

export interface EvidenciaConAnalisis extends Evidencia {
    analisis?: AnalisisIA;
    analizando?: boolean;
    previewUrl?: string;
}

export interface SiniestroCompleto extends Siniestro {
    evidencias: (Evidencia & { analisis_ia: AnalisisIA[] })[];
    pre_informe: PreInforme | null;
    liquidador_campo: { nombre_completo: string; telefono: string | null } | null;
    liquidador_senior: { nombre_completo: string; telefono: string | null } | null;
    decision?: DecisionAutoliquidacion | null;
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
    desglose_costos?: Record<string, unknown>;
    // OCR
    patente_detectada?: string;
    tipo_impacto_detectado?: string;
    // Metadata IA
    prompt_version?: string;
    prompt_hash?: string;
    modelo_ia?: string;
    respuesta_raw?: Record<string, unknown>;
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

// ─── Autoliquidador ──────────────────────────────────────────────────────────

export interface DecisionAutoliquidacion {
    id: string;
    siniestro_id: string;
    // Scores por dimensión (0-100)
    score_fraude_invertido: number;
    score_severidad: number;
    score_costo_uf: number;
    score_consistencia: number;
    score_cobertura: number;
    // Score final
    acl_score: number;
    decision: DecisionACL;
    bloqueos: string[]; // Lista de bloqueos duros activos
    // Monto calculado
    monto_estimado_min: number;
    monto_estimado_max: number;
    monto_final?: number;
    deducible_aplicado?: number;
    factor_depreciacion?: number;
    // Explicación para el asegurado
    explicacion_asegurado: string;
    razon_rechazo?: string;
    // Override humano
    override_por?: string;
    override_motivo?: string;
    override_at?: string;
    // Metadata
    motor_version: string;
    inputs_snapshot?: Record<string, unknown>;
    dry_run: boolean;
    created_at: string;
}

export interface Poliza {
    id: string;
    cliente_id: string;
    numero_poliza: string;
    aseguradora: string;
    tipo_cobertura: string;
    suma_asegurada_uf: number;
    deducible_uf: number;
    coberturas_eventos: TipoEvento[]; // Eventos cubiertos
    vigencia_inicio: string;
    vigencia_fin: string;
    activa: boolean;
    created_at: string;
    updated_at: string;
}

export interface Pago {
    id: string;
    siniestro_id: string;
    decision_id: string;
    monto_clp: number;
    banco?: string;
    cuenta?: string;
    referencia?: string;
    estado: EstadoPago;
    comprobante_url?: string;
    procesado_at?: string;
    created_at: string;
}

export interface Notificacion {
    id: string;
    siniestro_id: string;
    canal: CanalNotificacion;
    destinatario: string;
    asunto?: string;
    contenido: string;
    estado: 'pendiente' | 'enviado' | 'fallido';
    enviado_at?: string;
    error?: string;
    created_at: string;
}

// ─── Datos de terceros ───────────────────────────────────────────────────────

export interface DatosTercero {
    nombre?: string;
    rut?: string;
    patente?: string;
    aseguradora?: string;
    telefono?: string;
    foto_carnet_path?: string;
    foto_patente_path?: string;
}

// ─── Tipos para la API de análisis IA ────────────────────────────────────────

export interface ResultadoAnalisisIA {
    antifraude: {
        score: number;
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
        min: number;
        max: number;
        desglose: Array<{
            parte: string;
            costo_min: number;
            costo_max: number;
        }>;
    };
    ocr?: {
        patente_detectada?: string;
        tipo_impacto?: string;
    };
}

// ─── Tipos para formularios ──────────────────────────────────────────────────

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

export interface VehiculoRegistro {
    patente: string;
    encargo_robo: boolean;
    marca: string;
    modelo: string;
    anio: number;
    created_at: string;
    updated_at: string;
}
