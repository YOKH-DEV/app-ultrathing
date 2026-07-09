-- Ultrathing — esquema inicial. RLS activo en TODAS las tablas.

-- Jobs: espejo del estado del motor, para que la web vea el progreso.
create table public.jobs (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  module      text not null,
  status      text not null default 'queued'
              check (status in ('queued','running','done','error')),
  progress    numeric not null default 0,
  result      jsonb,
  error       text,
  created_at  timestamptz not null default now()
);

-- Descargas: resultado persistido del módulo downloader.
create table public.downloads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  filepath    text not null,
  ext         text not null,
  created_at  timestamptz not null default now()
);

-- Leads: base de contactos extraídos (Fase 3). Se define ya para no migrar dos veces.
create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  source      text not null,
  name        text,
  phone       text,
  email       text,
  meta        jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table public.jobs      enable row level security;
alter table public.downloads enable row level security;
alter table public.leads     enable row level security;

-- Política reutilizable: cada quien solo ve y edita sus propias filas.
create policy "own rows" on public.jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.downloads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on public.leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime: la web se entera al instante cuando el escritorio termina algo.
alter publication supabase_realtime add table public.jobs, public.downloads, public.leads;
