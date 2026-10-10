-- Script anterior retirado: instalaba políticas públicas inseguras.
-- Usar supabase/migrations/20261009000000_owner_only.sql.
DO $$ BEGIN RAISE EXCEPTION 'Configuración obsoleta. Ejecutar la migración de privacidad owner_only'; END $$;
