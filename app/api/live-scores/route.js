import { NextResponse }  from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { mapStatus }     from '@/lib/football-api'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date().toISOString()
    const { data: liveMatches } = await supabaseAdmin
      .from('matches')
      .select('*')
      .in('status', ['live', 'upcoming'])
      .lte('kickoff_time', now)

    if (!liveMatches?.length) {
      return NextResponse.json({ ok: true, updated: 0 })
    }

    let updated = 0

    for (const match of liveMatches) {
      if (!match.api_match_id) continue

      const apiMatch = await fetch(
        `https://api.football-data.org/v4/matches/${match.api_match_id}`,
        { headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY } }
      ).then(r => r.json())

      const homeGoals = apiMatch.score?.fullTime?.home ?? apiMatch.score?.halfTime?.home ?? 0
      const awayGoals = apiMatch.score?.fullTime?.away ?? apiMatch.score?.halfTime?.away ?? 0
      const apiStatus = mapStatus(apiMatch.status)

      // Never downgrade status — respect manual updates
      const newStatus = match.status === 'done' ? 'done'
        : match.status === 'live' && apiStatus === 'upcoming' ? 'live'
        : apiStatus

      await supabaseAdmin
        .from('matches')
        .update({ home_goals: homeGoals, away_goals: awayGoals, status: newStatus })
        .eq('id', match.id)

      updated++
    }

    return NextResponse.json({ ok: true, updated })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
