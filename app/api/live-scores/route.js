// GET /api/live-scores
// Called by frontend every 15s when a live/upcoming match is detected
// Fetches real scores from football-data.org and updates DB
// Sends goal notifications, auto-settles predictions when match finishes

import { NextResponse } from 'next/server'
import { mapStatus }    from '@/lib/football-api'
import { calcPoints }   from '@/lib/points'
import { notifyResultIn, sendPush } from '@/lib/onesignal'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xtairnvavocsliewquhd.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    cache: 'no-store',
  })
  return res.json()
}

async function sbPatch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  })
  return res.json()
}

async function settleMatch(matchId, homeGoals, awayGoals, match) {
  const predictions = await sbGet(`predictions?match_id=eq.${matchId}&select=id,user_id,home_goals,away_goals`)
  for (const pred of predictions) {
    const pts = calcPoints(pred, { home_goals: homeGoals, away_goals: awayGoals })
    await sbPatch(`predictions?id=eq.${pred.id}`, { points_earned: pts })
    const allPreds = await sbGet(`predictions?user_id=eq.${pred.user_id}&select=points_earned`)
    const total = allPreds.reduce((sum, p) => sum + (p.points_earned || 0), 0)
    await sbPatch(`users?id=eq.${pred.user_id}`, { points: total })
  }
  await notifyResultIn(
    match.home_team, match.away_team,
    homeGoals, awayGoals,
    match.home_flag, match.away_flag
  ).catch(() => {})
}

function getGoalTeam(match, prevHome, prevAway, newHome, newAway) {
  const homeScored = newHome > prevHome
  const awayScored = newAway > prevAway
  if (homeScored && awayScored) return null // both scored simultaneously, rare
  if (homeScored) return { team: match.home_team, flag: match.home_flag, score: `${newHome}–${newAway}` }
  if (awayScored) return { team: match.away_team, flag: match.away_flag, score: `${newHome}–${newAway}` }
  return null
}

export async function GET() {
  try {
    const now = new Date()
    const nowISO = now.toISOString()

    // Get all matches that are live or upcoming past kickoff
    const matches = await sbGet(`matches?select=*&or=(status.eq.live,and(status.eq.upcoming,kickoff_time.lte.${nowISO}))&order=kickoff_time.asc`)

    if (!matches?.length) {
      return NextResponse.json({ ok: true, updated: 0 })
    }

    let updated = 0

    for (const match of matches) {
      if (!match.api_match_id) {
        // No API ID — just mark as live if past kickoff
        if (match.status === 'upcoming') {
          await sbPatch(`matches?id=eq.${match.id}`, { status: 'live', home_goals: 0, away_goals: 0 })
          updated++
        }
        continue
      }

      // Fetch from football-data.org
      const apiRes = await fetch(`https://api.football-data.org/v4/matches/${match.api_match_id}`, {
        headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY }
      })
      const apiMatch = await apiRes.json()

      const homeGoals = apiMatch.score?.fullTime?.home ?? apiMatch.score?.halfTime?.home ?? 0
      const awayGoals = apiMatch.score?.fullTime?.away ?? apiMatch.score?.halfTime?.away ?? 0
      const newStatus = mapStatus(apiMatch.status)

      // Calculate match period display
      const kickoffTime = new Date(match.kickoff_time)
      const elapsedMins = Math.floor((now - kickoffTime) / 60000)
      let matchPeriod = null
      if (apiMatch.status === 'PAUSED') {
        matchPeriod = 'HT'
      } else if (apiMatch.status === 'IN_PLAY') {
        // Halftime break is ~22 mins (15 official + warmup time)
        // 1st half: elapsed 0-47 mins = minute 0-45
        // Around HT: elapsed 47-62 = show 45+
        // 2nd half: elapsed 62+ = minute = elapsed - 22
        if (elapsedMins <= 47) matchPeriod = `${Math.min(elapsedMins, 45)}'`
        else if (elapsedMins <= 62) matchPeriod = `45+'`
        else {
          const min2nd = elapsedMins - 22
          matchPeriod = min2nd <= 90 ? `${min2nd}'` : `90+'`
        }
      } else if (apiMatch.status === 'FINISHED') {
        matchPeriod = 'FT'
      }

      // Track goal times — only add when total count increases vs DB
      const prevHome = match.home_goals ?? 0
      const prevAway = match.away_goals ?? 0
      const goalScored = (homeGoals > prevHome || awayGoals > prevAway) && newStatus === 'live'
      
      // Parse existing goal times safely
      let goalTimes = []
      if (match.goal_times) {
        try {
          goalTimes = Array.isArray(match.goal_times) ? match.goal_times : JSON.parse(match.goal_times)
        } catch { goalTimes = [] }
      }
      
      // Only add new goals (compare actual count vs recorded count)
      const homeGoalCount = goalTimes.filter(g => g.team === 'home').length
      const awayGoalCount = goalTimes.filter(g => g.team === 'away').length
      // Use the displayed match period as the goal minute (consistent with badge)
      let mins = 0
      if (matchPeriod === 'HT') mins = 45
      else if (matchPeriod === 'FT') mins = 90
      else if (matchPeriod) {
        const parsed = parseInt(matchPeriod.replace("'", ''))
        mins = isNaN(parsed) ? 0 : parsed
      }
      
      if (homeGoals > homeGoalCount) {
        for (let i = 0; i < homeGoals - homeGoalCount; i++) {
          goalTimes = [...goalTimes, { team: 'home', min: mins }]
        }
      }
      if (awayGoals > awayGoalCount) {
        for (let i = 0; i < awayGoals - awayGoalCount; i++) {
          goalTimes = [...goalTimes, { team: 'away', min: mins }]
        }
      }

      // Calculate win probability based on score + time
      const totalMins = Math.min(elapsedMins, 90)
      const timeLeft = Math.max(0, 90 - totalMins)
      const scoreDiff = homeGoals - awayGoals
      // Base prob shifts with score diff and time remaining
      let homeWin, draw, awayWin
      if (newStatus === 'done') {
        homeWin = homeGoals > awayGoals ? 100 : 0
        draw = homeGoals === awayGoals ? 100 : 0
        awayWin = awayGoals > homeGoals ? 100 : 0
      } else {
        const baseHome = 45, baseDraw = 25, baseAway = 30
        const scoreShift = scoreDiff * (15 + (90 - timeLeft) * 0.3)
        homeWin = Math.max(5, Math.min(90, baseHome + scoreShift))
        awayWin = Math.max(5, Math.min(90, baseAway - scoreShift))
        draw = Math.max(5, Math.min(50, 100 - homeWin - awayWin))
        const total = homeWin + draw + awayWin
        homeWin = Math.round(homeWin / total * 100)
        draw = Math.round(draw / total * 100)
        awayWin = 100 - homeWin - draw
      }

      // Update match in DB
      await sbPatch(`matches?id=eq.${match.id}`, {
        home_goals: homeGoals,
        away_goals: awayGoals,
        status: newStatus,
        match_period: matchPeriod,
        goal_times: JSON.stringify(goalTimes),
        win_prob: JSON.stringify({ home: homeWin, draw, away: awayWin })
      })

      // Send goal notification
      if (goalScored) {
        const goalInfo = getGoalTeam(match, prevHome, prevAway, homeGoals, awayGoals)
        if (goalInfo) {
          await sendPush({
            title: `⚽ GOAL! ${goalInfo.flag} ${goalInfo.team}!`,
            message: `${match.home_flag} ${match.home_team} ${goalInfo.score} ${match.away_team} ${match.away_flag}`,
            url: '/game?tab=predict',
          }).catch(() => {})
        }
      }

      // If just finished, settle predictions and notify
      if (newStatus === 'done' && match.status !== 'done') {
        await settleMatch(match.id, homeGoals, awayGoals, match)
      }

      updated++
    }

    return NextResponse.json({ ok: true, updated })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
