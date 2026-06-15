// POST /api/admin/send-notification
// Sends a custom push notification to all players
// Protected by CRON_SECRET

import { NextResponse } from 'next/server'
import { sendPush } from '@/lib/onesignal'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, message, url } = await request.json()

  if (!title || !message) {
    return NextResponse.json({ error: 'Missing title or message' }, { status: 400 })
  }

  const ok = await sendPush({
    title,
    message,
    url: url || '/game',
  })

  return NextResponse.json({ ok })
}
