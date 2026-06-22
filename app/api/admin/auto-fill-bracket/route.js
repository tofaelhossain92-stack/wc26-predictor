// POST /api/admin/auto-fill-bracket
// Auto-suggests Round of 32 matchups based on current group standings
// Does NOT write to DB automatically — returns suggestions for admin to review/apply

import { NextResponse }  from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calcStandings, VALID_GROUPS } from '@/lib/standings'

export const dynamic = 'force-dynamic'
const ADMIN_PASSWORD = 'wc26admin'

// Standard R32 bracket pairing pattern for 12 groups + 8 best third-placed teams
// (simplified FIFA 2026 format: winners/runners-up cross-paired, 3rd-placed fill remaining slots)
const R32_PAIRINGS = [
  ['A1', 'C2'], ['B1', 'F2'], ['E1', 'I2'], ['D1', 'L2'],
  ['G1', '3rd1'], ['H1', '3rd2'], ['J1', '3rd3'], ['K1', '3rd4'],
  ['C1', 'A2'], ['F1', 'B2'], ['I1', 'E2'], ['L1', 'D2'],
  ['3rd5', 'G2'], ['3rd6', 'H2'], ['3rd7', 'J2'], ['3rd8', 'K2'],
]

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}))
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: matches } = await supabaseAdmin.from('matches').select('*')
  const { groups } = calcStandings(matches || [])

  // Check if all groups are complete
  const incomplete = VALID_GROUPS.filter(g => !groups[g] || !groups[g].every(t => t.mp >= 3))
  if (incomplete.length > 0) {
    return NextResponse.json({
      ok: true,
      ready: false,
      message: `Group stage not finished yet. Incomplete groups: ${incomplete.join(', ')}`,
      incompleteGroups: incomplete,
    })
  }

  // Get group winners/runners-up
  const winners = {}, runnersUp = {}, thirdPlaced = []
  VALID_GROUPS.forEach(g => {
    winners[g]   = groups[g][0]
    runnersUp[g] = groups[g][1]
    thirdPlaced.push({ ...groups[g][2], group: g })
  })

  // Rank third-placed teams by pts, then gd, then gf — pick best 8
  thirdPlaced.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf)
  const best8Third = thirdPlaced.slice(0, 8)

  return NextResponse.json({
    ok: true,
    ready: true,
    winners,
    runnersUp,
    best8Third,
    message: 'Group stage complete! Review suggested R32 matchups before applying.',
  })
}
