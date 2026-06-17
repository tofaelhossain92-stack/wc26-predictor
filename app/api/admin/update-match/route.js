import { NextResponse }                        from 'next/server'
import { supabaseAdmin }                       from '@/lib/supabase'
import { sendPush, notifyResultIn }            from '@/lib/onesignal'
import { calcPoints }                          from '@/lib/points'

export const dynamic = 'force-dynamic'

const ADMIN_PASSWORD = 'wc26admin'

export async function POST(req) {
  const body = await req.json()
  const {
    password, matchId,
    status, home_goals, away_goals,
    match_period, kickoff_time,
    goal_times, manual_override,
  } = body

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch current match state for comparison
  const { data: current } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (!current) return NextResponse.json({ ok: false, error: 'Match not found' }, { status: 404 })

  const newHomeGoals = home_goals !== '' ? parseInt(home_goals, 10) : current.home_goals
  const newAwayGoals = away_goals !== '' ? parseInt(away_goals, 10) : current.away_goals
  const newStatus    = status ?? current.status
  const prevHomeGoals = current.home_goals ?? 0
  const prevAwayGoals = current.away_goals ?? 0

  // Build updates
  const updates = {}
  if (status !== undefined)           updates.status          = status
  if (match_period !== undefined)     updates.match_period    = match_period
  if (kickoff_time)                   updates.kickoff_time    = new Date(kickoff_time).toISOString()
  if (home_goals !== '')              updates.home_goals      = newHomeGoals
  if (away_goals !== '')              updates.away_goals      = newAwayGoals
  if (goal_times !== undefined)       updates.goal_times      = goal_times
  if (manual_override !== undefined)  updates.manual_override = manual_override

  const { error } = await supabaseAdmin
    .from('matches')
    .update(updates)
    .eq('id', matchId)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  // ── Notifications ─────────────────────────────────────────────────────────

  // Goal notification — score changed
  const homeScored = newHomeGoals > prevHomeGoals
  const awayScored = newAwayGoals > prevAwayGoals

  if (homeScored || awayScored) {
    const scored = homeScored
      ? { team: current.home_team, flag: current.home_flag }
      : { team: current.away_team, flag: current.away_flag }

    await sendPush({
      title:   `⚽ GOAL! ${scored.flag} ${scored.team}!`,
      message: `${current.home_flag} ${current.home_team} ${newHomeGoals}–${newAwayGoals} ${current.away_team} ${current.away_flag}`,
      url:     '/game?tab=predict',
    }).catch(() => {})
  }

  // Full time notification + settle points
  if (newStatus === 'done' && current.status !== 'done') {
    await notifyResultIn(
      current.home_team, current.away_team,
      newHomeGoals, newAwayGoals,
      current.home_flag, current.away_flag
    ).catch(() => {})

    // Settle predictions
    const { data: preds } = await supabaseAdmin
      .from('predictions')
      .select('id, user_id, home_goals, away_goals')
      .eq('match_id', matchId)

    if (preds?.length) {
      for (const pred of preds) {
        const pts = calcPoints(pred, { home_goals: newHomeGoals, away_goals: newAwayGoals })
        await supabaseAdmin.from('predictions').update({ points_earned: pts }).eq('id', pred.id)
      }
      const userIds = [...new Set(preds.map(p => p.user_id))]
      for (const userId of userIds) {
        const { data: allPreds } = await supabaseAdmin
          .from('predictions').select('points_earned').eq('user_id', userId)
        const total = (allPreds || []).reduce((s, p) => s + (parseInt(p.points_earned, 10) || 0), 0)
        await supabaseAdmin.from('users').update({ points: total }).eq('id', userId)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
