// POST /api/chatbot
// Stats-lookup chatbot — answers questions about matches, standings, predictions
// Uses Claude Haiku for cheap, fast responses. Controlled by CHATBOT_ENABLED env var.

import { NextResponse }  from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calcStandings } from '@/lib/standings'

export const dynamic = 'force-dynamic'

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const ENV_ENABLED = process.env.CHATBOT_ENABLED !== 'false' // master kill switch via Vercel env var

export async function POST(req) {
  // Master kill switch (Vercel env var) — fastest way to fully disable
  if (!ENV_ENABLED) {
    return NextResponse.json({ ok: false, error: 'Chatbot is currently disabled' }, { status: 503 })
  }
  if (!ANTHROPIC_KEY) {
    return NextResponse.json({ ok: false, error: 'Chatbot not configured' }, { status: 503 })
  }

  // DB-backed toggle — lets admin flip it on/off instantly without redeploying
  const { data: setting } = await supabaseAdmin
    .from('app_settings').select('value').eq('key', 'chatbot_enabled').single()
  if (setting && setting.value === false) {
    return NextResponse.json({ ok: false, error: 'Chatbot is currently disabled' }, { status: 503 })
  }

  const { message, history = [] } = await req.json().catch(() => ({}))
  if (!message) {
    return NextResponse.json({ ok: false, error: 'No message provided' }, { status: 400 })
  }

  // ── Gather context: matches, standings, leaderboard ────────────────────
  const { data: matches } = await supabaseAdmin
    .from('matches')
    .select('id,home_team,away_team,home_goals,away_goals,status,kickoff_time,group_name,match_period')
    .order('kickoff_time', { ascending: true })

  const { groups } = calcStandings(matches || [])

  const { data: users } = await supabaseAdmin.from('users').select('id,name,points').order('points', { ascending: false })

  const now = new Date().toISOString()

  // Build a compact text summary of relevant data for Claude's context
  const upcomingMatches = (matches || [])
    .filter(m => m.status === 'upcoming' && m.kickoff_time > now)
    .slice(0, 15)
    .map(m => `${m.home_team} vs ${m.away_team} — ${new Date(m.kickoff_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} (Group ${m.group_name})`)
    .join('\n')

  const liveMatches = (matches || [])
    .filter(m => m.status === 'live')
    .map(m => `${m.home_team} ${m.home_goals}-${m.away_goals} ${m.away_team} (${m.match_period || 'live'})`)
    .join('\n') || 'None currently live'

  const recentResults = (matches || [])
    .filter(m => m.status === 'done')
    .slice(-15)
    .map(m => `${m.home_team} ${m.home_goals}-${m.away_goals} ${m.away_team} (Group ${m.group_name})`)
    .join('\n')

  const standingsText = Object.entries(groups)
    .map(([g, teams]) => `Group ${g}: ` + teams.map((t, i) => `${i+1}.${t.name}(${t.pts}pts)`).join(', '))
    .join('\n')

  const leaderboardText = (users || [])
    .map((u, i) => `${i+1}. ${u.name} — ${u.points}pts`)
    .join('\n')

  const systemPrompt = `You are a friendly stats assistant for "WC26 Predictor" — a World Cup 2026 prediction app used by a small group of friends. Answer questions about matches, standings, and the leaderboard using ONLY the data provided below. Be concise and conversational — 1-3 sentences usually. If asked something not covered by this data (e.g. real-world news, opinions, predictions about future results), politely say you only know app data and can't help with that. Never make up scores, dates, or standings that aren't in the data below.

CURRENT DATE/TIME: ${new Date().toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}

LIVE MATCHES:
${liveMatches}

UPCOMING MATCHES (next 15):
${upcomingMatches || 'None scheduled'}

RECENT RESULTS (last 15):
${recentResults || 'None yet'}

GROUP STANDINGS:
${standingsText || 'No standings yet'}

LEADERBOARD:
${leaderboardText || 'No predictions yet'}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: systemPrompt,
        messages: [
          ...history.slice(-6), // keep last few turns for context, cap cost
          { role: 'user', content: message },
        ],
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[chatbot] Anthropic API error:', text)
      return NextResponse.json({ ok: false, error: 'Failed to get response' }, { status: 500 })
    }

    const data = await res.json()
    const reply = data.content?.find(c => c.type === 'text')?.text || "Sorry, I couldn't generate a response."

    return NextResponse.json({ ok: true, reply })

  } catch (err) {
    console.error('[chatbot]', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
