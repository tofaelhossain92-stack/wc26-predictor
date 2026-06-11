import { NextResponse } from 'next/server'
import { sendPush } from '@/lib/onesignal'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xtairnvavocsliewquhd.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const { matchId } = await request.json()

  const res = await fetch(`${SUPABASE_URL}/rest/v1/matches?id=eq.${matchId}&select=*`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    }
  })
  const matches = await res.json()
  const match = matches[0]

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })

  await sendPush({
    title: '⚽ Match Starting Soon!',
    message: `${match.home_flag} ${match.home_team} vs ${match.away_team} ${match.away_flag} kicks off in 5 minutes — lock in your prediction!`,
    url: '/game?tab=predict',
  })

  return NextResponse.json({ ok: true })
}
