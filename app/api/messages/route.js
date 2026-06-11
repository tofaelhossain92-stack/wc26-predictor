// GET  /api/messages → fetch all messages
// POST /api/messages → post a new message

import { NextResponse } from 'next/server'
import { supabase }     from '@/lib/supabase'
import { sendPush }    from '@/lib/onesignal'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      created_at,
      user:users ( id, name, avatar )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, messages: data })
}

export async function POST(request) {
  try {
    const { userId, content } = await request.json()

    if (!userId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (content.trim().length > 200) {
      return NextResponse.json({ error: 'Message too long (max 200 chars)' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({ user_id: userId, content: content.trim() })
      .select(`id, content, created_at, user:users(id, name, avatar)`)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Push notification to all players
    const senderName = data.user?.name || 'Someone'
    const preview = content.trim().length > 60 ? content.trim().slice(0, 60) + '...' : content.trim()
    sendPush({
      title: `💬 ${senderName} posted on Trash Talk`,
      message: preview,
      url: '/game?tab=trash',
    }).catch(() => {}) // fire and forget, don't block response

    return NextResponse.json({ ok: true, message: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
