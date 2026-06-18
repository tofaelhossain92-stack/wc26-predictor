// GET /api/settle?secret=wc26cron2026
// Force-recalculates points for all finished matches using raw fetch (bypasses Supabase JS RETURNING issue)

import { NextResponse } from 'next/server'
import { calcPoints }   from '@/lib/points'

export const dynamic = 'force-dynamic'

const CRON_SECRET    = process.env.CRON_SECRET || 'wc26cron2026'
const SUPABASE_URL   = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xtairnvavocsliewquhd.supabase.co'
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0YWlybnZhdm9jc2xpZXdxdWhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk0NTM5NCwiZXhwIjoyMDk2NTIxMzk0fQ.EC_GU4lhbi6XHjB4S5bpmMc4r5Oi5Jw5lTqdl9btXOA'

const HEADERS = {
  'apikey':        SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type':  'application/json',
  'Prefer':        'return=minimal', // never use RETURNING
}

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { ...HEADERS }, cache: 'no-store'
  })
  if (!res.ok) throw new Error(`GET ${path} failed: ${await res.text()}`)
  return res.json()
}

async function sbPatch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method:  'PATCH',
    headers: { ...HEADERS },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text)
  }
}

export async function GET(req) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Get all finished matches
    const matches = await sbGet('matches?status=eq.done&home_goals=not.is.null&away_goals=not.is.null&select=id,home_goals,away_goals')

    let settled = 0, skipped = 0, errors = []

    for (const match of matches) {
      // 2. Get predictions for this match
      const preds = await sbGet(`predictions?match_id=eq.${match.id}&select=id,user_id,home_goals,away_goals`)
      if (!preds?.length) { skipped++; continue }

      // 3. Update each prediction
      for (const pred of preds) {
        const pts = calcPoints(pred, { home_goals: match.home_goals, away_goals: match.away_goals })
        try {
          await sbPatch(`predictions?id=eq.${pred.id}`, { points_earned: pts })
        } catch (e) {
          errors.push(`pred ${pred.id}: ${e.message}`)
        }
      }
      settled++
    }

    // 4. Recalculate user totals
    const users = await sbGet('users?select=id')
    for (const user of users || []) {
      const preds = await sbGet(`predictions?user_id=eq.${user.id}&select=points_earned`)
      const total = (preds || []).reduce((s, p) => s + (parseInt(p.points_earned, 10) || 0), 0)
      try {
        await sbPatch(`users?id=eq.${user.id}`, { points: total })
      } catch (e) {
        errors.push(`user ${user.id}: ${e.message}`)
      }
    }

    return NextResponse.json({
      ok: true,
      matches_settled: settled,
      matches_skipped: skipped,
      errors: errors.length ? errors : undefined
    })

  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
