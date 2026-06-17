// GET /api/settle?secret=wc26cron2026
// Force-recalculates points for all finished matches
// Bookmark this and hit it any time points look wrong

import { NextResponse }       from 'next/server'
import { supabaseAdmin }      from '@/lib/supabase'
import { calcPoints }         from '@/lib/points'

export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET || 'wc26cron2026'

export async function GET(req) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Get all finished matches with valid scores
  const { data: matches, error: mErr } = await supabaseAdmin
    .from('matches')
    .select('id, home_team, away_team, home_goals, away_goals')
    .eq('status', 'done')
    .not('home_goals', 'is', null)
    .not('away_goals', 'is', null)

  if (mErr) return NextResponse.json({ ok: false, error: mErr.message }, { status: 500 })

  let settled = 0, skipped = 0, errors = []

  for (const match of matches) {
    // 2. Get all predictions for this match
    const { data: preds, error: pErr } = await supabaseAdmin
      .from('predictions')
      .select('id, user_id, home_goals, away_goals')
      .eq('match_id', match.id)

    if (pErr || !preds?.length) { skipped++; continue }

    // 3. Calculate and update each prediction
    for (const pred of preds) {
      const pts = calcPoints(pred, { home_goals: match.home_goals, away_goals: match.away_goals })
      const { error: uErr } = await supabaseAdmin
        .from('predictions')
        .update({ points_earned: pts })
        .eq('id', pred.id)

      if (uErr) errors.push(`pred ${pred.id}: ${uErr.message}`)
    }

    settled++
  }

  // 4. Recalculate total points for every user
  const { data: users } = await supabaseAdmin.from('users').select('id')
  for (const user of users || []) {
    const { data: allPreds } = await supabaseAdmin
      .from('predictions')
      .select('points_earned')
      .eq('user_id', user.id)

    const total = (allPreds || []).reduce((sum, p) => sum + (parseInt(p.points_earned, 10) || 0), 0)
    await supabaseAdmin.from('users').update({ points: total }).eq('id', user.id)
  }

  return NextResponse.json({
    ok: true,
    matches_settled: settled,
    matches_skipped: skipped,
    errors: errors.length ? errors : undefined
  })
}
