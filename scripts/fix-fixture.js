// scripts/fix-fixture.js
// Fetches the full WC26 fixture from football-data.org and upserts missing matches into Supabase
// Run with: node scripts/fix-fixture.js

const FOOTBALL_API_KEY   = '151d22df20a0423e9f1346f8f4a35ce1'
const SUPABASE_URL       = 'https://xtairnvavocsliewquhd.supabase.co'
const SUPABASE_KEY       = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YWlybnZhdm9jc2xpZXdxdWhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk0NTM5NCwiZXhwIjoyMDk2NTIxMzk0fQ.EC_GU4lhbi6XHjB4S5bpmMc4r5Oi5Jw5lTqdl9btXOA'

// ── Flag map ────────────────────────────────────────────────────────────────
const FLAG_MAP = {
  'Mexico': '🇲🇽', 'South Africa': '🇿🇦', 'Korea Republic': '🇰🇷',
  'Czechia': '🇨🇿', 'Czech Republic': '🇨🇿', 'Canada': '🇨🇦',
  'Bosnia and Herzegovina': '🇧🇦', 'Bosnia & Herz.': '🇧🇦',
  'Qatar': '🇶🇦', 'Switzerland': '🇨🇭', 'Brazil': '🇧🇷',
  'Morocco': '🇲🇦', 'Haiti': '🇭🇹', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Australia': '🇦🇺', 'Türkiye': '🇹🇷', 'Turkey': '🇹🇷',
  'Germany': '🇩🇪', 'Curaçao': '🇨🇼', 'Curacao': '🇨🇼',
  'Netherlands': '🇳🇱', 'Japan': '🇯🇵', 'Sweden': '🇸🇪',
  'Tunisia': '🇹🇳', 'Spain': '🇪🇸', 'Cabo Verde': '🇨🇻',
  'Cape Verde': '🇨🇻', 'Belgium': '🇧🇪', 'Egypt': '🇪🇬',
  'Saudi Arabia': '🇸🇦', 'Uruguay': '🇺🇾', 'France': '🇫🇷',
  'Senegal': '🇸🇳', 'Argentina': '🇦🇷', 'Algeria': '🇩🇿',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Croatia': '🇭🇷', 'Portugal': '🇵🇹',
  'Congo DR': '🇨🇩', 'DR Congo': '🇨🇩', 'United States': '🇺🇸',
  'USA': '🇺🇸', 'Paraguay': '🇵🇾', 'Ecuador': '🇪🇨',
  'Colombia': '🇨🇴', 'Venezuela': '🇻🇪', 'Chile': '🇨🇱',
  'Peru': '🇵🇪', 'Bolivia': '🇧🇴', 'Panama': '🇵🇦',
  'Costa Rica': '🇨🇷', 'Guatemala': '🇬🇹', 'Honduras': '🇭🇳',
  'Jamaica': '🇯🇲', 'Trinidad and Tobago': '🇹🇹', 'Cuba': '🇨🇺',
  'Iran': '🇮🇷', 'IR Iran': '🇮🇷', 'Iraq': '🇮🇶',
  'Jordan': '🇯🇴', 'New Zealand': '🇳🇿', 'Norway': '🇳🇴',
  'Austria': '🇦🇹', 'Ukraine': '🇺🇦', 'Slovakia': '🇸🇰',
  'Serbia': '🇷🇸', 'Denmark': '🇩🇰', 'Slovenia': '🇸🇮',
  'Albania': '🇦🇱', 'Poland': '🇵🇱', 'Hungary': '🇭🇺',
  'Georgia': '🇬🇪', 'Turkey': '🇹🇷', 'Romania': '🇷🇴',
  'Italy': '🇮🇹', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Northern Ireland': '🇬🇧',
  'Cameroon': '🇨🇲', 'Nigeria': '🇳🇬', 'Ghana': '🇬🇭',
  'Ivory Coast': '🇨🇮', "Côte d'Ivoire": '🇨🇮', 'Mali': '🇲🇱',
  'Burkina Faso': '🇧🇫', 'Angola': '🇦🇴', 'Tanzania': '🇹🇿',
  'Zimbabwe': '🇿🇼', 'Kenya': '🇰🇪', 'Uganda': '🇺🇬',
  'China PR': '🇨🇳', 'China': '🇨🇳', 'Thailand': '🇹🇭',
  'Indonesia': '🇮🇩', 'Vietnam': '🇻🇳', 'India': '🇮🇳',
  'Uzbekistan': '🇺🇿', 'Bahrain': '🇧🇭', 'Oman': '🇴🇲',
  'United Arab Emirates': '🇦🇪', 'Kuwait': '🇰🇼',
  'United States': '🇺🇸',
}

// ── Team name normalizer — maps API names → our DB names ────────────────────
const TEAM_NORMALIZE = {
  'United States': 'USA',
  'Iran': 'IR Iran',
  'Czechia': 'Czechia',
  'Bosnia and Herzegovina': 'Bosnia & Herz.',
  'Congo DR': 'Congo DR',
  "DR Congo": 'Congo DR',
  'Democratic Republic of Congo': 'Congo DR',
  'Türkiye': 'Türkiye',
  'Turkey': 'Türkiye',
  'Korea Republic': 'Korea Republic',
  'Cape Verde': 'Cabo Verde',
  'Curacao': 'Curaçao',
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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/matches`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Insert failed: ${text}`)
  }
  return res.json()
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
    const inserted = await sbInsert(toInsert)
    console.log(`\n✅ Inserted ${inserted.length} matches!`)
  }

  console.log('\n🎉 Fixture sync complete!')
}

run().catch(err => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
