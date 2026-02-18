-- Migration: fix_anon_permissions_and_defaults
-- Created at: 2026-02-18 13:15:00

-- 1. Fix default value for numero_siniestro
ALTER TABLE siniestros ALTER COLUMN numero_siniestro SET DEFAULT generar_numero_siniestro();

-- 2. Grant permissions to execute the generation function
GRANT EXECUTE ON FUNCTION generar_numero_siniestro TO anon;
GRANT EXECUTE ON FUNCTION generar_numero_siniestro TO authenticated;
GRANT EXECUTE ON FUNCTION generar_numero_siniestro TO service_role;

-- 3. Allow SELECT for anon on drafts (needed for returning ID after insert)
CREATE POLICY "Enable select for anon on drafts" ON "public"."siniestros"
FOR SELECT TO anon
USING (liquidador_campo_id IS NULL);

-- 4. Allow UPDATE for anon on drafts (needed for finalizing and location)
CREATE POLICY "Enable update for anon on drafts" ON "public"."siniestros"
FOR UPDATE TO anon
USING (liquidador_campo_id IS NULL);

-- 5. Allow SELECT for anon on evidences linked to drafts (needed for returning ID after upload)
CREATE POLICY "Enable select for anon on draft evidences" ON "public"."evidencias"
FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM siniestros s
    WHERE s.id = evidencias.siniestro_id
    AND s.liquidador_campo_id IS NULL
  )
);
