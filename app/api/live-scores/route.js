// GET /api/live-scores
// Uses API-Football (api-football.com) for accurate live data
// Called by cron-job.org every 2 minutes

import { NextResponse }              from 'next/server'
import { calcPoints }                from '@/lib/points'
import { notifyResultIn, sendPush }  from '@/lib/onesignal'
import { supabaseAdmin }             from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || '64289a1f1927dda393133add1c5c7124'
const WC26_LEAGUE_ID   = 1 // FIFA World Cup
const WC26_SEASON      = 2026

// ── API-Football helpers ──────────────────────────────────────────────────
async function apiFetch(path) {
  const res = await fetch(`https://v3.football.api-sports.io/${path}`, {
    headers: {
      'x-apisports-key': API_FOOTBALL_KEY,
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    console.error(`[api-football] ${res.status} for ${path}`)
    return null
  }
  return res.json()
}

// Map API-Football status → our status
function mapStatus(apiStatus) {
  const LIVE    = ['1H', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE']
  const HT      = ['HT']
  const DONE    = ['FT', 'AET', 'PEN']
  if (LIVE.includes(apiStatus))     return 'live'
  if (HT.includes(apiStatus))       return 'live' // half time is still live
  if (DONE.includes(apiStatus))     return 'done'
  return 'upcoming'
}

function mapPeriod(apiStatus, elapsed) {
  if (apiStatus === 'HT')  return 'HT'
  if (['FT','AET','PEN'].includes(apiStatus)) return 'FT'
  if (elapsed != null)     return `${elapsed}'`
  return null
}

// ── Settlement (using supabaseAdmin for reliable writes) ──────────────────
async function settleMatch(matchId, homeGoals, awayGoals, match) {
  if (homeGoals == null || awayGoals == null) return

  const { data: preds } = await supabaseAdmin
    .from('predictions')
    .select('id, user_id, home_goals, away_goals')
    .eq('match_id', matchId)

  if (!preds?.length) return

  for (const pred of preds) {
    const pts = calcPoints(pred, { home_goals: homeGoals, away_goals: awayGoals })
    await supabaseAdmin.from('predictions').update({ points_earned: pts }).eq('id', pred.id)
  }

  // Recalculate totals for affected users
  const userIds = [...new Set(preds.map(p => p.user_id))]
  for (const userId of userIds) {
    const { data: allPreds } = await supabaseAdmin
      .from('predictions').select('points_earned').eq('user_id', userId)
    const total = (allPreds || []).reduce((s, p) => s + (parseInt(p.points_earned, 10) || 0), 0)
    await supabaseAdmin.from('users').update({ points: total }).eq('id', userId)
  }

  await notifyResultIn(
    match.home_team, match.away_team,
    homeGoals, awayGoals,
    match.home_flag, match.away_flag
  ).catch(() => {})
}

// ── Main handler ──────────────────────────────────────────────────────────
export async function GET() {
  try {
    const now    = new Date()
    const nowISO = now.toISOString()

    // 1. Get live + just-started upcoming matches from our DB
    const { data: matches } = await supabaseAdmin
      .from('matches')
      .select('*')
      .or(`status.eq.live,and(status.eq.upcoming,kickoff_time.lte.${nowISO})`)
      .order('kickoff_time', { ascending: true })

    if (!matches?.length) return NextResponse.json({ ok: true, updated: 0 })

    // 2. Fetch live fixtures from API-Football for WC26
    const liveData = await apiFetch(`fixtures?league=${WC26_LEAGUE_ID}&season=${WC26_SEASON}&live=all`)
    const liveFixtures = liveData?.response || []

    // Also fetch today's finished matches in case cron missed the live window
    const todayStr = now.toISOString().split('T')[0]
    const todayData = await apiFetch(`fixtures?league=${WC26_LEAGUE_ID}&season=${WC26_SEASON}&date=${todayStr}`)
    const todayFixtures = todayData?.response || []

    // Merge: live takes priority, today fills in finished
    const allFixtures = [...liveFixtures]
    for (const f of todayFixtures) {
      if (!allFixtures.find(x => x.fixture.id === f.fixture.id)) {
        allFixtures.push(f)
      }
    }

    // Build lookup by fixture ID
    const fixtureById = {}
    for (const f of allFixtures) fixtureById[f.fixture.id] = f

    // Also build lookup by team names for matches without api_match_id
    const fixtureByTeams = {}
    for (const f of allFixtures) {
      const key = `${f.teams.home.name}|${f.teams.away.name}`
      fixtureByTeams[key] = f
    }

    let updated = 0

    for (const match of matches) {
      // Find fixture in API data
      let fixture = match.api_match_id ? fixtureById[parseInt(match.api_match_id)] : null

      // Fallback: try matching by team names
      if (!fixture) {
        const key = `${match.home_team}|${match.away_team}`
        fixture = fixtureByTeams[key]
      }

      if (!fixture) {
        // No live data found — if upcoming and past kickoff, mark live with 0-0
        if (match.status === 'upcoming') {
          await supabaseAdmin.from('matches').update({
            status: 'live', home_goals: 0, away_goals: 0, match_period: `0'`
          }).eq('id', match.id)
          updated++
        }
        continue
      }

      const apiStatus  = fixture.fixture.status.short
      const elapsed    = fixture.fixture.status.elapsed
      const homeGoals  = fixture.goals.home  ?? 0
      const awayGoals  = fixture.goals.away  ?? 0
      const newStatus  = mapStatus(apiStatus)
      const matchPeriod = mapPeriod(apiStatus, elapsed)

      // Save api_match_id if we found it via team name lookup
      if (!match.api_match_id && fixture.fixture.id) {
        await supabaseAdmin.from('matches')
          .update({ api_match_id: fixture.fixture.id })
          .eq('id', match.id)
      }

      // Track goal times
      const prevHome   = match.home_goals ?? 0
      const prevAway   = match.away_goals ?? 0
      let goalTimes    = []
      try {
        goalTimes = Array.isArray(match.goal_times)
          ? match.goal_times
          : JSON.parse(match.goal_times || '[]')
      } catch { goalTimes = [] }

      // Get goal events from API for accurate goal minutes
      const events = fixture.events || []
      const goalEvents = events.filter(e => e.type === 'Goal' && e.detail !== 'Missed Penalty')
      const homeGoalEvents = goalEvents.filter(e => e.team.id === fixture.teams.home.id)
      const awayGoalEvents = goalEvents.filter(e => e.team.id === fixture.teams.away.id)

      // Rebuild goal times from API events (more accurate than estimated minutes)
      if (goalEvents.length > 0 && goalEvents.length !== goalTimes.length) {
        goalTimes = [
          ...homeGoalEvents.map(e => ({ team: 'home', min: e.time.elapsed + (e.time.extra || 0), player: e.player?.name })),
          ...awayGoalEvents.map(e => ({ team: 'away',  min: e.time.elapsed + (e.time.extra || 0), player: e.player?.name })),
        ].sort((a, b) => a.min - b.min)
      }

      // Win probability
      const totalMins = Math.min(elapsed || 0, 90)
      const timeLeft  = Math.max(0, 90 - totalMins)
      const scoreDiff = homeGoals - awayGoals
      let homeWin, draw, awayWin
      if (newStatus === 'done') {
        homeWin = homeGoals > awayGoals ? 100 : 0
        draw    = homeGoals === awayGoals ? 100 : 0
        awayWin = awayGoals > homeGoals ? 100 : 0
      } else {
        const scoreShift = scoreDiff * (15 + (90 - timeLeft) * 0.3)
        homeWin = Math.max(5, Math.min(90, 45 + scoreShift))
        awayWin = Math.max(5, Math.min(90, 30 - scoreShift))
        draw    = Math.max(5, Math.min(50, 100 - homeWin - awayWin))
        const total = homeWin + draw + awayWin
        homeWin  = Math.round(homeWin  / total * 100)
        draw     = Math.round(draw     / total * 100)
        awayWin  = 100 - homeWin - draw
      }

      // Update DB
      await supabaseAdmin.from('matches').update({
        home_goals:   homeGoals,
        away_goals:   awayGoals,
        status:       newStatus,
        match_period: matchPeriod,
        goal_times:   JSON.stringify(goalTimes),
        win_prob:     JSON.stringify({ home: homeWin, draw, away: awayWin }),
      }).eq('id', match.id)

      // Goal notification
      if (homeGoals > prevHome || awayGoals > prevAway) {
        const scoredTeam = homeGoals > prevHome
          ? { team: match.home_team, flag: match.home_flag }
          : { team: match.away_team, flag: match.away_flag }
        await sendPush({
          title:   `⚽ GOAL! ${scoredTeam.flag} ${scoredTeam.team}!`,
          message: `${match.home_flag} ${match.home_team} ${homeGoals}–${awayGoals} ${match.away_team} ${match.away_flag}`,
          url:     '/game?tab=predict',
        }).catch(() => {})
      }

      // Settle predictions on full time
      if (newStatus === 'done') {
        const justFinished = match.status !== 'done'
        if (justFinished) {
          await settleMatch(match.id, homeGoals, awayGoals, match)
        } else {
          // Re-settle if any predictions still have 0 points
          const { data: allPreds } = await supabaseAdmin
            .from('predictions').select('id,points_earned').eq('match_id', match.id)
          if (allPreds?.some(p => parseInt(p.points_earned, 10) === 0)) {
            await settleMatch(match.id, homeGoals, awayGoals, match)
          }
        }
      }

      updated++
    }

    return NextResponse.json({ ok: true, updated })

  } catch (err) {
    console.error('[live-scores]', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
