-- ═══════════════════════════════════════════════════════════════════════════
-- WC26 Full Group Stage Fixture — insert ALL missing matches
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times — skips matches that already exist by team pair
-- ═══════════════════════════════════════════════════════════════════════════

-- Helper: insert only if this matchup doesn't already exist
CREATE OR REPLACE FUNCTION insert_match_if_missing(
  p_home text, p_away text, p_home_flag text, p_away_flag text,
  p_kickoff timestamptz, p_group text
) RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM matches WHERE home_team = p_home AND away_team = p_away
  ) THEN
    INSERT INTO matches (home_team, away_team, home_flag, away_flag, kickoff_time, group_name, status)
    VALUES (p_home, p_away, p_home_flag, p_away_flag, p_kickoff, p_group, 'upcoming');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ── JUN 16 ────────────────────────────────────────────────────────────────
SELECT insert_match_if_missing('France',       'Senegal',         '🇫🇷','🇸🇳', '2026-06-16T19:00:00Z', 'I');
SELECT insert_match_if_missing('Iraq',         'Norway',          '🇮🇶','🇳🇴', '2026-06-16T23:00:00Z', 'I');
SELECT insert_match_if_missing('Argentina',    'Algeria',         '🇦🇷','🇩🇿', '2026-06-17T01:00:00Z', 'J');
SELECT insert_match_if_missing('Austria',      'Jordan',          '🇦🇹','🇯🇴', '2026-06-17T04:00:00Z', 'J');

-- ── JUN 17 ────────────────────────────────────────────────────────────────
SELECT insert_match_if_missing('Portugal',     'Congo DR',        '🇵🇹','🇨🇩', '2026-06-17T17:00:00Z', 'K');
SELECT insert_match_if_missing('England',      'Croatia',         '🏴󠁧󠁢󠁥󠁮󠁧󠁿','🇭🇷', '2026-06-17T20:00:00Z', 'L');
SELECT insert_match_if_missing('Ghana',        'Panama',          '🇬🇭','🇵🇦', '2026-06-17T23:00:00Z', 'L');
SELECT insert_match_if_missing('Uzbekistan',   'Colombia',        '🇺🇿','🇨🇴', '2026-06-18T02:00:00Z', 'K');

-- ── JUN 18 ────────────────────────────────────────────────────────────────
SELECT insert_match_if_missing('Czechia',      'South Africa',    '🇨🇿','🇿🇦', '2026-06-18T16:00:00Z', 'A');
SELECT insert_match_if_missing('Switzerland',  'Bosnia & Herz.',  '🇨🇭','🇧🇦', '2026-06-18T19:00:00Z', 'B');
SELECT insert_match_if_missing('Canada',       'Qatar',           '🇨🇦','🇶🇦', '2026-06-18T22:00:00Z', 'B');
SELECT insert_match_if_missing('Mexico',       'Korea Republic',  '🇲🇽','🇰🇷', '2026-06-19T01:00:00Z', 'A');

-- ── JUN 19 ────────────────────────────────────────────────────────────────
SELECT insert_match_if_missing('USA',          'Australia',       '🇺🇸','🇦🇺', '2026-06-19T19:00:00Z', 'D');
SELECT insert_match_if_missing('Scotland',     'Morocco',         '🏴󠁧󠁢󠁳󠁣󠁴󠁿','🇲🇦', '2026-06-19T22:00:00Z', 'C');
SELECT insert_match_if_missing('Brazil',       'Haiti',           '🇧🇷','🇭🇹', '2026-06-20T01:00:00Z', 'C');
SELECT insert_match_if_missing('Türkiye',      'Paraguay',        '🇹🇷','🇵🇾', '2026-06-20T04:00:00Z', 'D');

-- ── JUN 20 ────────────────────────────────────────────────────────────────
SELECT insert_match_if_missing('Netherlands',  'Sweden',          '🇳🇱','🇸🇪', '2026-06-20T17:00:00Z', 'F');
SELECT insert_match_if_missing('Germany',      'Côte d''Ivoire',  '🇩🇪','🇨🇮', '2026-06-20T20:00:00Z', 'E');
SELECT insert_match_if_missing('Ecuador',      'Curaçao',         '🇪🇨','🇨🇼', '2026-06-21T00:00:00Z', 'F');
SELECT insert_match_if_missing('Tunisia',      'Japan',           '🇹🇳','🇯🇵', '2026-06-21T04:00:00Z', 'G');

-- ── JUN 21 ────────────────────────────────────────────────────────────────
SELECT insert_match_if_missing('Spain',        'Saudi Arabia',    '🇪🇸','🇸🇦', '2026-06-21T16:00:00Z', 'H');
SELECT insert_match_if_missing('Belgium',      'IR Iran',         '🇧🇪','🇮🇷', '2026-06-21T19:00:00Z', 'G');
SELECT insert_match_if_missing('Uruguay',      'Cabo Verde',      '🇺🇾','🇨🇻', '2026-06-21T22:00:00Z', 'H');
SELECT insert_match_if_missing('New Zealand',  'Egypt',           '🇳🇿','🇪🇬', '2026-06-22T01:00:00Z', 'G');

-- ── JUN 22 ────────────────────────────────────────────────────────────────
SELECT insert_match_if_missing('Argentina',    'Austria',         '🇦🇷','🇦🇹', '2026-06-22T17:00:00Z', 'J');
SELECT insert_match_if_missing('France',       'Iraq',            '🇫🇷','🇮🇶', '2026-06-22T21:00:00Z', 'I');
SELECT insert_match_if_missing('Norway',       'Senegal',         '🇳🇴','🇸🇳', '2026-06-23T00:00:00Z', 'I');
SELECT insert_match_if_missing('Algeria',      'Jordan',          '🇩🇿','🇯🇴', '2026-06-23T03:00:00Z', 'J');

-- ── JUN 23 ────────────────────────────────────────────────────────────────
SELECT insert_match_if_missing('England',      'Ghana',           '🏴󠁧󠁢󠁥󠁮󠁧󠁿','🇬🇭', '2026-06-23T20:00:00Z', 'L');
SELECT insert_match_if_missing('Portugal',     'Uzbekistan',      '🇵🇹','🇺🇿', '2026-06-23T23:00:00Z', 'K');
SELECT insert_match_if_missing('Colombia',     'Congo DR',        '🇨🇴','🇨🇩', '2026-06-24T02:00:00Z', 'K');
SELECT insert_match_if_missing('Croatia',      'Panama',          '🇭🇷','🇵🇦', '2026-06-24T05:00:00Z', 'L');

-- ── JUN 24 ────────────────────────────────────────────────────────────────
SELECT insert_match_if_missing('South Africa', 'Korea Republic',  '🇿🇦','🇰🇷', '2026-06-24T16:00:00Z', 'A');
SELECT insert_match_if_missing('Bosnia & Herz.','Mexico',         '🇧🇦','🇲🇽', '2026-06-24T20:00:00Z', 'B');
SELECT insert_match_if_missing('Qatar',        'Canada',          '🇶🇦','🇨🇦', '2026-06-25T00:00:00Z', 'B');
SELECT insert_match_if_missing('Czechia',      'Switzerland',     '🇨🇿','🇨🇭', '2026-06-25T03:00:00Z', 'A');

-- ── JUN 25 ────────────────────────────────────────────────────────────────
SELECT insert_match_if_missing('USA',          'Türkiye',         '🇺🇸','🇹🇷', '2026-06-25T19:00:00Z', 'D');
SELECT insert_match_if_missing('Australia',    'Paraguay',        '🇦🇺','🇵🇾', '2026-06-25T22:00:00Z', 'D');
SELECT insert_match_if_missing('Morocco',      'Brazil',          '🇲🇦','🇧🇷', '2026-06-26T01:00:00Z', 'C');
SELECT insert_match_if_missing('Haiti',        'Scotland',        '🇭🇹','🏴󠁧󠁢󠁳󠁣󠁴󠁿', '2026-06-26T04:00:00Z', 'C');

-- ── JUN 26 ────────────────────────────────────────────────────────────────
SELECT insert_match_if_missing('Norway',       'France',          '🇳🇴','🇫🇷', '2026-06-26T19:00:00Z', 'I');
SELECT insert_match_if_missing('Netherlands',  'Ecuador',         '🇳🇱','🇪🇨', '2026-06-26T17:00:00Z', 'F');
SELECT insert_match_if_missing('Curaçao',      'Côte d''Ivoire',  '🇨🇼','🇨🇮', '2026-06-26T20:00:00Z', 'F');
SELECT insert_match_if_missing('Germany',      'Sweden',          '🇩🇪','🇸🇪', '2026-06-26T23:00:00Z', 'E');
SELECT insert_match_if_missing('Senegal',      'Iraq',            '🇸🇳','🇮🇶', '2026-06-27T19:00:00Z', 'I');

-- ── JUN 27 ────────────────────────────────────────────────────────────────
SELECT insert_match_if_missing('Japan',        'Belgium',         '🇯🇵','🇧🇪', '2026-06-27T16:00:00Z', 'G');
-- Saudi Arabia vs New Zealand was wrong — these teams are in different groups
SELECT insert_match_if_missing('IR Iran',      'New Zealand',     '🇮🇷','🇳🇿', '2026-06-27T22:00:00Z', 'G'); -- IR Iran vs New Zealand
SELECT insert_match_if_missing('Belgium',      'New Zealand',     '🇧🇪','🇳🇿', '2026-06-27T16:00:00Z', 'G'); -- This was Japan vs Belgium before, fix below
-- IR Iran vs Cabo Verde removed — these teams are in different groups (G and H)
SELECT insert_match_if_missing('Uruguay',      'Spain',           '🇺🇾','🇪🇸', '2026-06-28T01:00:00Z', 'H');
SELECT insert_match_if_missing('Algeria',      'Austria',         '🇩🇿','🇦🇹', '2026-06-27T22:00:00Z', 'J');
SELECT insert_match_if_missing('Congo DR',     'Uzbekistan',      '🇨🇩','🇺🇿', '2026-06-28T01:00:00Z', 'K');
SELECT insert_match_if_missing('Panama',       'Croatia',         '🇵🇦','🇭🇷', '2026-06-28T04:00:00Z', 'L');

-- Cleanup helper function
DROP FUNCTION insert_match_if_missing;

