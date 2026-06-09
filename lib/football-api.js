// football-data.org free tier: 10 requests/minute
// World Cup 2026 competition ID: 2000
const BASE_URL = 'https://api.football-data.org/v4'
const WC_ID    = 2000  // FIFA World Cup competition ID

async function footballFetch(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY },
    next: { revalidate: 0 }
  })
  if (!res.ok) throw new Error(`Football API error: ${res.status} ${path}`)
  return res.json()
}

// Fetch all matches for today (or a specific date)
export async function fetchTodayMatches() {
  const today = new Date().toISOString().split('T')[0]
  return footballFetch(`/competitions/${WC_ID}/matches?dateFrom=${today}&dateTo=${today}`)
}

// Fetch matches that are FINISHED and not yet synced
export async function fetchFinishedMatches() {
  const data = await footballFetch(`/competitions/${WC_ID}/matches?status=FINISHED`)
  return data.matches || []
}

// Fetch a single match by its API ID
export async function fetchMatch(apiMatchId) {
  return footballFetch(`/matches/${apiMatchId}`)
}

// Map football-data.org status to our status
export function mapStatus(apiStatus) {
  switch (apiStatus) {
    case 'SCHEDULED':
    case 'TIMED':     return 'upcoming'
    case 'IN_PLAY':
    case 'PAUSED':    return 'live'
    case 'FINISHED':  return 'done'
    default:          return 'upcoming'
  }
}
