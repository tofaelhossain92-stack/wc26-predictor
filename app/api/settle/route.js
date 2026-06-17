// POST /api/settle?secret=wc26cron2026
// Force-recalculates points for all finished matches
// Use this anytime points seem wrong

import { NextResponse } from 'next/server'
import { calcPoints }   from '@/lib/points'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xtairnvavocsliewquhd.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const CRON_SECRET  = process.env.CRON_SECRET || 'wc26cron2026'

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Accept': 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    console.error(`[settle] sbGet error ${res.status} for ${path}:`, text)
    return []
  }
  return res.json()
}

async function sbPatch(path, body) {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

export async function GET(req) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Get all finished matches with valid scores
  const matches = await sbGet(`matches?status=eq.done&home_goals=not.is.null&select=id,home_team,away_team,home_goals,away_goals`)

  if (!Array.isArray(matches)) {
    return NextResponse.json({ ok: false, error: 'Failed to fetch matches', raw: matches }, { status: 500 })
  }

  let settled = 0, skipped = 0

  for (const match of matches) {
    if (match.home_goals === null || match.home_goals === undefined) continue
    if (match.away_goals === null || match.away_goals === undefined) continue
    const predictions = await sbGet(`predictions?match_id=eq.${match.id}&select=id,user_id,home_goals,away_goals`)
    if (!predictions?.length) { skipped++; continue }

    for (const pred of predictions) {
      const pts = calcPoints(pred, { home_goals: match.home_goals, away_goals: match.away_goals })
      await sbPatch(`predictions?id=eq.${pred.id}`, { points_earned: pts })
    }
    settled++
  }

  // Recalculate all user totals
  const users = await sbGet(`users?select=id`)
  for (const user of users) {
    const preds = await sbGet(`predictions?user_id=eq.${user.id}&select=points_earned`)
    const total = preds.reduce((sum, p) => sum + (p.points_earned || 0), 0)
    await sbPatch(`users?id=eq.${user.id}`, { points: total })
  }

  return NextResponse.json({ ok: true, matches_settled: settled, matches_skipped: skipped })
}
