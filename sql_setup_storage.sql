-- ══════════════════════════════════════════════════════════
-- SETUP: Supabase Storage bucket + player_data table
-- Ejecutar en Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════

-- 1. BUCKET para fotos de perfil
-- (Supabase no permite crear buckets via SQL nativo, hacerlo en el Dashboard:
--  Storage → New bucket → nombre: "player-photos" → Public: SÍ)
--
-- Alternativamente con la API de gestión:
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Política de lectura pública (cualquiera puede ver las fotos)
CREATE POLICY "player_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'player-photos');

-- Política de escritura para usuarios autenticados
CREATE POLICY "player_photos_auth_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'player-photos' AND auth.role() = 'authenticated');

-- Política de actualización (upsert)
CREATE POLICY "player_photos_auth_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'player-photos' AND auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────
-- 2. TABLA player_data — clave/valor por jugadora
--    Guarda perfil editado, foto_url, preferencias, etc.
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.player_data (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID    NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  key        TEXT    NOT NULL,
  value      JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, key)
);

ALTER TABLE public.player_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pd_select_all" ON public.player_data FOR SELECT USING (true);
CREATE POLICY "pd_upsert_all" ON public.player_data FOR INSERT WITH CHECK (true);
CREATE POLICY "pd_update_all" ON public.player_data FOR UPDATE USING (true);
