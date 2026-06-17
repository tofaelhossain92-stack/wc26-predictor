import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || '64289a1f1927dda393133add1c5c7124'
const WC26_LEAGUE_ID = 1
const WC26_SEASON = 2026

export async function GET() {
  const todayStr = new Date().toISOString().split('T')[0]

  const [liveRes, todayRes] = await Promise.all([
    fetch(`https://v3.football.api-sports.io/fixtures?league=${WC26_LEAGUE_ID}&season=${WC26_SEASON}&live=all`, {
      headers: { 'x-apisports-key': API_FOOTBALL_KEY }
    }),
    fetch(`https://v3.football.api-sports.io/fixtures?league=${WC26_LEAGUE_ID}&season=${WC26_SEASON}&date=${todayStr}`, {
      headers: { 'x-apisports-key': API_FOOTBALL_KEY }
    })
  ])

  const liveData  = await liveRes.json()
  const todayData = await todayRes.json()

  return NextResponse.json({
    today: todayStr,
    apiKey: API_FOOTBALL_KEY ? '✅ set' : '❌ missing',
    live: {
      count: liveData?.response?.length || 0,
      error: liveData?.errors,
      fixtures: (liveData?.response || []).map(f => ({
        id: f.fixture.id,
        home: f.teams.home.name,
        away: f.teams.away.name,
        status: f.fixture.status.short,
        elapsed: f.fixture.status.elapsed,
        score: f.goals,
        league: f.league.id,
      }))
    },
    todayFixtures: {
      count: todayData?.response?.length || 0,
      error: todayData?.errors,
      fixtures: (todayData?.response || []).map(f => ({
        id: f.fixture.id,
        home: f.teams.home.name,
        away: f.teams.away.name,
        status: f.fixture.status.short,
        elapsed: f.fixture.status.elapsed,
        score: f.goals,
        league: f.league.id,
      }))
    }
  })
}
