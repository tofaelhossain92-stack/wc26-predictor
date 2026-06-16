// scripts/fix-fixture.js
// Fetches the full WC26 fixture from football-data.org and upserts missing matches into Supabase
// Run with: node scripts/fix-fixture.js

const FOOTBALL_API_KEY   = '151d22df20a0423e9f1346f8f4a35ce1'
const SUPABASE_URL       = 'https://xtairnvavocsliewquhd.supabase.co'
const SUPABASE_KEY       = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YWlybnZhdm9jc2xpZXdxdWhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk0NTM5NCwiZXhwIjoyMDk2NTIxMzk0fQ.EC_GU4lhbi6XHjB4S5bpmMc4r5Oi5Jw5lTqdl9btXOA'

// ── Flag map ────────────────────────────────────────────────────────────────
const FLAG_MAP = {
  'Mexico': '🇲🇽', 'South Africa': '🇿🇦', 'Korea Republic': '🇰🇷',
  'South Korea': '🇰🇷', 'Republic of Korea': '🇰🇷',
  'Czechia': '🇨🇿', 'Czech Republic': '🇨🇿',
  'Canada': '🇨🇦',
  'Bosnia and Herzegovina': '🇧🇦', 'Bosnia & Herz.': '🇧🇦',
  'Bosnia-Herzegovina': '🇧🇦', 'Bosnia & Herzegovina': '🇧🇦',
  'Qatar': '🇶🇦', 'Switzerland': '🇨🇭', 'Brazil': '🇧🇷',
  'Morocco': '🇲🇦', 'Haiti': '🇭🇹', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Australia': '🇦🇺', 'Türkiye': '🇹🇷', 'Turkey': '🇹🇷',
  'Germany': '🇩🇪', 'Curaçao': '🇨🇼', 'Curacao': '🇨🇼',
  'Netherlands': '🇳🇱', 'Japan': '🇯🇵', 'Sweden': '🇸🇪',
  'Tunisia': '🇹🇳', 'Spain': '🇪🇸',
  'Cabo Verde': '🇨🇻', 'Cape Verde': '🇨🇻', 'Cape Verde Islands': '🇨🇻',
  'Belgium': '🇧🇪', 'Egypt': '🇪🇬',
  'Saudi Arabia': '🇸🇦', 'Uruguay': '🇺🇾', 'France': '🇫🇷',
  'Senegal': '🇸🇳', 'Argentina': '🇦🇷', 'Algeria': '🇩🇿',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Croatia': '🇭🇷', 'Portugal': '🇵🇹',
  'Congo DR': '🇨🇩', 'DR Congo': '🇨🇩',
  'Democratic Republic of Congo': '🇨🇩',
  'Democratic Republic of the Congo': '🇨🇩',
  'United States': '🇺🇸', 'USA': '🇺🇸',
  'Paraguay': '🇵🇾', 'Ecuador': '🇪🇨',
  'Colombia': '🇨🇴', 'Panama': '🇵🇦',
  'Iran': '🇮🇷', 'IR Iran': '🇮🇷', 'Iraq': '🇮🇶',
  'Jordan': '🇯🇴', 'New Zealand': '🇳🇿', 'Norway': '🇳🇴',
  'Austria': '🇦🇹', 'Ghana': '🇬🇭',
  "Côte d'Ivoire": '🇨🇮', "Cote d'Ivoire": '🇨🇮', 'Ivory Coast': '🇨🇮',
  'Uzbekistan': '🇺🇿',
}

// ── Team name normalizer — maps API names → our DB names ────────────────────
const TEAM_NORMALIZE = {
  // USA
  'United States': 'USA',
  // Iran
  'Iran': 'IR Iran',
  // Bosnia
  'Bosnia and Herzegovina': 'Bosnia & Herz.',
  'Bosnia-Herzegovina': 'Bosnia & Herz.',
  'Bosnia & Herzegovina': 'Bosnia & Herz.',
  // Congo
  'Congo DR': 'Congo DR',
  'DR Congo': 'Congo DR',
  'Democratic Republic of Congo': 'Congo DR',
  'Democratic Republic of the Congo': 'Congo DR',
  // Turkey
  'Türkiye': 'Türkiye',
  'Turkey': 'Türkiye',
  // Korea
  'Korea Republic': 'Korea Republic',
  'South Korea': 'Korea Republic',
  'Republic of Korea': 'Korea Republic',
  // Cape Verde
  'Cape Verde': 'Cabo Verde',
  'Cape Verde Islands': 'Cabo Verde',
  // Curacao
  'Curacao': 'Curaçao',
  // Ivory Coast
  'Ivory Coast': "Côte d'Ivoire",
  "Cote d'Ivoire": "Côte d'Ivoire",
  'Côte d\'Ivoire': "Côte d'Ivoire",
}

// ── Group letter from API's group field ─────────────────────────────────────
function extractGroup(apiMatch) {
  // football-data.org returns e.g. "GROUP_A" or stage "GROUP_STAGE"
  const g = apiMatch.group || ''
  const match = g.match(/GROUP_([A-Z])/i) || g.match(/([A-Z])$/)
  if (match) return match[1].toUpperCase()
  // Knockout stages
  const stage = (apiMatch.stage || '').replace(/_/g, ' ')
  return stage || 'KO'
}

function normalizeTeam(name) {
  return TEAM_NORMALIZE[name] || name
}

function getFlag(name) {
  return FLAG_MAP[name] || '🏳️'
}

// ── Supabase helpers ─────────────────────────────────────────────────────────
async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  })
  return res.json()
}

async function sbPatch(path, body) {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

async function sbInsert(rows) {
  let inserted = 0, skipped = 0
  for (const row of rows) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/matches`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(row),
    })
    if (res.ok) {
      console.log(`   \u2705 Inserted: ${row.home_team} vs ${row.away_team}`)
      inserted++
    } else {
      const text = await res.text()
      const parsed = JSON.parse(text)
      if (parsed.code === '23505') {
        console.log(`   \u23ed\ufe0f  Skipped (duplicate): ${row.home_team} vs ${row.away_team}`)
        skipped++
      } else {
        console.log(`   \u274c Failed: ${row.home_team} vs ${row.away_team} -- ${parsed.message}`)
      }
    }
  }
  return { inserted, skipped }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log('📡 Fetching WC26 fixture from football-data.org...')
  const apiRes = await fetch('https://api.football-data.org/v4/competitions/2000/matches', {
    headers: { 'X-Auth-Token': FOOTBALL_API_KEY }
  })
  if (!apiRes.ok) throw new Error(`API error ${apiRes.status}: ${await apiRes.text()}`)
  const { matches: apiMatches } = await apiRes.json()
  console.log(`✅ Got ${apiMatches.length} matches from API`)

  console.log('\n📦 Fetching existing matches from Supabase...')
  const dbMatches = await sbGet('matches?select=id,home_team,away_team,kickoff_time,api_match_id,status')
  console.log(`✅ Found ${dbMatches.length} matches in DB`)

  // Build lookup: "HomeTeam|AwayTeam" → db row
  const dbByTeams = {}
  for (const m of dbMatches) {
    const key = `${m.home_team}|${m.away_team}`
    dbByTeams[key] = m
  }

  const toInsert   = []
  const toUpdateId = []
  let alreadyOk    = 0

  for (const apiM of apiMatches) {
    const home     = normalizeTeam(apiM.homeTeam?.name || '')
    const away     = normalizeTeam(apiM.awayTeam?.name || '')
    const kickoff  = new Date(apiM.utcDate).toISOString()
    const apiId    = apiM.id
    const groupKey = extractGroup(apiM)
    const key      = `${home}|${away}`

    if (!home || !away) continue

    const existing = dbByTeams[key]

    if (existing) {
      if (!existing.api_match_id || String(existing.api_match_id) !== String(apiId)) {
        toUpdateId.push({ dbId: existing.id, apiId, home, away })
      } else {
        alreadyOk++
      }
    } else {
      toInsert.push({
        home_team:    home,
        away_team:    away,
        home_flag:    getFlag(home),
        away_flag:    getFlag(away),
        kickoff_time: kickoff,
        group_name:   groupKey,
        status:       'upcoming',
        api_match_id: apiId,
      })
    }
  }

  console.log(`\n📊 Audit:`)
  console.log(`   ✅ Already correct: ${alreadyOk}`)
  console.log(`   🔄 Need api_match_id update: ${toUpdateId.length}`)
  console.log(`   ➕ Missing — will insert: ${toInsert.length}`)

  // Update api_match_ids
  if (toUpdateId.length > 0) {
    console.log('\n🔄 Updating api_match_id...')
    for (const { dbId, apiId, home, away } of toUpdateId) {
      await sbPatch(`matches?id=eq.${dbId}`, { api_match_id: apiId })
      console.log(`   ✅ ${home} vs ${away} → api_match_id: ${apiId}`)
    }
  }

  // Insert missing matches
  if (toInsert.length > 0) {
    console.log('\n➕ Inserting missing matches:')
    toInsert.forEach(m =>
      console.log(`   ${m.home_team} vs ${m.away_team} | ${m.group_name} | ${m.kickoff_time} | flags: ${m.home_flag}${m.away_flag}`)
    )
    const result = await sbInsert(toInsert)
    console.log('\n✅ Done! Inserted: ' + result.inserted + ', skipped: ' + result.skipped)
  }

  console.log('\n🎉 Fixture sync complete!')
}

run().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
