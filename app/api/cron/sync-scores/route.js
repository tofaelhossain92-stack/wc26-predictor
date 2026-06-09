// /app/api/cron/sync-scores/route.js
// Vercel calls this every 5 minutes (see vercel.json)
// It fetches finished matches, updates results, calculates points,
// sends push notifications, and updates match statuses.

import { NextResponse }                      from 'next/server'
import { supabaseAdmin }                     from '@/lib/supabase'
import { fetchFinishedMatches, mapStatus }   from '@/lib/football-api'
import { settlePredictions }                 from '@/lib/points'
import { notifyResultIn, notifyMatchSoon }   from '@/lib/onesignal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  // Verify this is called by Vercel cron (not a random person hitting the URL)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const log = []

  try {
    // ── Step 1: Sync finished match results ──────────────────────────────────
    const finishedMatches = await fetchFinishedMatches()
    log.push(`Found ${finishedMatches.length} finished matches from API`)

    for (const apiMatch of finishedMatches) {
      // Check if we have this match in our DB and it's not settled yet
      const { data: dbMatch } = await supabaseAdmin
        .from('matches')
        .select('*')
        .eq('api_match_id', apiMatch.id)
        .single()

      if (!dbMatch) continue          // we don't track this match
      if (dbMatch.status === 'done') continue  // already settled

      const homeGoals = apiMatch.score?.fullTime?.home ?? 0
      const awayGoals = apiMatch.score?.fullTime?.away ?? 0

      // Update match result in DB
      await supabaseAdmin
        .from('matches')
        .update({
          status:           'done',
          home_goals:       homeGoals,
          away_goals:       awayGoals,
          result_synced_at: new Date().toISOString(),
        })
        .eq('id', dbMatch.id)

      log.push(`✅ Result saved: ${dbMatch.home_team} ${homeGoals}-${awayGoals} ${dbMatch.away_team}`)

      // Settle all predictions for this match (award points)
      await settlePredictions(supabaseAdmin, dbMatch.id, homeGoals, awayGoals)
      log.push(`💰 Points calculated for match ${dbMatch.id}`)

      // Send push notification: result is in!
      await notifyResultIn(
        dbMatch.home_team, dbMatch.away_team,
        homeGoals, awayGoals,
        dbMatch.home_flag, dbMatch.away_flag
      )
      log.push(`🔔 Push sent for result: ${dbMatch.home_team} vs ${dbMatch.away_team}`)
    }

    // ── Step 2: Notify for upcoming matches (30 min warning) ─────────────────
    const thirtyMinsFromNow = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const fiveMinsAgo       = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    // Matches kicking off in the next 30–35 min window (cron runs every 5 min)
    const { data: upcomingMatches } = await supabaseAdmin
      .from('matches')
      .select('*')
      .eq('status', 'upcoming')
      .gte('kickoff_time', fiveMinsAgo)
      .lte('kickoff_time', thirtyMinsFromNow)

    for (const match of (upcomingMatches || [])) {
      await notifyMatchSoon(match.home_team, match.away_team, match.home_flag, match.away_flag)
      log.push(`🔔 30-min warning sent: ${match.home_team} vs ${match.away_team}`)
    }

    // ── Step 3: Update live match statuses ───────────────────────────────────
    const now = new Date().toISOString()
    await supabaseAdmin
      .from('matches')
      .update({ status: 'live' })
      .eq('status', 'upcoming')
      .lte('kickoff_time', now)

    return NextResponse.json({ ok: true, log })
  } catch (err) {
    console.error('Cron error:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
