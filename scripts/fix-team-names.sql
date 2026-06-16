-- ═══════════════════════════════════════════════════════════════════════════
-- Fix team names AND group assignments in matches table
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Fix team name inconsistencies ─────────────────────────────────────

-- Ivory Coast → Côte d'Ivoire
UPDATE matches SET home_team = 'Côte d''Ivoire', home_flag = '🇨🇮' WHERE home_team = 'Ivory Coast';
UPDATE matches SET away_team = 'Côte d''Ivoire', away_flag = '🇨🇮' WHERE away_team = 'Ivory Coast';

-- South Korea → Korea Republic
UPDATE matches SET home_team = 'Korea Republic', home_flag = '🇰🇷' WHERE home_team = 'South Korea';
UPDATE matches SET away_team = 'Korea Republic', away_flag = '🇰🇷' WHERE away_team = 'South Korea';

-- Cape Verde Islands / Cape Verde → Cabo Verde
UPDATE matches SET home_team = 'Cabo Verde', home_flag = '🇨🇻' WHERE home_team IN ('Cape Verde Islands', 'Cape Verde');
UPDATE matches SET away_team = 'Cabo Verde', away_flag = '🇨🇻' WHERE away_team IN ('Cape Verde Islands', 'Cape Verde');

-- Bosnia variants → Bosnia & Herz.
UPDATE matches SET home_team = 'Bosnia & Herz.', home_flag = '🇧🇦' WHERE home_team IN ('Bosnia-Herzegovina', 'Bosnia and Herzegovina', 'Bosnia & Herzegovina');
UPDATE matches SET away_team = 'Bosnia & Herz.', away_flag = '🇧🇦' WHERE away_team IN ('Bosnia-Herzegovina', 'Bosnia and Herzegovina', 'Bosnia & Herzegovina');

-- Congo DR variants
UPDATE matches SET home_team = 'Congo DR', home_flag = '🇨🇩' WHERE home_team IN ('DR Congo', 'Democratic Republic of Congo', 'Democratic Republic of the Congo');
UPDATE matches SET away_team = 'Congo DR', away_flag = '🇨🇩' WHERE away_team IN ('DR Congo', 'Democratic Republic of Congo', 'Democratic Republic of the Congo');

-- Turkey → Türkiye
UPDATE matches SET home_team = 'Türkiye', home_flag = '🇹🇷' WHERE home_team = 'Turkey';
UPDATE matches SET away_team = 'Türkiye', away_flag = '🇹🇷' WHERE away_team = 'Turkey';

-- Curacao → Curaçao
UPDATE matches SET home_team = 'Curaçao', home_flag = '🇨🇼' WHERE home_team = 'Curacao';
UPDATE matches SET away_team = 'Curaçao', away_flag = '🇨🇼' WHERE away_team = 'Curacao';

-- United States → USA
UPDATE matches SET home_team = 'USA', home_flag = '🇺🇸' WHERE home_team = 'United States';
UPDATE matches SET away_team = 'USA', away_flag = '🇺🇸' WHERE away_team = 'United States';

-- Iran → IR Iran
UPDATE matches SET home_team = 'IR Iran', home_flag = '🇮🇷' WHERE home_team = 'Iran';
UPDATE matches SET away_team = 'IR Iran', away_flag = '🇮🇷' WHERE away_team = 'Iran';

-- ── 2. Fix wrong group assignments ────────────────────────────────────────
-- Correct groups (all 12):
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

-- Fix Group E — should only be Germany, Curaçao, Côte d'Ivoire, Ecuador
UPDATE matches SET group_name = 'F' WHERE group_name = 'E' AND (home_team IN ('Netherlands','Japan','Sweden','Tunisia') OR away_team IN ('Netherlands','Japan','Sweden','Tunisia'));

-- Fix Group G — should be Belgium, Egypt, IR Iran, New Zealand
UPDATE matches SET group_name = 'G' WHERE group_name = 'E' AND (home_team IN ('Belgium','Egypt','IR Iran','New Zealand') OR away_team IN ('Belgium','Egypt','IR Iran','New Zealand'));

-- Ensure all matches have correct group by team name (full override)
-- Group A
UPDATE matches SET group_name = 'A' WHERE home_team IN ('Mexico','Korea Republic','Czechia','South Africa') OR away_team IN ('Mexico','Korea Republic','Czechia','South Africa');
-- Group B
UPDATE matches SET group_name = 'B' WHERE home_team IN ('Canada','Bosnia & Herz.','Qatar','Switzerland') OR away_team IN ('Canada','Bosnia & Herz.','Qatar','Switzerland');
-- Group C
UPDATE matches SET group_name = 'C' WHERE home_team IN ('Brazil','Morocco','Haiti','Scotland') OR away_team IN ('Brazil','Morocco','Haiti','Scotland');
-- Group D
UPDATE matches SET group_name = 'D' WHERE home_team IN ('USA','Paraguay','Australia','Türkiye') OR away_team IN ('USA','Paraguay','Australia','Türkiye');
-- Group E
UPDATE matches SET group_name = 'E' WHERE home_team IN ('Germany','Curaçao','Côte d''Ivoire','Ecuador') OR away_team IN ('Germany','Curaçao','Côte d''Ivoire','Ecuador');
-- Group F
UPDATE matches SET group_name = 'F' WHERE home_team IN ('Netherlands','Japan','Sweden','Tunisia') OR away_team IN ('Netherlands','Japan','Sweden','Tunisia');
-- Group G
UPDATE matches SET group_name = 'G' WHERE home_team IN ('Belgium','Egypt','IR Iran','New Zealand') OR away_team IN ('Belgium','Egypt','IR Iran','New Zealand');
-- Group H
UPDATE matches SET group_name = 'H' WHERE home_team IN ('Spain','Cabo Verde','Saudi Arabia','Uruguay') OR away_team IN ('Spain','Cabo Verde','Saudi Arabia','Uruguay');
-- Group I
UPDATE matches SET group_name = 'I' WHERE home_team IN ('France','Senegal','Iraq','Norway') OR away_team IN ('France','Senegal','Iraq','Norway');
-- Group J
UPDATE matches SET group_name = 'J' WHERE home_team IN ('Argentina','Algeria','Austria','Jordan') OR away_team IN ('Argentina','Algeria','Austria','Jordan');
-- Group K
UPDATE matches SET group_name = 'K' WHERE home_team IN ('Portugal','Congo DR','Uzbekistan','Colombia') OR away_team IN ('Portugal','Congo DR','Uzbekistan','Colombia');
-- Group L
UPDATE matches SET group_name = 'L' WHERE home_team IN ('England','Croatia','Ghana','Panama') OR away_team IN ('England','Croatia','Ghana','Panama');


-- Fix New Zealand — belongs in Group G (Belgium, Egypt, IR Iran, New Zealand)
-- It was incorrectly inserted into Group I and H by the seed script
UPDATE matches SET group_name = 'G' WHERE home_team = 'New Zealand' OR away_team = 'New Zealand';

-- Fix any match that incorrectly pairs teams from different groups
-- Saudi Arabia vs New Zealand doesn't exist — delete if inserted
DELETE FROM matches WHERE (home_team = 'Saudi Arabia' AND away_team = 'New Zealand') OR (home_team = 'New Zealand' AND away_team = 'Saudi Arabia');

-- IR Iran vs Cabo Verde doesn't exist — delete if inserted  
DELETE FROM matches WHERE (home_team = 'IR Iran' AND away_team = 'Cabo Verde') OR (home_team = 'Cabo Verde' AND away_team = 'IR Iran');

-- ── 3. Verify — show team count per group ────────────────────────────────
SELECT 
  group_name,
  COUNT(*) as matches,
  COUNT(DISTINCT home_team) + COUNT(DISTINCT away_team) as unique_teams_approx
FROM matches
GROUP BY group_name
ORDER BY group_name;
