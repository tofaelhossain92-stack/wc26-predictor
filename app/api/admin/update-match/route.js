import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ADMIN_PASSWORD = 'wc26admin'

export async function POST(req) {
  const body = await req.json()
  const { password, matchId, status, home_goals, away_goals, match_period, kickoff_time, goal_times } = body

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const updates = {}
  if (status !== undefined)       updates.status       = status
  if (match_period !== undefined) updates.match_period = match_period
  if (kickoff_time)               updates.kickoff_time = new Date(kickoff_time).toISOString()
  if (home_goals !== '')          updates.home_goals   = parseInt(home_goals, 10)
  if (away_goals !== '')          updates.away_goals   = parseInt(away_goals, 10)
  if (goal_times !== undefined)   updates.goal_times   = goal_times

  const { error } = await supabaseAdmin
    .from('matches')
    .update(updates)
    .eq('id', matchId)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
