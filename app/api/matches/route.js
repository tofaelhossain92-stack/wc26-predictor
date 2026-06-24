import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xtairnvavocsliewquhd.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const dynamic = 'force-dynamic'

export async function GET() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/matches?select=*&order=kickoff_time.asc`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    cache: 'no-store',
  })
  const matches = await res.json()
  return NextResponse.json({ ok: true, matches }, {
    headers: { 'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10' }
  })
}
