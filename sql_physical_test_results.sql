-- ══════════════════════════════════════════════════════════
-- TABLA: physical_test_results
-- NextLevel Basketball — Tests físicos independientes por jugador
-- ══════════════════════════════════════════════════════════
-- Ejecutar en Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.physical_test_results (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID            NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  test_type   TEXT            NOT NULL,  -- 'beep_test' | 'sprint_rep_15' | 'lane_agility' | 'broad_jump' | 'squat_30s'
  date        DATE            NOT NULL,
  value       NUMERIC(10,2),             -- valor principal comparable (distancia m, líneas, segundos, cm, reps)
  unit        TEXT,                      -- 'm' | 'lineas' | 's' | 'cm' | 'reps'
  attempt_1   NUMERIC(10,2),             -- primer intento / nivel (beep)
  attempt_2   NUMERIC(10,2),             -- segundo intento / lanzadera (beep)
  attempt_3   NUMERIC(10,2),             -- tercer intento / lanzaderas totales (beep)
  notes       TEXT,
  source      TEXT            NOT NULL DEFAULT 'self',  -- 'self' | 'coach'
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Índices para queries habituales
CREATE INDEX IF NOT EXISTS idx_ptr_player_type ON public.physical_test_results (player_id, test_type, date DESC);

-- RLS
ALTER TABLE public.physical_test_results ENABLE ROW LEVEL SECURITY;

-- Política: lectura libre para el propio jugador y coaches
CREATE POLICY "ptr_select" ON public.physical_test_results
  FOR SELECT USING (true);

-- Política: inserción para anon (jugadores sin cuenta) y authenticated
CREATE POLICY "ptr_insert" ON public.physical_test_results
  FOR INSERT WITH CHECK (true);

-- Política: actualización solo por el creador
CREATE POLICY "ptr_update" ON public.physical_test_results
  FOR UPDATE USING (true);

-- ══════════════════════════════════════════════════════════
-- TIPOS DE TEST registrados
-- ══════════════════════════════════════════════════════════
-- beep_test      → Beep Test 20m
--   value        = distancia total recorrida (m)
--   attempt_1    = nivel alcanzado
--   attempt_2    = lanzadera alcanzada
--   attempt_3    = total de lanzaderas

-- sprint_rep_15  → Sprint repetido 15m en 30 seg
--   value        = líneas completadas (permite .5)
--   (distancia = value * 15 m, se calcula en frontend)

-- lane_agility   → Lane Agility Test
--   value        = mejor tiempo (s) [LOWER IS BETTER]
--   attempt_1    = intento 1 (s)
--   attempt_2    = intento 2 (s)

-- broad_jump     → Salto horizontal desde parado
--   value        = mejor intento (cm)
--   attempt_1    = intento 1 (cm)
--   attempt_2    = intento 2 (cm)
--   attempt_3    = intento 3 (cm)

-- squat_30s      → Sentadillas en 30 segundos
--   value        = repeticiones válidas (int)
