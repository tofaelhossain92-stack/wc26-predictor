'use client'
import { useState, useEffect } from 'react'
import { calcStandings, GROUP_TEAMS } from '@/lib/standings'

const VALID_GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']
const KNOCKOUT_GROUPS = ['R32','R16','QF','SF','3RD','FINAL']
const KNOCKOUT_LABELS = { R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter-Finals', SF: 'Semi-Finals', '3RD': '3rd Place Playoff', FINAL: 'Final' }

function FormDot({ result }) {
  if (!result) {
    return <span style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.15)', display: 'inline-block' }} />
  }
  const config = {
    W: { bg: 'rgba(0,200,150,0.15)', border: '#00c896', icon: '✓' },
    D: { bg: 'rgba(255,255,255,0.1)', border: 'rgba(255,255,255,0.4)', icon: '−' },
    L: { bg: 'rgba(200,16,46,0.15)', border: '#C8102E', icon: '✕' },
  }[result]
  return (
    <span style={{
      width: 18, height: 18, borderRadius: '50%',
      background: config.bg, border: `1.5px solid ${config.border}`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 800, color: config.border,
    }}>{config.icon}</span>
  )
}

function StandingsTable({ group, teams }) {
  const sorted = [...teams].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.gd !== a.gd) return b.gd - a.gd
    return b.gf - a.gf
  })

  return (
    <div style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(15,25,45,0.98), rgba(10,18,35,1))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ background: 'rgba(74,158,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 16px' }}>
        <span style={{ background: 'rgba(74,158,255,0.2)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.3)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>GROUP {group}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 28px 28px 28px 36px', gap: 4, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>TEAM</div>
        {['MP','W','D','L'].map(h => (
          <div key={h} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 700, textAlign: 'center', letterSpacing: 0.5 }}>{h}</div>
        ))}
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 700, textAlign: 'center', letterSpacing: 0.5 }}>PTS</div>
      </div>

      {sorted.map((team, i) => {
        const allPlayed = sorted.every(t => t.mp >= 3)
        const qualified = allPlayed && i < 2
        return (
          <div key={team.name} style={{
            display: 'grid', gridTemplateColumns: '1fr 28px 28px 28px 28px 36px',
            gap: 4, padding: '10px 12px', alignItems: 'center',
            borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            borderLeft: i < 2 ? '3px solid #00c896' : '3px solid transparent',
            background: i < 2 ? 'rgba(0,200,150,0.03)' : 'transparent',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ color: i < 2 ? '#00c896' : 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, minWidth: 12 }}>{i + 1}</span>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{team.flag}</span>
              <span style={{ color: '#fff', fontSize: 12, fontWeight: i < 2 ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
              {qualified && (
                <span style={{ fontSize: 8, fontWeight: 800, color: '#00c896', background: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.4)', borderRadius: 6, padding: '1px 5px', flexShrink: 0, letterSpacing: 0.5 }}>
                  Q
                </span>
              )}
            </div>
            {[team.mp, team.w, team.d, team.l].map((val, j) => (
              <div key={j} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center' }}>{val}</div>
            ))}
            <div style={{ color: i < 2 ? '#C9A84C' : '#fff', fontSize: 13, fontWeight: 800, textAlign: 'center' }}>{team.pts}</div>
          </div>
        )
      })}
    </div>
  )
}

function KnockoutCard({ match }) {
  const isTBD = match.home_team?.startsWith('TBD')
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15,25,45,0.98), rgba(10,18,35,1))',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px', marginBottom: 10,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginBottom: 8 }}>
        {new Date(match.kickoff_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        {' · '}
        {new Date(match.kickoff_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ flex: 1, color: isTBD ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: 13, fontWeight: 700 }}>
          {match.home_flag} {match.home_team}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, padding: '0 12px' }}>
          {match.status === 'done' ? `${match.home_goals}–${match.away_goals}` : 'vs'}
        </div>
        <div style={{ flex: 1, color: isTBD ? 'rgba(255,255,255,0.3)' : '#fff', fontSize: 13, fontWeight: 700, textAlign: 'right' }}>
          {match.away_team} {match.away_flag}
        </div>
      </div>
    </div>
  )
}

export default function Standings({ matches }) {
  const [tab, setTab] = useState('group')
  const [favTeam, setFavTeam] = useState(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setFavTeam(localStorage.getItem('wc26_fav_team') || null)
    }
  }, [])

  // ── Build group stage standings ──────────────────────────────────────────
  const teamMap = {}
  const addTeam = (name, flag, group) => {
    const key = `${group}-${name}`
    if (!teamMap[key]) {
      teamMap[key] = { name, flag, group, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, last5: [] }
    }
    return teamMap[key]
  }

  const doneMatches = matches
    .filter(m => m.status === 'done' && m.home_goals != null && m.group_name && VALID_GROUPS.includes(m.group_name))
    .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))

  doneMatches.forEach(m => {
    const home = addTeam(m.home_team, m.home_flag, m.group_name)
    const away = addTeam(m.away_team, m.away_flag, m.group_name)

    home.mp++; away.mp++
    home.gf += m.home_goals; home.ga += m.away_goals
    away.gf += m.away_goals; away.ga += m.home_goals

    if (m.home_goals > m.away_goals) {
      home.w++; home.pts += 3; away.l++
      home.last5.push('W'); away.last5.push('L')
    } else if (m.home_goals < m.away_goals) {
      away.w++; away.pts += 3; home.l++
      home.last5.push('L'); away.last5.push('W')
    } else {
      home.d++; home.pts++; away.d++; away.pts++
      home.last5.push('D'); away.last5.push('D')
    }

    home.gd = home.gf - home.ga
    away.gd = away.gf - away.ga
  })

  // Reverse last5 so most recent is first, cap at 5
  Object.values(teamMap).forEach(t => { t.last5 = t.last5.slice(-5).reverse() })

  // Add teams that haven't played yet
  matches.filter(m => m.group_name && VALID_GROUPS.includes(m.group_name)).forEach(m => {
    if (!m.home_team || m.home_team.startsWith('TBD') || m.home_team.startsWith('Winner') || m.home_team.startsWith('Loser')) return
    if (!m.away_team || m.away_team.startsWith('TBD') || m.away_team.startsWith('Winner') || m.away_team.startsWith('Loser')) return
    addTeam(m.home_team, m.home_flag, m.group_name)
    addTeam(m.away_team, m.away_flag, m.group_name)
  })

  const groups = {}
  Object.values(teamMap).forEach(team => {
    if (!VALID_GROUPS.includes(team.group)) return
    if (!groups[team.group]) groups[team.group] = []
    if (!groups[team.group].find(t => t.name === team.name)) groups[team.group].push(team)
  })

  Object.keys(groups).forEach(g => {
    if (groups[g].length > 4) {
      groups[g] = groups[g].sort((a, b) => b.pts - a.pts || b.gd - a.gd).slice(0, 4)
    }
  })

  let groupLetters = Object.keys(groups).sort()

  // Move favourite team's group to the front
  if (favTeam) {
    const favGroup = Object.keys(GROUP_TEAMS).find(g => GROUP_TEAMS[g].includes(favTeam))
    if (favGroup && groupLetters.includes(favGroup)) {
      groupLetters = [favGroup, ...groupLetters.filter(g => g !== favGroup)]
    }
  }

  // ── Build knockout stage matches ─────────────────────────────────────────
  const knockoutByStage = {}
  matches.filter(m => KNOCKOUT_GROUPS.includes(m.group_name)).forEach(m => {
    if (!knockoutByStage[m.group_name]) knockoutByStage[m.group_name] = []
    knockoutByStage[m.group_name].push(m)
  })
  Object.keys(knockoutByStage).forEach(g => {
    knockoutByStage[g].sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
  })
  const knockoutStages = KNOCKOUT_GROUPS.filter(g => knockoutByStage[g]?.length)

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 14 }}>📊 Standings</h2>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[{ id: 'group', label: 'Group Stage' }, { id: 'knockout', label: 'Knockout Stage' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '10px 0', borderRadius: 12, cursor: 'pointer',
            border: tab === t.id ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.08)',
            background: tab === t.id ? 'rgba(245,197,24,0.12)' : 'rgba(255,255,255,0.03)',
            color: tab === t.id ? '#f5c518' : 'rgba(255,255,255,0.4)',
            fontWeight: 700, fontSize: 13,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'group' ? (
        groupLetters.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 0' }}>No group stage results yet</div>
        ) : (
          <>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 3, borderRadius: 2, background: '#00c896', display: 'inline-block' }} /> Qualification line
            </div>
            {groupLetters.map(g => <StandingsTable key={g} group={g} teams={groups[g]} />)}
          </>
        )
      ) : (
        knockoutStages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 0' }}>Knockout stage hasn't started yet</div>
        ) : (
          knockoutStages.map(stage => (
            <div key={stage} style={{ marginBottom: 24 }}>
              <div style={{ color: '#C9A84C', fontSize: 13, fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>{KNOCKOUT_LABELS[stage] || stage}</div>
              {knockoutByStage[stage].map(m => <KnockoutCard key={m.id} match={m} />)}
            </div>
          ))
        )
      )}
    </div>
  )
}
