import { NextResponse } from 'next/server'
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

export async function GET() {
  const matches = await sbGet('matches?select=*&order=kickoff_time.asc')
  return NextResponse.json({ ok: true, matches })
}

export async function POST(request) {
  const { id, home_goals, away_goals, status } = await request.json()

  // Get existing match
  const existing = await sbGet(`matches?id=eq.${id}&select=*`)
  const match = existing[0]
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  // Update match
  const updated = await sbPatch(`matches?id=eq.${id}`, { home_goals, away_goals, status })

  // If marking as done, settle predictions
  if (status === 'done' && match.status !== 'done') {
    // Get all predictions for this match
    const predictions = await sbGet(`predictions?match_id=eq.${id}&select=id,user_id,home_goals,away_goals`)

    for (const pred of predictions) {
      const pts = calcPoints(pred, { home_goals, away_goals })

      // Update prediction points
      await sbPatch(`predictions?id=eq.${pred.id}`, { points_earned: pts })

      // Get user total
      const allPreds = await sbGet(`predictions?user_id=eq.${pred.user_id}&select=points_earned`)
      const total = allPreds.reduce((sum, p) => sum + (p.points_earned || 0), 0)

      // Update user points
      await sbPatch(`users?id=eq.${pred.user_id}`, { points: total })
    }

    // Send notification
    await notifyResultIn(
      match.home_team, match.away_team,
      home_goals, away_goals,
      match.home_flag, match.away_flag
    ).catch(() => {})
  }

  return NextResponse.json({ ok: true, updated })
}
