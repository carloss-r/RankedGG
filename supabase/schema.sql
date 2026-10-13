-- RankedGG · ranking global
-- Ejecutar en el SQL editor de Supabase. El acceso se hace solo desde el servidor
-- de Next.js con la service role key, así que RLS queda activo y sin políticas públicas.

create table if not exists public.players (
  id            text primary key,
  secret_hash   text not null,
  name          text not null check (char_length(name) between 1 and 24),
  sex           text not null check (sex in ('male', 'female')),
  bodyweight_kg numeric not null check (bodyweight_kg between 30 and 250),
  score         numeric not null default 0,
  percentile    numeric not null default 0,
  rank_id       text not null default 'wood',
  xp            integer not null default 0,
  level         integer not null default 1,
  bests         jsonb not null default '{}'::jsonb,
  lift_scores   jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.lift_scores (
  player_id text not null references public.players (id) on delete cascade,
  lift      text not null,
  one_rm    numeric not null,
  score     numeric not null,
  primary key (player_id, lift)
);

create index if not exists players_score_idx on public.players (score desc, updated_at asc);
create index if not exists lift_scores_lift_score_idx on public.lift_scores (lift, score desc);

alter table public.players enable row level security;
alter table public.lift_scores enable row level security;
