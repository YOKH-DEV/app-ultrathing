-- Ultrathing — tabla genérica de "assets": salidas de módulos que producen un archivo
-- (imagen sin fondo, PDF→CSV, etc.). Evita una tabla por módulo. RLS activo como el resto.

create table public.assets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  module      text not null,            -- 'image', 'files', …
  title       text not null,
  filepath    text not null,
  kind        text not null,            -- mime o extensión: 'image/png', 'text/csv', …
  meta        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table public.assets enable row level security;

-- Misma política reutilizable: cada quien solo ve y edita sus propias filas.
create policy "own rows" on public.assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime: la web ve el asset en cuanto el escritorio lo produce.
alter publication supabase_realtime add table public.assets;
