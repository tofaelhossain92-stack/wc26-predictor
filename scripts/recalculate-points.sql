-- ═══════════════════════════════════════════════════════════════════════════
-- Recalculate all prediction points from scratch
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to run multiple times
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Recalculate points_earned for every prediction on a finished match
UPDATE predictions p
SET points_earned = (
  CASE
    -- Exact scoreline = 10 pts (3 for winner + 7 bonus)
    WHEN p.home_goals = m.home_goals AND p.away_goals = m.away_goals THEN 10
    -- Correct winner/draw only = 3 pts
    WHEN (p.home_goals > p.away_goals AND m.home_goals > m.away_goals) OR
         (p.home_goals < p.away_goals AND m.home_goals < m.away_goals) OR
         (p.home_goals = p.away_goals AND m.home_goals = m.away_goals) THEN 3
    -- Wrong = 0
    ELSE 0
  END
)
FROM matches m
WHERE p.match_id = m.id
  AND m.status = 'done'
  AND m.home_goals IS NOT NULL
  AND m.away_goals IS NOT NULL;

-- Step 2: Null out points for predictions on unfinished matches
UPDATE predictions p
SET points_earned = NULL
FROM matches m
WHERE p.match_id = m.id
  AND m.status != 'done';

-- Step 3: Recalculate total points for every user
UPDATE users
SET points = (
  SELECT COALESCE(SUM(points_earned), 0)
  FROM predictions
  WHERE predictions.user_id = users.id
  AND points_earned IS NOT NULL
);

-- Step 4: Verify — show leaderboard
SELECT u.name, u.points,
  COUNT(p.id) as predictions_made,
  COUNT(CASE WHEN p.points_earned = 10 THEN 1 END) as exact_scores,
  COUNT(CASE WHEN p.points_earned = 3  THEN 1 END) as correct_winner,
  COUNT(CASE WHEN p.points_earned = 0  THEN 1 END) as wrong
FROM users u
LEFT JOIN predictions p ON p.user_id = u.id
GROUP BY u.id, u.name, u.points
ORDER BY u.points DESC;
