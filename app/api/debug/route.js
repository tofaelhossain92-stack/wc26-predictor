import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const FOOTBALL_KEY = process.env.FOOTBALL_API_KEY || '151d22df20a0423e9f1346f8f4a35ce1'
const WC_ID = 2000

export async function GET() {
  const now      = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const nowISO   = now.toISOString()

  // Check football-data.org
  const fdRes  = await fetch(
    `https://api.football-data.org/v4/competitions/${WC_ID}/matches?dateFrom=${todayStr}&dateTo=${todayStr}`,
    { headers: { 'X-Auth-Token': FOOTBALL_KEY }, cache: 'no-store' }
  )
  const fdData = await fdRes.json()

  // Check DB live/upcoming matches
  const { data: dbMatches } = await supabaseAdmin
    .from('matches')
    .select('id,home_team,away_team,status,kickoff_time,match_period,home_goals,away_goals,manual_override')
    .or(`status.eq.live,and(status.eq.upcoming,kickoff_time.lte.${nowISO})`)
    .order('kickoff_time', { ascending: true })

  return NextResponse.json({
    now:    nowISO,
    today:  todayStr,
    footballDataOrg: {
      status:     fdRes.status,
      matchCount: fdData?.matches?.length || 0,
      error:      fdData?.message || null,
      matches:    (fdData?.matches || []).map(m => ({
        home:    m.homeTeam?.name,
        away:    m.awayTeam?.name,
        status:  m.status,
        score:   m.score?.fullTime,
        elapsed: m.minute || null,
      }))
    },
    dbMatches: dbMatches || [],
  })
}
