// ── Points System ─────────────────────────────────────────────────────────────
// Correct winner/draw  → 3 pts
// Exact scoreline      → +7 pts (total 10 if also correct winner)
// Wrong prediction     → 0 pts

export function calcPoints(prediction, result) {
  if (!result) return 0

  // Parse as integers to avoid string comparison bugs (e.g. '4' > '10' = true as string)
  const pH = parseInt(prediction.home_goals, 10)
  const pA = parseInt(prediction.away_goals, 10)
  const rH = parseInt(result.home_goals, 10)
  const rA = parseInt(result.away_goals, 10)

  if (isNaN(pH) || isNaN(pA) || isNaN(rH) || isNaN(rA)) return 0

  const predWinner = pH > pA ? 'home' : pH < pA ? 'away' : 'draw'
  const realWinner = rH > rA ? 'home' : rH < rA ? 'away' : 'draw'

  let pts = 0
  if (predWinner === realWinner) pts += 3
  if (pH === rH && pA === rA)    pts += 7  // exact scoreline bonus

  return pts
}

// Update all predictions for a finished match and recalculate user totals
export async function settlePredictions(supabaseAdmin, matchId, homeGoals, awayGoals) {
  // 1. Fetch all predictions for this match
  const { data: preds, error } = await supabaseAdmin
    .from('predictions')
    .select('id, user_id, home_goals, away_goals')
    .eq('match_id', matchId)

  if (error || !preds?.length) return

  // 2. Calculate points for each prediction
  for (const pred of preds) {
    const pts = calcPoints(pred, { home_goals: homeGoals, away_goals: awayGoals })

    // Update prediction's points_earned
    await supabaseAdmin
      .from('predictions')
      .update({ points_earned: pts })
      .eq('id', pred.id)

    // Recalculate user's total points from all predictions
    const { data: allPreds } = await supabaseAdmin
      .from('predictions')
      .select('points_earned')
      .eq('user_id', pred.user_id)

    const total = (allPreds || []).reduce((sum, p) => sum + (p.points_earned || 0), 0)

    await supabaseAdmin
      .from('users')
      .update({ points: total })
      .eq('id', pred.user_id)
  }
}
