// GET /api/live-scores
// Uses football-data.org (free tier supports WC 2026)
// Called by cron-job.org every 2 minutes + client every 30s during live matches

import { NextResponse }             from 'next/server'
import { calcPoints }               from '@/lib/points'
import { notifyResultIn, sendPush } from '@/lib/onesignal'
import { supabaseAdmin }            from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const FOOTBALL_KEY = process.env.FOOTBALL_API_KEY || '151d22df20a0423e9f1346f8f4a35ce1'
const WC_ID        = 2000 // football-data.org World Cup competition ID

async function fdFetch(path) {
  const res = await fetch(`https://api.football-data.org/v4/${path}`, {
    headers: { 'X-Auth-Token': FOOTBALL_KEY },
    cache: 'no-store',
  })
  if (!res.ok) {
    console.error(`[football-data] ${res.status} ${path}`)
    return null
  }
  return res.json()
}

function mapStatus(s) {
  if (['SCHEDULED','TIMED'].includes(s))  return 'upcoming'
  if (['IN_PLAY','PAUSED'].includes(s))   return 'live'
  if (['FINISHED'].includes(s))           return 'done'
  return 'upcoming'
}

function mapPeriod(apiMatch, elapsedSecs) {
  const s = apiMatch.status
  if (s === 'PAUSED')   return 'HT'
  if (s === 'FINISHED') return 'FT'
  if (s === 'IN_PLAY') {
    const elapsedMins = Math.floor(elapsedSecs / 60)
    const secs        = elapsedSecs % 60
    const pad         = (n) => String(n).padStart(2, '0')
    if (elapsedMins <= 47) {
      const displayMin = Math.min(elapsedMins, 45)
      return `${displayMin}:${pad(secs)}'`
    } else if (elapsedMins <= 62) {
      return `45+:${pad(secs)}'`
    } else {
      const min2nd = elapsedMins - 22
      if (min2nd <= 90) return `${min2nd}:${pad(secs)}'`
      return `90+:${pad(secs)}'`
    }
  }
  return null
}

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

export async function GET() {
  try {
    const now    = new Date()
    const nowISO = now.toISOString()

    // Get live + just-started matches from DB
    const { data: matches } = await supabaseAdmin
      .from('matches')
      .select('id,home_team,away_team,status,kickoff_time,home_goals,away_goals,home_flag,away_flag,goal_times,win_prob,match_period,api_match_id,group_name')
      .or(`status.eq.live,and(status.eq.upcoming,kickoff_time.lte.${nowISO})`)
      .order('kickoff_time', { ascending: true })

    if (!matches?.length) return NextResponse.json({ ok: true, updated: 0 })

    const autoMatches = matches
    const skipped     = 0

    // Fetch matches for today AND tomorrow (UTC) to catch late-night matches
    // e.g. 10pm MDT = 4am UTC next day
    const todayStr    = now.toISOString().split('T')[0]
    const tomorrow    = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    const yesterday   = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Fetch a 3-day window to never miss a match near midnight UTC
    const data = await fdFetch(`competitions/${WC_ID}/matches?dateFrom=${yesterdayStr}&dateTo=${tomorrowStr}`)
    const allApiMatches = data?.matches || []

    // Only keep matches that are IN_PLAY, PAUSED, FINISHED, or started within last 2 hours
    const apiMatches = allApiMatches.filter(m => {
      if (['IN_PLAY','PAUSED','FINISHED'].includes(m.status)) return true
      // Also include matches that should have started (within 2hr window)
      const kickoff = new Date(m.utcDate)
      const minsAgo = (now - kickoff) / 60000
      return minsAgo >= 0 && minsAgo <= 120
    })

    console.log(`[live-scores] football-data.org: ${allApiMatches.length} total, ${apiMatches.length} active/recent`)

    // Build lookup by team names (normalize common variants)
    const normalize = (n = '') => n
      .replace('Iran', 'IR Iran')
      .replace('United States', 'USA')
      .replace('South Korea', 'Korea Republic')
      .replace('Republic of Korea', 'Korea Republic')
      .replace(/Ivory Coast|Cote d'Ivoire/, "Côte d'Ivoire")
      .replace(/Cape Verde Islands?/, 'Cabo Verde')
      .replace(/Bosnia[- ]Herzegovina|Bosnia and Herzegovina/, 'Bosnia & Herz.')
      .replace(/DR Congo|Democratic Republic.*Congo/, 'Congo DR')
      .replace('Turkey', 'Türkiye')
      .replace('Curacao', 'Curaçao')

    const apiByTeams = {}
    for (const m of apiMatches) {
      const key = `${normalize(m.homeTeam?.name)}|${normalize(m.awayTeam?.name)}`
      apiByTeams[key] = m
    }

    let updated = 0

    for (const match of autoMatches) {
      const key      = `${match.home_team}|${match.away_team}`
      const apiMatch = apiByTeams[key]

      if (!apiMatch) {
        // No data from API — if upcoming and past kickoff, mark live 0-0
        if (match.status === 'upcoming') {
          await supabaseAdmin.from('matches').update({
            status: 'live', home_goals: 0, away_goals: 0, match_period: `0'`
          }).eq('id', match.id)
          updated++
        }
        console.log(`[live-scores] No API data for: ${match.home_team} vs ${match.away_team}`)
        continue
      }

      const isFinished = apiMatch.status === 'FINISHED'
      const homeGoals  = isFinished
        ? (apiMatch.score?.fullTime?.home ?? 0)
        : (apiMatch.score?.fullTime?.home ?? apiMatch.score?.halfTime?.home ?? 0)
      const awayGoals  = isFinished
        ? (apiMatch.score?.fullTime?.away ?? 0)
        : (apiMatch.score?.fullTime?.away ?? apiMatch.score?.halfTime?.away ?? 0)
      const newStatus  = mapStatus(apiMatch.status)
      const kickoffTime = new Date(match.kickoff_time)
      const elapsedSecs = Math.floor((now - kickoffTime) / 1000)
      const elapsedMins = Math.floor(elapsedSecs / 60)
      const matchPeriod = mapPeriod(apiMatch, elapsedSecs)

      // Track goal times
      const prevHome = match.home_goals ?? 0
      const prevAway = match.away_goals ?? 0
      let goalTimes  = []
      try {
        goalTimes = Array.isArray(match.goal_times)
          ? match.goal_times
          : JSON.parse(match.goal_times || '[]')
      } catch { goalTimes = [] }

      const homeGoalCount = goalTimes.filter(g => g.team === 'home').length
      const awayGoalCount = goalTimes.filter(g => g.team === 'away').length
      const mins = matchPeriod === 'HT' ? 45 : matchPeriod === 'FT' ? 90
        : matchPeriod ? (parseInt(matchPeriod) || 0) : elapsedMins

      if (homeGoals > homeGoalCount) {
        for (let i = 0; i < homeGoals - homeGoalCount; i++)
          goalTimes.push({ team: 'home', min: mins })
      }
      if (awayGoals > awayGoalCount) {
        for (let i = 0; i < awayGoals - awayGoalCount; i++)
          goalTimes.push({ team: 'away', min: mins })
      }

      // Win probability
      const totalMins = Math.min(elapsedMins, 90)
      const scoreDiff = homeGoals - awayGoals
      let homeWin, draw, awayWin
      if (newStatus === 'done') {
        homeWin = homeGoals > awayGoals ? 100 : 0
        draw    = homeGoals === awayGoals ? 100 : 0
        awayWin = awayGoals > homeGoals ? 100 : 0
      } else {
        const timeLeft   = Math.max(0, 90 - totalMins)
        const scoreShift = scoreDiff * (15 + (90 - timeLeft) * 0.3)
        homeWin = Math.max(5, Math.min(90, 45 + scoreShift))
        awayWin = Math.max(5, Math.min(90, 30 - scoreShift))
        draw    = Math.max(5, Math.min(50, 100 - homeWin - awayWin))
        const total = homeWin + draw + awayWin
        homeWin  = Math.round(homeWin  / total * 100)
        draw     = Math.round(draw     / total * 100)
        awayWin  = 100 - homeWin - draw
      }

      await supabaseAdmin.from('matches').update({
        home_goals:   homeGoals,
        away_goals:   awayGoals,
        status:       newStatus,
        match_period: matchPeriod,
        goal_times:   JSON.stringify(goalTimes),
        win_prob:     JSON.stringify({ home: homeWin, draw, away: awayWin }),
      }).eq('id', match.id)

      // Goal notification
      if (newStatus === 'live' && (homeGoals > prevHome || awayGoals > prevAway)) {
        const scored = homeGoals > prevHome
          ? { team: match.home_team, flag: match.home_flag }
          : { team: match.away_team, flag: match.away_flag }
        await sendPush({
          title:   `⚽ GOAL! ${scored.flag} ${scored.team}!`,
          message: `${match.home_flag} ${match.home_team} ${homeGoals}–${awayGoals} ${match.away_team} ${match.away_flag}`,
          url:     '/game?tab=predict',
        }).catch(() => {})
      }

      // Settle on full time — only when match JUST finished to avoid overwriting correct points
      if (newStatus === 'done' && match.status !== 'done') {
        await settleMatch(match.id, homeGoals, awayGoals, match)
      }

      updated++
    }

    return NextResponse.json({ ok: true, updated })

  } catch (err) {
    console.error('[live-scores]', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
