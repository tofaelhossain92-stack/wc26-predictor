import { NextResponse } from 'next/server'
import { sendPush } from '@/lib/onesignal'

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

export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  // Wide window: 5 to 20 mins before kickoff (catches delayed cron runs)
  const in5  = new Date(now.getTime() + 5  * 60 * 1000)
  const in20 = new Date(now.getTime() + 20 * 60 * 1000)

  // Get upcoming matches in window that haven't been notified yet
  const matches = await sbGet(
    `matches?select=*&status=eq.upcoming&kickoff_time=gte.${in5.toISOString()}&kickoff_time=lte.${in20.toISOString()}&notified_at=is.null`
  )

  if (!matches?.length) return NextResponse.json({ ok: true, notified: 0 })

  let notified = 0
  for (const match of matches) {
    const minsUntil = Math.round((new Date(match.kickoff_time) - now) / 60000)
    await sendPush({
      title: '⚽ Match Starting Soon!',
      message: `${match.home_flag} ${match.home_team} vs ${match.away_team} ${match.away_flag} kicks off in ${minsUntil} minutes — lock in your prediction!`,
      url: '/game?tab=predict',
    })
    // Mark as notified so we don't send twice
    await sbPatch(`matches?id=eq.${match.id}`, { notified_at: now.toISOString() })
    notified++
  }

  return NextResponse.json({ ok: true, notified })
}
