// GET /api/live-scores
// Called by frontend every 15s when a live/upcoming match is detected
// Fetches real scores from football-data.org and updates DB
// Also settles predictions when a match finishes

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

async function settleMatch(matchId, homeGoals, awayGoals, match) {
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

export async function GET() {
  try {
    const now = new Date().toISOString()

    // Get all matches that are live or upcoming past kickoff
    const matches = await sbGet(`matches?select=*&or=(status.eq.live,and(status.eq.upcoming,kickoff_time.lte.${now}))&order=kickoff_time.asc`)

    if (!matches?.length) {
      return NextResponse.json({ ok: true, updated: 0 })
    }

    let updated = 0

    for (const match of matches) {
      if (!match.api_match_id) {
        // No API ID — just mark as live if past kickoff
        if (match.status === 'upcoming') {
          await sbPatch(`matches?id=eq.${match.id}`, { status: 'live', home_goals: 0, away_goals: 0 })
          updated++
        }
        continue
      }

      // Fetch from football-data.org
      const apiRes = await fetch(`https://api.football-data.org/v4/matches/${match.api_match_id}`, {
        headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY }
      })
      const apiMatch = await apiRes.json()

      const homeGoals = apiMatch.score?.fullTime?.home ?? apiMatch.score?.halfTime?.home ?? 0
      const awayGoals = apiMatch.score?.fullTime?.away ?? apiMatch.score?.halfTime?.away ?? 0
      const newStatus = mapStatus(apiMatch.status)

      // Update match
      await sbPatch(`matches?id=eq.${match.id}`, {
        home_goals: homeGoals,
        away_goals: awayGoals,
        status: newStatus
      })

      // If just finished, settle predictions and notify
      if (newStatus === 'done' && match.status !== 'done') {
        await settleMatch(match.id, homeGoals, awayGoals, match)
      }

      updated++
    }

    return NextResponse.json({ ok: true, updated })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
