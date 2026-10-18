-- Ultrathing — diseños del editor tipo Canva. El diseño entero se serializa a JSON
-- (elements + background). 100% cliente: el editor escribe directo con RLS, sin motor.

create table public.designs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null default 'Diseño sin título',
  width       integer not null,
  height      integer not null,
  background  jsonb not null default '{"type":"color","value":"#FFFFFF"}',
  elements    jsonb not null default '[]',
  thumbnail   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.designs enable row level security;

-- Misma política reutilizable del resto del esquema: cada quien solo ve/edita lo suyo.
create policy "own rows" on public.designs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime: la galería refleja cambios al instante (y prepara la vista web futura).
alter publication supabase_realtime add table public.designs;
