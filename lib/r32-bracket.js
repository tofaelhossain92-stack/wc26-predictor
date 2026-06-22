// Official FIFA 2026 World Cup Round of 32 bracket structure
// Source: FIFA Tournament Regulations Annex C / Wikipedia
//
// 16 R32 matches with FIXED roles (winner/runner-up of specific groups),
// except 8 matches involve "Best 3rd place from groups X/Y/Z/..." which
// depends on WHICH 8 third-placed teams actually qualify (495 combinations)

export const R32_FIXED_MATCHES = [
  { match: 73, home: { type: 'RU', group: 'A' }, away: { type: 'RU', group: 'B' } },
  { match: 74, home: { type: 'W',  group: 'E' }, away: { type: '3RD_POOL', pool: ['A','B','C','D','F'] } },
  { match: 75, home: { type: 'W',  group: 'F' }, away: { type: 'RU', group: 'C' } },
  { match: 76, home: { type: 'W',  group: 'C' }, away: { type: 'RU', group: 'F' } },
  { match: 77, home: { type: 'W',  group: 'I' }, away: { type: '3RD_POOL', pool: ['C','D','F','G','H'] } },
  { match: 78, home: { type: 'RU', group: 'E' }, away: { type: 'RU', group: 'I' } },
  { match: 79, home: { type: 'W',  group: 'A' }, away: { type: '3RD_POOL', pool: ['C','E','F','H','I'] } },
  { match: 80, home: { type: 'W',  group: 'L' }, away: { type: '3RD_POOL', pool: ['E','H','I','J','K'] } },
  { match: 81, home: { type: 'W',  group: 'D' }, away: { type: '3RD_POOL', pool: ['B','E','F','I','J'] } },
  { match: 82, home: { type: 'W',  group: 'G' }, away: { type: '3RD_POOL', pool: ['A','E','H','I','J'] } },
  { match: 83, home: { type: 'RU', group: 'K' }, away: { type: 'RU', group: 'L' } },
  { match: 84, home: { type: 'W',  group: 'H' }, away: { type: 'RU', group: 'J' } },
  { match: 85, home: { type: 'W',  group: 'B' }, away: { type: '3RD_POOL', pool: ['E','F','G','I','J'] } },
  { match: 86, home: { type: 'W',  group: 'J' }, away: { type: 'RU', group: 'H' } },
  { match: 87, home: { type: 'W',  group: 'K' }, away: { type: '3RD_POOL', pool: ['D','E','I','J','L'] } },
  { match: 88, home: { type: 'RU', group: 'D' }, away: { type: 'RU', group: 'G' } },
]

// Resolve a slot (winner/runner-up/3rd-pool) into an actual team object
// thirdPlaceAssignment: map of pool-key -> team (computed from the official 495-combo table,
// or simplified: assign best-ranked qualifying 3rd team from that pool)
export function resolveSlot(slot, groups, qualifyingThirds) {
  if (slot.type === 'W')  return groups[slot.group]?.[0] || null
  if (slot.type === 'RU') return groups[slot.group]?.[1] || null
  if (slot.type === '3RD_POOL') {
    // Find which qualifying 3rd-place team belongs to one of the pool groups
    // and hasn't been assigned to another match yet (handled by caller)
    const candidate = qualifyingThirds.find(t => slot.pool.includes(t.group))
    return candidate || null
  }
  return null
}
