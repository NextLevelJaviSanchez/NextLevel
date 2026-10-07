-- Permitir un dorsal desconocido sin inventar un número.
-- Conserva los dorsales existentes. Puede ejecutarse más de una vez.
alter table public.players alter column dorsal drop not null;
