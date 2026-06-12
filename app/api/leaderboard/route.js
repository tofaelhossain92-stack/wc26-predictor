// GET /api/leaderboard
// Returns all users sorted by points, with their full prediction history

import { NextResponse } from 'next/server'
import { supabase }     from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Fetch all users sorted by points
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, avatar, points, created_at')
      .order('points', { ascending: false })

    if (usersError) throw usersError

    // Fetch all predictions with match details
    const { data: predictions, error: predsError } = await supabase
      .from('predictions')
      .select(`
        id,
        user_id,
        home_goals,
        away_goals,
        points_earned,
        submitted_at,
        match:matches (
          id,
          group_name,
          home_team,
          away_team,
          home_flag,
          away_flag,
          kickoff_time,
          status,
          home_goals,
          away_goals
        )
      `)
      .order('submitted_at', { ascending: false })

    if (predsError) throw predsError

    // Attach predictions to each user
    const enriched = users.map(user => ({
      ...user,
      predictions: predictions
        .filter(p => p.user_id === user.id)
        .map(p => ({
          id:           p.id,
          matchId:      p.match?.id,
          group:        p.match?.group_name,
          homeTeam:     p.match?.home_team,
          awayTeam:     p.match?.away_team,
          homeFlag:     p.match?.home_flag,
          awayFlag:     p.match?.away_flag,
          kickoffTime:  p.match?.kickoff_time,
          matchStatus:  p.match?.status,
          predictedHome: p.home_goals,
          predictedAway: p.away_goals,
          actualHome:   p.match?.home_goals,
          actualAway:   p.match?.away_goals,
          pointsEarned: p.points_earned,
          submittedAt:  p.submitted_at,
        })),
      stats: computeStats(predictions.filter(p => p.user_id === user.id)),
    }))

    return NextResponse.json({ ok: true, leaderboard: enriched }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function computeStats(predictions) {
  const finished = predictions.filter(p => p.match?.status === 'done')
  const correct  = finished.filter(p => p.points_earned >= 3)
  const exact    = finished.filter(p => p.points_earned === 10)
  const highGoal = predictions.filter(p => (p.home_goals + p.away_goals) >= 4)

  return {
    totalPredictions: predictions.length,
    finishedMatches:  finished.length,
    correctWinners:   correct.length,
    exactScores:      exact.length,
    riskPredictions:  highGoal.length,   // predicted 4+ total goals
    accuracy:         finished.length > 0
      ? Math.round((correct.length / finished.length) * 100)
      : 0,
  }
}
