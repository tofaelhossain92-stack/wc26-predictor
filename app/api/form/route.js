// GET /api/form?teams=France,Senegal
// Returns last 5 results (W/D/L) for each team from football-data.org
// Cached for 6 hours to avoid rate limits

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY || '151d22df20a0423e9f1346f8f4a35ce1'

// Team name → football-data.org team ID mapping
const TEAM_IDS = {
  'France': 773, 'Senegal': 907, 'Iraq': 858, 'Norway': 761,
  'Argentina': 762, 'Algeria': 1569, 'Austria': 816, 'Jordan': 11096,
  'Portugal': 765, 'Congo DR': 1580, 'England': 770, 'Croatia': 799,
  'Ghana': 873, 'Panama': 782, 'Uzbekistan': 2225, 'Colombia': 779,
  'Germany': 759, 'Curaçao': 13029, "Côte d'Ivoire": 892, 'Ecuador': 780,
  'Netherlands': 764, 'Japan': 827, 'Sweden': 760, 'Tunisia': 907,
  'Belgium': 805, 'Egypt': 882, 'IR Iran': 803, 'New Zealand': 834,
  'Spain': 760, 'Cabo Verde': 1645, 'Saudi Arabia': 833, 'Uruguay': 776,
  'Mexico': 764, 'Korea Republic': 732, 'Czechia': 798, 'South Africa': 863,
  'Canada': 788, 'Bosnia & Herz.': 820, 'Qatar': 833, 'Switzerland': 788,
  'Brazil': 763, 'Morocco': 1580, 'Haiti': 2081, 'Scotland': 1160,
  'USA': 762, 'Paraguay': 781, 'Australia': 835, 'Türkiye': 769,
}

const cache = {}
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

async function getTeamForm(teamId) {
  if (cache[teamId] && Date.now() - cache[teamId].ts < CACHE_TTL) {
    return cache[teamId].form
  }

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/teams/${teamId}/matches?status=FINISHED&limit=5`,
      { headers: { 'X-Auth-Token': FOOTBALL_API_KEY }, next: { revalidate: 21600 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    const form = (data.matches || []).slice(-5).map(m => {
      const isHome = m.homeTeam.id === teamId
      const gs = isHome ? m.score.fullTime.home : m.score.fullTime.away
      const gc = isHome ? m.score.fullTime.away : m.score.fullTime.home
      return gs > gc ? 'W' : gs < gc ? 'L' : 'D'
    })
    cache[teamId] = { form, ts: Date.now() }
    return form
  } catch {
    return []
  }
}

export async function GET(req) {
  const teamsParam = new URL(req.url).searchParams.get('teams') || ''
  const teams = teamsParam.split(',').filter(Boolean)

  const result = {}
  await Promise.all(
    teams.map(async team => {
      const id = TEAM_IDS[team.trim()]
      if (id) result[team.trim()] = await getTeamForm(id)
      else result[team.trim()] = []
    })
  )

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=21600' }
  })
}
