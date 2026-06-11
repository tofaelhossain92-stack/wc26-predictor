import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { settlePredictions } from '@/lib/points'
import { notifyResultIn } from '@/lib/onesignal'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('matches')
    .select('*')
    .order('kickoff_time', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, matches: data })
}

export async function POST(request) {
  const { id, home_goals, away_goals, status } = await request.json()

  const { data: existing } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('id', id)
    .single()

  await supabaseAdmin
    .from('matches')
    .update({ home_goals, away_goals, status })
    .eq('id', id)

  if (status === 'done' && existing?.status !== 'done') {
    await settlePredictions(supabaseAdmin, id, home_goals, away_goals)
    await notifyResultIn(
      existing.home_team, existing.away_team,
      home_goals, away_goals,
      existing.home_flag, existing.away_flag
    )
  }

  return NextResponse.json({ ok: true })
}
