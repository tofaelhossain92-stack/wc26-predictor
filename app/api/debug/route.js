import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data: matches } = await supabaseAdmin
    .from('matches')
    .select('id,home_team,away_team,status,kickoff_time,home_goals,away_goals,match_period')
    .in('status', ['live', 'upcoming'])
    .order('kickoff_time', { ascending: true })
    .limit(10)

  return NextResponse.json({ ok: true, matches })
}
