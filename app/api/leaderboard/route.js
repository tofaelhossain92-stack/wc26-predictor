// GET /api/leaderboard
// Returns all users sorted by points, with their full prediction history

import { NextResponse } from 'next/server'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xtairnvavocsliewquhd.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    cache: 'no-store',
  })
  return res.json()
}

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Fetch all users sorted by points
    const users = await sbGet('users?select=id,name,avatar,points,created_at&order=points.desc')

    // Fetch all predictions with minimal match details (only fields actually used)
    const predictions = await sbGet('predictions?select=id,user_id,home_goals,away_goals,points_earned,submitted_at,match:matches(id,group_name,home_team,away_team,home_flag,away_flag,status,home_goals,away_goals)&order=submitted_at.desc')

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
          pointsEarned: parseInt(p.points_earned, 10) || 0,
          submittedAt:  p.submitted_at,
        })),
      stats: computeStats(predictions.filter(p => p.user_id === user.id)),
    }))

    return NextResponse.json({ ok: true, leaderboard: enriched }, { headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' } })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function computeStats(predictions) {
  const finished = predictions.filter(p => p.match?.status === 'done')
  const correct  = finished.filter(p => parseInt(p.points_earned, 10) >= 3)
  const exact    = finished.filter(p => parseInt(p.points_earned, 10) === 10)
  const highGoal = predictions.filter(p => (parseInt(p.home_goals,10) + parseInt(p.away_goals,10)) >= 4)

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
