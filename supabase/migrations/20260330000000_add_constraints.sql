-- Constraints de validación en analisis_ia
ALTER TABLE analisis_ia
  ADD CONSTRAINT IF NOT EXISTS check_score_fraude
  CHECK (score_fraude IS NULL OR (score_fraude >= 0 AND score_fraude <= 1));

-- Tabla de auditoría básica
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla TEXT NOT NULL,
  operacion TEXT NOT NULL,
  registro_id UUID,
  usuario_id UUID,
  cambios JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eliminar policy de UPDATE para anon en siniestros (demasiado permisiva)
DROP POLICY IF EXISTS "Enable update for anon on drafts" ON siniestros;
