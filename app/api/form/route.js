// GET /api/form?teams=France,Senegal
// Returns last 5 results (W/D/L) for each team using API-Football
// Cached 6 hours to avoid burning request quota

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || '64289a1f1927dda393133add1c5c7124'

// Team name → API-Football team ID
const TEAM_IDS = {
  'France': 2, 'Senegal': 1631, 'Iraq': 82, 'Norway': 1729,
  'Argentina': 26, 'Algeria': 1569, 'Austria': 775, 'Jordan': 805,
  'Portugal': 27, 'Congo DR': 1580, 'England': 47, 'Croatia': 1001,
  'Ghana': 1604, 'Panama': 1826, 'Uzbekistan': 1107, 'Colombia': 44,
  'Germany': 25, 'Curaçao': 13029, "Côte d'Ivoire": 1600, 'Ecuador': 1957,
  'Netherlands': 1044, 'Japan': 29, 'Sweden': 31, 'Tunisia': 1624,
  'Belgium': 1, 'Egypt': 1574, 'IR Iran': 1570, 'New Zealand': 1603,
  'Spain': 9, 'Cabo Verde': 1645, 'Saudi Arabia': 523, 'Uruguay': 17,
  'Mexico': 16, 'Korea Republic': 732, 'Czechia': 770, 'South Africa': 1567,
  'Canada': 2, 'Bosnia & Herz.': 820, 'Qatar': 1596, 'Switzerland': 15,
  'Brazil': 6, 'Morocco': 1603, 'Haiti': 2081, 'Scotland': 1108,
  'USA': 2, 'Paraguay': 1985, 'Australia': 26, 'Türkiye': 571,
}

const formCache = {}
const CACHE_TTL = 6 * 60 * 60 * 1000

async function getTeamForm(teamName) {
  const teamId = TEAM_IDS[teamName]
  if (!teamId) return []

  if (formCache[teamId] && Date.now() - formCache[teamId].ts < CACHE_TTL) {
    return formCache[teamId].form
  }

  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?team=${teamId}&last=5`,
      { headers: { 'x-apisports-key': API_FOOTBALL_KEY } }
    )
    if (!res.ok) return []
    const data = await res.json()
    const form = (data.response || []).map(f => {
      const isHome = f.teams.home.id === teamId
      const gs = isHome ? f.goals.home : f.goals.away
      const gc = isHome ? f.goals.away : f.goals.home
      if (gs == null || gc == null) return null
      return gs > gc ? 'W' : gs < gc ? 'L' : 'D'
    }).filter(Boolean)

    formCache[teamId] = { form, ts: Date.now() }
    return form
  } catch {
    return []
  }
}

export async function GET(req) {
  const teamsParam = new URL(req.url).searchParams.get('teams') || ''
  const teams = teamsParam.split(',').map(t => t.trim()).filter(Boolean)

  const result = {}
  await Promise.all(teams.map(async team => {
    result[team] = await getTeamForm(team)
  }))

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=21600' }
  })
}
