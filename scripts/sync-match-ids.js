// Run with: node scripts/sync-match-ids.js
// Fetches all WC26 matches from football-data.org and updates api_match_id in Supabase

const FOOTBALL_API_KEY = '151d22df20a0423e9f1346f8f4a35ce1'
const SUPABASE_URL     = 'https://xtairnvavocsliewquhd.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YWlybnZhdm9jc2xpZXdxdWhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk0NTM5NCwiZXhwIjoyMDk2NTIxMzk0fQ.EC_GU4lhbi6XHjB4S5bpmMc4r5Oi5Jw5lTqdl9btXOA'

async function run() {
  // 1. Fetch all WC26 matches from API
  console.log('Fetching matches from football-data.org...')
  const res = await fetch('https://api.football-data.org/v4/competitions/2000/matches', {
    headers: { 'X-Auth-Token': FOOTBALL_API_KEY }
  })
  const data = await res.json()
  const apiMatches = data.matches || []
  console.log(`Found ${apiMatches.length} matches from API`)

  // 2. Fetch all matches from our DB
  const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/matches?select=id,home_team,away_team,kickoff_time,api_match_id`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  })
  const dbMatches = await dbRes.json()
  console.log(`Found ${dbMatches.length} matches in DB`)

  // 3. Match by kickoff time
  let updated = 0
  for (const dbMatch of dbMatches) {
    if (dbMatch.api_match_id) {
      console.log(`⏭️  Skipping ${dbMatch.home_team} vs ${dbMatch.away_team} — already has ID`)
      continue
    }

    const dbKickoff = new Date(dbMatch.kickoff_time).getTime()

    const apiMatch = apiMatches.find(m => {
      const apiKickoff = new Date(m.utcDate).getTime()
      return Math.abs(apiKickoff - dbKickoff) < 5 * 60 * 1000 // within 5 mins
    })

    if (!apiMatch) {
      console.log(`❌ No API match found for ${dbMatch.home_team} vs ${dbMatch.away_team} at ${dbMatch.kickoff_time}`)
      continue
    }

    // Update in DB
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/matches?id=eq.${dbMatch.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ api_match_id: apiMatch.id })
    })

    if (updateRes.ok) {
      console.log(`✅ Updated ${dbMatch.home_team} vs ${dbMatch.away_team} → api_match_id: ${apiMatch.id}`)
      updated++
    }
  }

  console.log(`\nDone! Updated ${updated} matches.`)
}

run().catch(console.error)
