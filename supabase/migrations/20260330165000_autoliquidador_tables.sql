-- Script de Migración: Autoliquidador y Tracking (20260330165000)

-- 1. Crear Tabla de Pólizas
CREATE TABLE IF NOT EXISTS polizas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID,
    numero_poliza TEXT NOT NULL,
    aseguradora TEXT NOT NULL,
    tipo_cobertura TEXT NOT NULL,
    suma_asegurada_uf NUMERIC NOT NULL DEFAULT 0,
    deducible_uf NUMERIC NOT NULL DEFAULT 0,
    coberturas_eventos TEXT[] DEFAULT '{}',
    vigencia_inicio TIMESTAMPTZ NOT NULL,
    vigencia_fin TIMESTAMPTZ NOT NULL,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en polizas
ALTER TABLE polizas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can select polizas" ON polizas FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can full access polizas" ON polizas FOR ALL TO authenticated USING (true);

-- 2. Crear Tabla de Decisiones de Autoliquidación
CREATE TABLE IF NOT EXISTS decisiones_autoliquidacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siniestro_id UUID NOT NULL, -- references siniestros(id) originally, but keeping it flexible if references dont exist yet
    score_fraude_invertido NUMERIC,
    score_severidad NUMERIC,
    score_costo_uf NUMERIC,
    score_consistencia NUMERIC,
    score_cobertura NUMERIC,
    acl_score NUMERIC,
    decision TEXT NOT NULL,
    bloqueos TEXT[] DEFAULT '{}',
    monto_estimado_min NUMERIC,
    monto_estimado_max NUMERIC,
    monto_final NUMERIC,
    deducible_aplicado NUMERIC,
    factor_depreciacion NUMERIC,
    explicacion_asegurado TEXT,
    razon_rechazo TEXT,
    override_por UUID,
    override_motivo TEXT,
    override_at TIMESTAMPTZ,
    motor_version TEXT,
    inputs_snapshot JSONB,
    dry_run BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en decisiones_autoliquidacion
ALTER TABLE decisiones_autoliquidacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can insert decision" ON decisiones_autoliquidacion FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can select decision" ON decisiones_autoliquidacion FOR SELECT TO anon USING (true);
CREATE POLICY "Authenticated can full access decision" ON decisiones_autoliquidacion FOR ALL TO authenticated USING (true);


-- 3. Crear Tabla de Pagos
CREATE TABLE IF NOT EXISTS pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siniestro_id UUID NOT NULL,
    decision_id UUID NOT NULL,
    monto_clp NUMERIC NOT NULL,
    banco TEXT,
    cuenta TEXT,
    referencia TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    comprobante_url TEXT,
    procesado_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin/Auth can manage pagos" ON pagos FOR ALL TO authenticated USING (true);
CREATE POLICY "Anon can select pagos" ON pagos FOR SELECT TO anon USING (true);

-- 4. Crear Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siniestro_id UUID NOT NULL,
    canal TEXT NOT NULL,
    destinatario TEXT NOT NULL,
    asunto TEXT,
    contenido TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    enviado_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can insert notificaciones" ON notificaciones FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can select notificaciones" ON notificaciones FOR SELECT TO anon USING (true);

-- 5. Configurar Función PL/pgSQL y Triggers para Audit_Log
-- Se asume que la tabla audit_log ya fue creada en `20260330000000_add_constraints.sql`
CREATE OR REPLACE FUNCTION fn_audit_record()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_log(tabla, operacion, registro_id, cambios)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_log(tabla, operacion, registro_id, cambios)
        VALUES (TG_TABLE_NAME, TG_OP, NEW.id, jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_log(tabla, operacion, registro_id, cambios)
        VALUES (TG_TABLE_NAME, TG_OP, OLD.id, row_to_json(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adjuntar trigger audit a siniestros
DROP TRIGGER IF EXISTS trg_audit_siniestros ON siniestros;
CREATE TRIGGER trg_audit_siniestros
AFTER INSERT OR UPDATE OR DELETE ON siniestros
FOR EACH ROW EXECUTE FUNCTION fn_audit_record();

-- Adjuntar trigger audit a decisiones
DROP TRIGGER IF EXISTS trg_audit_decisiones ON decisiones_autoliquidacion;
CREATE TRIGGER trg_audit_decisiones
AFTER INSERT OR UPDATE OR DELETE ON decisiones_autoliquidacion
FOR EACH ROW EXECUTE FUNCTION fn_audit_record();

-- 6. Nuevas Columnas y Tabla Vehiculos Registro
CREATE TABLE IF NOT EXISTS vehiculos_registro (
    patente TEXT PRIMARY KEY,
    encargo_robo BOOLEAN DEFAULT false,
    marca TEXT,
    modelo TEXT,
    anio INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehiculos_registro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon can select vehiculos_registro" ON vehiculos_registro FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert vehiculos_registro" ON vehiculos_registro FOR INSERT TO anon WITH CHECK (true);

ALTER TABLE siniestros ADD COLUMN IF NOT EXISTS estado_autoliquidacion TEXT;
ALTER TABLE siniestros ADD COLUMN IF NOT EXISTS canal_ingreso TEXT;
ALTER TABLE siniestros ADD COLUMN IF NOT EXISTS apelacion_motivo TEXT;
ALTER TABLE siniestros ADD COLUMN IF NOT EXISTS apelacion_fecha TIMESTAMPTZ;
ALTER TABLE siniestros ADD COLUMN IF NOT EXISTS apelacion_plazo_vence TIMESTAMPTZ;

-- 7. Supabase Realtime para Siniestros
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'siniestros'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE siniestros;
  END IF;
END $$;
ALTER TABLE siniestros REPLICA IDENTITY FULL;
