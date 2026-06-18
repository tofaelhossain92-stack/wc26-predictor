import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const FOOTBALL_KEY = process.env.FOOTBALL_API_KEY || '151d22df20a0423e9f1346f8f4a35ce1'
const WC_ID = 2000

export async function GET() {
  const now          = new Date()
  const todayStr     = now.toISOString().split('T')[0]
  const tomorrowStr  = new Date(now.getTime() + 86400000).toISOString().split('T')[0]
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0]

  const fdRes  = await fetch(
    `https://api.football-data.org/v4/competitions/${WC_ID}/matches?dateFrom=${yesterdayStr}&dateTo=${tomorrowStr}`,
    { headers: { 'X-Auth-Token': FOOTBALL_KEY }, cache: 'no-store' }
  )
  const fdData = await fdRes.json()

  // DB live/upcoming
  const { data: dbMatches } = await supabaseAdmin
    .from('matches')
    .select('id,home_team,away_team,status,kickoff_time,home_goals,away_goals,match_period')
    .or(`status.eq.live,and(status.eq.upcoming,kickoff_time.lte.${now.toISOString()})`)
    .order('kickoff_time', { ascending: true })

  return NextResponse.json({
    serverTime: now.toISOString(),
    dateRange: `${yesterdayStr} → ${tomorrowStr}`,
    footballDataOrg: {
      httpStatus: fdRes.status,
      error: fdData?.message || fdData?.error || null,
      totalMatches: fdData?.matches?.length || 0,
      matches: (fdData?.matches || []).map(m => ({
        home:    m.homeTeam?.name,
        away:    m.awayTeam?.name,
        status:  m.status,
        utcDate: m.utcDate,
        score:   m.score?.fullTime,
      }))
    },
    dbLiveMatches: dbMatches || [],
  })
}
