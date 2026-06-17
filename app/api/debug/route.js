import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const FOOTBALL_KEY = process.env.FOOTBALL_API_KEY || '151d22df20a0423e9f1346f8f4a35ce1'

export async function GET() {
  const todayStr = new Date().toISOString().split('T')[0]

  // Check football-data.org
  const fdRes = await fetch(
    `https://api.football-data.org/v4/competitions/2000/matches?dateFrom=${todayStr}&dateTo=${todayStr}`,
    { headers: { 'X-Auth-Token': FOOTBALL_KEY }, cache: 'no-store' }
  )
  const fdData = await fdRes.json()

  // Check what's live in DB
  const nowISO = new Date().toISOString()
  const { data: dbMatches } = await supabaseAdmin
    .from('matches')
    .select('id,home_team,away_team,status,kickoff_time,match_period,api_match_id')
    .or(`status.eq.live,and(status.eq.upcoming,kickoff_time.lte.${nowISO})`)

  return NextResponse.json({
    today: todayStr,
    footballDataOrg: {
      status: fdRes.status,
      matchCount: fdData?.matches?.length || 0,
      error: fdData?.message || null,
      matches: (fdData?.matches || []).map(m => ({
        home: m.homeTeam?.name,
        away: m.awayTeam?.name,
        status: m.status,
        score: m.score?.fullTime,
      }))
    },
    dbLiveMatches: dbMatches || [],
  })
}
// cache bust Wed Jun 17 17:35:40 UTC 2026
