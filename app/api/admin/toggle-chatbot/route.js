import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
const ADMIN_PASSWORD = 'wc26admin'

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}))
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: current } = await supabaseAdmin
    .from('app_settings').select('value').eq('key', 'chatbot_enabled').single()

  const newValue = current ? !current.value : false // first toggle turns it off since default is ON

  await supabaseAdmin
    .from('app_settings')
    .upsert({ key: 'chatbot_enabled', value: newValue })

  return NextResponse.json({ ok: true, enabled: newValue })
}
