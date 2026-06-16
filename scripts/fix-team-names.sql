-- ═══════════════════════════════════════════════════════════════════════════
-- MASTER FIX: Team names + Group assignments + Bad match cleanup
-- Source of truth: Google/FIFA official standings June 16 2026
-- Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── STEP 1: Fix team name variants ───────────────────────────────────────

UPDATE matches SET home_team = 'Côte d''Ivoire', home_flag = '🇨🇮' WHERE home_team IN ('Ivory Coast', 'Cote d''Ivoire');
UPDATE matches SET away_team = 'Côte d''Ivoire', away_flag = '🇨🇮' WHERE away_team IN ('Ivory Coast', 'Cote d''Ivoire');

UPDATE matches SET home_team = 'Korea Republic', home_flag = '🇰🇷' WHERE home_team IN ('South Korea', 'Republic of Korea');
UPDATE matches SET away_team = 'Korea Republic', away_flag = '🇰🇷' WHERE away_team IN ('South Korea', 'Republic of Korea');

UPDATE matches SET home_team = 'Cabo Verde', home_flag = '🇨🇻' WHERE home_team IN ('Cape Verde', 'Cape Verde Islands');
UPDATE matches SET away_team = 'Cabo Verde', away_flag = '🇨🇻' WHERE away_team IN ('Cape Verde', 'Cape Verde Islands');

UPDATE matches SET home_team = 'Bosnia & Herz.', home_flag = '🇧🇦' WHERE home_team IN ('Bosnia-Herzegovina', 'Bosnia and Herzegovina', 'Bosnia & Herzegovina');
UPDATE matches SET away_team = 'Bosnia & Herz.', away_flag = '🇧🇦' WHERE away_team IN ('Bosnia-Herzegovina', 'Bosnia and Herzegovina', 'Bosnia & Herzegovina');

UPDATE matches SET home_team = 'Congo DR', home_flag = '🇨🇩' WHERE home_team IN ('DR Congo', 'Democratic Republic of Congo', 'Democratic Republic of the Congo');
UPDATE matches SET away_team = 'Congo DR', away_flag = '🇨🇩' WHERE away_team IN ('DR Congo', 'Democratic Republic of Congo', 'Democratic Republic of the Congo');

UPDATE matches SET home_team = 'Türkiye', home_flag = '🇹🇷' WHERE home_team IN ('Turkey');
UPDATE matches SET away_team = 'Türkiye', away_flag = '🇹🇷' WHERE away_team IN ('Turkey');

UPDATE matches SET home_team = 'Curaçao', home_flag = '🇨🇼' WHERE home_team IN ('Curacao');
UPDATE matches SET away_team = 'Curaçao', away_flag = '🇨🇼' WHERE away_team IN ('Curacao');

UPDATE matches SET home_team = 'USA', home_flag = '🇺🇸' WHERE home_team IN ('United States');
UPDATE matches SET away_team = 'USA', away_flag = '🇺🇸' WHERE away_team IN ('United States');

UPDATE matches SET home_team = 'IR Iran', home_flag = '🇮🇷' WHERE home_team IN ('Iran');
UPDATE matches SET away_team = 'IR Iran', away_flag = '🇮🇷' WHERE away_team IN ('Iran');

-- ── STEP 2: Delete bogus cross-group matches that don't exist ─────────────

DELETE FROM matches WHERE 
  (home_team = 'Saudi Arabia' AND away_team = 'New Zealand') OR
  (home_team = 'New Zealand'  AND away_team = 'Saudi Arabia');

DELETE FROM matches WHERE
  (home_team = 'IR Iran'   AND away_team = 'Cabo Verde') OR
  (home_team = 'Cabo Verde' AND away_team = 'IR Iran');

-- ── STEP 3: Fix group assignments by team — source of truth ──────────────
-- A: Mexico, Korea Republic, Czechia, South Africa
-- B: Canada, Bosnia & Herz., Qatar, Switzerland
-- C: Brazil, Morocco, Haiti, Scotland
-- D: USA, Paraguay, Australia, Türkiye
-- E: Germany, Curaçao, Côte d'Ivoire, Ecuador
-- F: Netherlands, Japan, Sweden, Tunisia
-- G: Belgium, Egypt, IR Iran, New Zealand
-- H: Spain, Cabo Verde, Saudi Arabia, Uruguay
-- I: France, Senegal, Iraq, Norway
-- J: Argentina, Algeria, Austria, Jordan
-- K: Portugal, Congo DR, Uzbekistan, Colombia
-- L: England, Croatia, Ghana, Panama

UPDATE matches SET group_name = 'A' WHERE home_team IN ('Mexico','Korea Republic','Czechia','South Africa') OR away_team IN ('Mexico','Korea Republic','Czechia','South Africa');
UPDATE matches SET group_name = 'B' WHERE home_team IN ('Canada','Bosnia & Herz.','Qatar','Switzerland') OR away_team IN ('Canada','Bosnia & Herz.','Qatar','Switzerland');
UPDATE matches SET group_name = 'C' WHERE home_team IN ('Brazil','Morocco','Haiti','Scotland') OR away_team IN ('Brazil','Morocco','Haiti','Scotland');
UPDATE matches SET group_name = 'D' WHERE home_team IN ('USA','Paraguay','Australia','Türkiye') OR away_team IN ('USA','Paraguay','Australia','Türkiye');
UPDATE matches SET group_name = 'E' WHERE home_team IN ('Germany','Curaçao','Côte d''Ivoire','Ecuador') OR away_team IN ('Germany','Curaçao','Côte d''Ivoire','Ecuador');
UPDATE matches SET group_name = 'F' WHERE home_team IN ('Netherlands','Japan','Sweden','Tunisia') OR away_team IN ('Netherlands','Japan','Sweden','Tunisia');
UPDATE matches SET group_name = 'G' WHERE home_team IN ('Belgium','Egypt','IR Iran','New Zealand') OR away_team IN ('Belgium','Egypt','IR Iran','New Zealand');
UPDATE matches SET group_name = 'H' WHERE home_team IN ('Spain','Cabo Verde','Saudi Arabia','Uruguay') OR away_team IN ('Spain','Cabo Verde','Saudi Arabia','Uruguay');
UPDATE matches SET group_name = 'I' WHERE home_team IN ('France','Senegal','Iraq','Norway') OR away_team IN ('France','Senegal','Iraq','Norway');
UPDATE matches SET group_name = 'J' WHERE home_team IN ('Argentina','Algeria','Austria','Jordan') OR away_team IN ('Argentina','Algeria','Austria','Jordan');
UPDATE matches SET group_name = 'K' WHERE home_team IN ('Portugal','Congo DR','Uzbekistan','Colombia') OR away_team IN ('Portugal','Congo DR','Uzbekistan','Colombia');
UPDATE matches SET group_name = 'L' WHERE home_team IN ('England','Croatia','Ghana','Panama') OR away_team IN ('England','Croatia','Ghana','Panama');

-- ── STEP 4: Verify ───────────────────────────────────────────────────────
SELECT 
  group_name,
  COUNT(*) as total_matches,
  string_agg(DISTINCT home_team, ', ' ORDER BY home_team) as home_teams,
  string_agg(DISTINCT away_team, ', ' ORDER BY away_team) as away_teams
FROM matches
WHERE group_name IN ('A','B','C','D','E','F','G','H','I','J','K','L')
GROUP BY group_name
ORDER BY group_name;
