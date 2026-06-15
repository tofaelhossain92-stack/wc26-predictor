import { NextResponse } from 'next/server'
import { sendPush } from '@/lib/onesignal'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xtairnvavocsliewquhd.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const in10 = new Date(now.getTime() + 10 * 60 * 1000)
  const in15 = new Date(now.getTime() + 15 * 60 * 1000)

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/matches?select=*&status=eq.upcoming&kickoff_time=gte.${in10.toISOString()}&kickoff_time=lte.${in15.toISOString()}`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  )
  const matches = await res.json()

  if (!matches?.length) return NextResponse.json({ ok: true, notified: 0 })

  let notified = 0
  for (const match of matches) {
    await sendPush({
      title: '⚽ Match Starting Soon!',
      message: `${match.home_flag} ${match.home_team} vs ${match.away_team} ${match.away_flag} kicks off in 10 minutes — lock in your prediction!`,
      url: '/game?tab=predict',
    })
    notified++
  }

  return NextResponse.json({ ok: true, notified })
}