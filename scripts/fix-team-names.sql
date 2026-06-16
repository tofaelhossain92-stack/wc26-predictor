-- ═══════════════════════════════════════════════════════════════════════════
-- Fix inconsistent team names in matches table
-- Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Ivory Coast → Côte d'Ivoire
UPDATE matches SET home_team = 'Côte d''Ivoire', home_flag = '🇨🇮' WHERE home_team = 'Ivory Coast';
UPDATE matches SET away_team = 'Côte d''Ivoire', away_flag = '🇨🇮' WHERE away_team = 'Ivory Coast';

-- South Korea → Korea Republic
UPDATE matches SET home_team = 'Korea Republic', home_flag = '🇰🇷' WHERE home_team = 'South Korea';
UPDATE matches SET away_team = 'Korea Republic', away_flag = '🇰🇷' WHERE away_team = 'South Korea';

-- Cape Verde Islands / Cape Verde → Cabo Verde
UPDATE matches SET home_team = 'Cabo Verde', home_flag = '🇨🇻' WHERE home_team IN ('Cape Verde Islands', 'Cape Verde');
UPDATE matches SET away_team = 'Cabo Verde', away_flag = '🇨🇻' WHERE away_team IN ('Cape Verde Islands', 'Cape Verde');

-- Bosnia-Herzegovina / Bosnia and Herzegovina → Bosnia & Herz.
UPDATE matches SET home_team = 'Bosnia & Herz.', home_flag = '🇧🇦' WHERE home_team IN ('Bosnia-Herzegovina', 'Bosnia and Herzegovina', 'Bosnia & Herzegovina');
UPDATE matches SET away_team = 'Bosnia & Herz.', away_flag = '🇧🇦' WHERE away_team IN ('Bosnia-Herzegovina', 'Bosnia and Herzegovina', 'Bosnia & Herzegovina');

-- DR Congo / Democratic Republic of Congo → Congo DR
UPDATE matches SET home_team = 'Congo DR', home_flag = '🇨🇩' WHERE home_team IN ('DR Congo', 'Democratic Republic of Congo', 'Democratic Republic of the Congo');
UPDATE matches SET away_team = 'Congo DR', away_flag = '🇨🇩' WHERE away_team IN ('DR Congo', 'Democratic Republic of Congo', 'Democratic Republic of the Congo');

-- Turkey → Türkiye
UPDATE matches SET home_team = 'Türkiye', home_flag = '🇹🇷' WHERE home_team = 'Turkey';
UPDATE matches SET away_team = 'Türkiye', away_flag = '🇹🇷' WHERE away_team = 'Turkey';

-- Curacao → Curaçao
UPDATE matches SET home_team = 'Curaçao', home_flag = '🇨🇼' WHERE home_team = 'Curacao';
UPDATE matches SET away_team = 'Curaçao', away_flag = '🇨🇼' WHERE away_team = 'Curacao';

-- USA / United States consistency
UPDATE matches SET home_team = 'USA', home_flag = '🇺🇸' WHERE home_team = 'United States';
UPDATE matches SET away_team = 'USA', away_flag = '🇺🇸' WHERE away_team = 'United States';

-- IR Iran consistency
UPDATE matches SET home_team = 'IR Iran', home_flag = '🇮🇷' WHERE home_team = 'Iran';
UPDATE matches SET away_team = 'IR Iran', away_flag = '🇮🇷' WHERE away_team = 'Iran';

-- Verify — show all groups and team counts after fix
SELECT group_name, COUNT(DISTINCT home_team) + COUNT(DISTINCT away_team) as approx_teams,
  string_agg(DISTINCT home_team, ', ') || ', ' || string_agg(DISTINCT away_team, ', ') as teams
FROM matches
GROUP BY group_name
ORDER BY group_name;
