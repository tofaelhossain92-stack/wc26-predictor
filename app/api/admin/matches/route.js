import { NextResponse } from 'next/server'
import { settlePredictions } from '@/lib/points'
import { notifyResultIn } from '@/lib/onesignal'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xtairnvavocsliewquhd.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers,
    }
  })
  return res.json()
}

export async function GET() {
  const data = await sbFetch('matches?select=*&order=kickoff_time.asc')
  return NextResponse.json({ ok: true, matches: data })
}

export async function POST(request) {
  const { id, home_goals, away_goals, status } = await request.json()

  // Get existing match
  const existing = await sbFetch(`matches?id=eq.${id}&select=*`)
  const match = existing[0]

  // Update match
  const updated = await sbFetch(`matches?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ home_goals, away_goals, status }),
  })

  console.log('Updated:', updated)

  // If marking as done, settle predictions and notify
  if (status === 'done' && match?.status !== 'done') {
    const { supabaseAdmin } = await import('@/lib/supabase')
    await settlePredictions(supabaseAdmin, id, home_goals, away_goals)
    await notifyResultIn(
      match.home_team, match.away_team,
      home_goals, away_goals,
      match.home_flag, match.away_flag
    )
  }

  return NextResponse.json({ ok: true, updated })
}
