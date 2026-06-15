// POST /api/admin/sync-match
// Fetches live/final score from football-data.org and updates DB

import { NextResponse } from 'next/server'
import { mapStatus }    from '@/lib/football-api'
import { calcPoints }   from '@/lib/points'
import { notifyResultIn } from '@/lib/onesignal'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xtairnvavocsliewquhd.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
  return res.json()
}

async function sbPatch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function POST(request) {
  const { matchId } = await request.json()

  // Get match from DB
  const matches = await sbGet(`matches?id=eq.${matchId}&select=*`)
  const match = matches[0]
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (!match.api_match_id) return NextResponse.json({ error: 'No API match ID set' }, { status: 400 })

  // Fetch from football-data.org
  const apiRes = await fetch(`https://api.football-data.org/v4/matches/${match.api_match_id}`, {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY }
  })
  const apiMatch = await apiRes.json()

  const homeGoals = apiMatch.score?.fullTime?.home ?? apiMatch.score?.halfTime?.home ?? 0
  const awayGoals = apiMatch.score?.fullTime?.away ?? apiMatch.score?.halfTime?.away ?? 0
  const newStatus = mapStatus(apiMatch.status)

  // Never downgrade status
  const status = match.status === 'done' ? 'done'
    : match.status === 'live' && newStatus === 'upcoming' ? 'live'
    : newStatus

  // Update match in DB
  await sbPatch(`matches?id=eq.${matchId}`, { home_goals: homeGoals, away_goals: awayGoals, status })

  // If done and wasn't done before, settle predictions
  if (status === 'done' && match.status !== 'done') {
    const predictions = await sbGet(`predictions?match_id=eq.${matchId}&select=id,user_id,home_goals,away_goals`)
    for (const pred of predictions) {
      const pts = calcPoints(pred, { home_goals: homeGoals, away_goals: awayGoals })
      await sbPatch(`predictions?id=eq.${pred.id}`, { points_earned: pts })
      const allPreds = await sbGet(`predictions?user_id=eq.${pred.user_id}&select=points_earned`)
      const total = allPreds.reduce((sum, p) => sum + (p.points_earned || 0), 0)
      await sbPatch(`users?id=eq.${pred.user_id}`, { points: total })
    }
    await notifyResultIn(
      match.home_team, match.away_team,
      homeGoals, awayGoals,
      match.home_flag, match.away_flag
    ).catch(() => {})
  }

  return NextResponse.json({ ok: true, home_goals: homeGoals, away_goals: awayGoals, status })
}
