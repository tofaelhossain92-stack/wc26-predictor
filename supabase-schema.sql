-- ═══════════════════════════════════════════════════════════════════════════
-- WC26 Predictor — Supabase Database Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. USERS ─────────────────────────────────────────────────────────────────
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  avatar      text not null default '⚽',
  points      integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ── 2. MATCHES ───────────────────────────────────────────────────────────────
create table if not exists matches (
  id              serial primary key,
  api_match_id    integer unique,          -- ID from football-data.org
  group_name      text not null,           -- "A", "B", "C" ...
  home_team       text not null,
  away_team       text not null,
  home_flag       text not null default '',
  away_flag       text not null default '',
  kickoff_time    timestamptz not null,
  status          text not null default 'upcoming', -- upcoming | live | done
  home_goals      integer,                 -- null until match is done
  away_goals      integer,                 -- null until match is done
  result_synced_at timestamptz             -- when we last fetched from API
);

-- ── 3. PREDICTIONS ───────────────────────────────────────────────────────────
-- Immutable: insert-only, no updates allowed after creation
create table if not exists predictions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  match_id      integer not null references matches(id) on delete cascade,
  home_goals    integer not null,
  away_goals    integer not null,
  submitted_at  timestamptz not null default now(),
  points_earned integer not null default 0,

  -- One prediction per user per match, submitted before kickoff
  unique(user_id, match_id)
);

-- Prevent any updates to predictions (immutable records)
create or replace rule predictions_no_update as
  on update to predictions do instead nothing;

-- ── 4. MESSAGES (Trash Talk Wall) ────────────────────────────────────────────
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

-- ── 5. ROW LEVEL SECURITY ─────────────────────────────────────────────────────
alter table users       enable row level security;
alter table matches     enable row level security;
alter table predictions enable row level security;
alter table messages    enable row level security;

-- Users: anyone can read, insert own row
create policy "users_read_all"   on users for select using (true);
create policy "users_insert_own" on users for insert with check (true);

-- Matches: anyone can read (write only via service role / cron)
create policy "matches_read_all" on matches for select using (true);

-- Predictions: anyone can read, insert own (no update/delete)
create policy "predictions_read_all"   on predictions for select using (true);
create policy "predictions_insert_own" on predictions for insert with check (true);

-- Messages: anyone can read and insert
create policy "messages_read_all"   on messages for select using (true);
create policy "messages_insert_all" on messages for insert with check (true);

-- ── 6. REALTIME ───────────────────────────────────────────────────────────────
-- Enable realtime for live leaderboard + trash talk
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table predictions;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table matches;

-- ── 7. SEED MATCHES ───────────────────────────────────────────────────────────
insert into matches (api_match_id, group_name, home_team, away_team, home_flag, away_flag, kickoff_time) values
  (null, 'A', 'Mexico',          'South Africa',       '🇲🇽', '🇿🇦', '2026-06-11 19:00:00+00'),
  (null, 'A', 'Korea Republic',  'Czechia',            '🇰🇷', '🇨🇿', '2026-06-12 02:00:00+00'),
  (null, 'B', 'Canada',          'Bosnia & Herz.',     '🇨🇦', '🇧🇦', '2026-06-12 19:00:00+00'),
  (null, 'D', 'USA',             'Paraguay',           '🇺🇸', '🇵🇾', '2026-06-13 01:00:00+00'),
  (null, 'B', 'Qatar',           'Switzerland',        '🇶🇦', '🇨🇭', '2026-06-13 19:00:00+00'),
  (null, 'C', 'Brazil',          'Morocco',            '🇧🇷', '🇲🇦', '2026-06-13 22:00:00+00'),
  (null, 'C', 'Haiti',           'Scotland',           '🇭🇹', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '2026-06-14 01:00:00+00'),
  (null, 'D', 'Australia',       'Türkiye',            '🇦🇺', '🇹🇷', '2026-06-14 04:00:00+00'),
  (null, 'E', 'Germany',         'Curaçao',            '🇩🇪', '🇨🇼', '2026-06-14 17:00:00+00'),
  (null, 'F', 'Netherlands',     'Japan',              '🇳🇱', '🇯🇵', '2026-06-14 20:00:00+00'),
  (null, 'G', 'Sweden',          'Tunisia',            '🇸🇪', '🇹🇳', '2026-06-15 00:00:00+00'),
  (null, 'H', 'Spain',           'Cabo Verde',         '🇪🇸', '🇨🇻', '2026-06-15 16:00:00+00'),
  (null, 'G', 'Belgium',         'Egypt',              '🇧🇪', '🇪🇬', '2026-06-15 19:00:00+00'),
  (null, 'H', 'Saudi Arabia',    'Uruguay',            '🇸🇦', '🇺🇾', '2026-06-15 22:00:00+00'),
  (null, 'I', 'France',          'Senegal',            '🇫🇷', '🇸🇳', '2026-06-16 19:00:00+00'),
  (null, 'J', 'Argentina',       'Algeria',            '🇦🇷', '🇩🇿', '2026-06-17 01:00:00+00'),
  (null, 'L', 'England',         'Croatia',            '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇭🇷', '2026-06-17 20:00:00+00'),
  (null, 'K', 'Portugal',        'Congo DR',           '🇵🇹', '🇨🇩', '2026-06-17 17:00:00+00')
on conflict do nothing;
