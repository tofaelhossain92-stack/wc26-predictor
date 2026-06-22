import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
const FOOTBALL_KEY = process.env.FOOTBALL_API_KEY
const WC_ID = 2000

export async function GET() {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0]
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0]

  const fdRes = await fetch(
    `https://api.football-data.org/v4/competitions/${WC_ID}/matches?dateFrom=${yesterdayStr}&dateTo=${tomorrowStr}`,
    { headers: { 'X-Auth-Token': FOOTBALL_KEY }, cache: 'no-store' }
  )
  const fdData = await fdRes.json()

  return NextResponse.json({
    httpStatus: fdRes.status,
    error: fdData?.message || null,
    matchCount: fdData?.matches?.length || 0,
    matches: (fdData?.matches || []).map(m => ({
      home: m.homeTeam?.name,
      away: m.awayTeam?.name,
      status: m.status,
      utcDate: m.utcDate,
      score: m.score?.fullTime,
    }))
  })
}
