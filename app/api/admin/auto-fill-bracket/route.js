// POST /api/admin/auto-fill-bracket
// Suggests Round of 32 matchups using the OFFICIAL FIFA 2026 bracket structure
// Does NOT write to DB — returns suggestions for admin to review

import { NextResponse }      from 'next/server'
import { supabaseAdmin }     from '@/lib/supabase'
import { calcStandings, VALID_GROUPS } from '@/lib/standings'
import { R32_FIXED_MATCHES } from '@/lib/r32-bracket'

export const dynamic = 'force-dynamic'
const ADMIN_PASSWORD = 'wc26admin'

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}))
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: matches } = await supabaseAdmin.from('matches').select('*')
  const { groups } = calcStandings(matches || [])

  const incomplete = VALID_GROUPS.filter(g => !groups[g] || !groups[g].every(t => t.mp >= 3))
  if (incomplete.length > 0) {
    return NextResponse.json({
      ok: true, ready: false,
      message: `Group stage not finished yet. Incomplete groups: ${incomplete.join(', ')}`,
      incompleteGroups: incomplete,
    })
  }

  // Best 8 third-placed teams across all 12 groups
  const allThirds = VALID_GROUPS.map(g => ({ ...groups[g][2], group: g }))
  allThirds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  const qualifyingThirds = allThirds.slice(0, 8)
  const qualifyingGroups = qualifyingThirds.map(t => t.group)

  // Resolve each fixed R32 match using the official structure.
  // For 3RD_POOL slots, find the qualifying 3rd-place team whose group is in the pool
  // — track which thirds are already used so none are double-booked.
  const usedThirds = new Set()
  const resolved = R32_FIXED_MATCHES.map(m => {
    const home = m.home.type === '3RD_POOL'
      ? qualifyingThirds.find(t => m.home.pool.includes(t.group) && !usedThirds.has(t.group))
      : (m.home.type === 'W' ? groups[m.home.group][0] : groups[m.home.group][1])
    if (home && m.home.type === '3RD_POOL') usedThirds.add(home.group)

    const away = m.away.type === '3RD_POOL'
      ? qualifyingThirds.find(t => m.away.pool.includes(t.group) && !usedThirds.has(t.group))
      : (m.away.type === 'W' ? groups[m.away.group][0] : groups[m.away.group][1])
    if (away && m.away.type === '3RD_POOL') usedThirds.add(away.group)

    return { match: m.match, home, away }
  })

  return NextResponse.json({
    ok: true, ready: true,
    message: 'Group stage complete! Review suggested R32 matchups before applying — note: 3rd-place assignments follow FIFA\'s official pool rules but should be cross-checked against the published combination table for the exact qualifying groups.',
    qualifyingThirds,
    qualifyingGroups,
    resolvedMatches: resolved,
  })
}
