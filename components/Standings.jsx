'use client'
import { useState } from 'react'

function StandingsTable({ group, teams }) {
  const sorted = [...teams].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.gd !== a.gd) return b.gd - a.gd
    return b.gf - a.gf
  })

  return (
    <div style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(15,25,45,0.98), rgba(10,18,35,1))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
      {/* Group header */}
      <div style={{ background: 'rgba(74,158,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ background: 'rgba(74,158,255,0.2)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.3)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>GROUP {group}</span>
      </div>

      {/* Table header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 32px 32px 32px 32px 32px 32px 32px 36px', gap: 4, padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>TEAM</div>
        {['MP','W','D','L','GF','GA','GD','PTS'].map(h => (
          <div key={h} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700, textAlign: 'center', letterSpacing: 1 }}>{h}</div>
        ))}
      </div>

      {/* Team rows */}
      {sorted.map((team, i) => (
        <div key={team.name} style={{
          display: 'grid', gridTemplateColumns: '1fr 32px 32px 32px 32px 32px 32px 32px 36px',
          gap: 4, padding: '10px 16px',
          borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          background: i < 2 ? 'rgba(0,200,150,0.03)' : 'transparent',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: i < 2 ? '#00c896' : 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, minWidth: 14 }}>{i + 1}</span>
            <span style={{ fontSize: 16 }}>{team.flag}</span>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: i < 2 ? 700 : 400 }}>{team.name}</span>
            {i < 2 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00c896', display: 'inline-block' }} />}
          </div>
          {[team.mp, team.w, team.d, team.l, team.gf, team.ga, team.gd].map((val, j) => (
            <div key={j} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' }}>{val}</div>
          ))}
          <div style={{ color: i < 2 ? '#C9A84C' : '#fff', fontSize: 13, fontWeight: 800, textAlign: 'center' }}>{team.pts}</div>
        </div>
      ))}
    </div>
  )
}

export default function Standings({ matches }) {
  // Build standings from match results
  const teamMap = {}

  const addTeam = (name, flag, group) => {
    const key = `${group}-${name}`
    if (!teamMap[key]) {
      teamMap[key] = { name, flag, group, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }
    }
    return teamMap[key]
  }

  matches.filter(m => m.status === 'done' && m.home_goals != null && m.group_name && !m.group_name.includes('R')).forEach(m => {
    const home = addTeam(m.home_team, m.home_flag, m.group_name)
    const away = addTeam(m.away_team, m.away_flag, m.group_name)

    home.mp++; away.mp++
    home.gf += m.home_goals; home.ga += m.away_goals
    away.gf += m.away_goals; away.ga += m.home_goals

    if (m.home_goals > m.away_goals) {
      home.w++; home.pts += 3; away.l++
    } else if (m.home_goals < m.away_goals) {
      away.w++; away.pts += 3; home.l++
    } else {
      home.d++; home.pts++; away.d++; away.pts++
    }

    home.gd = home.gf - home.ga
    away.gd = away.gf - away.ga
  })

  // Also add teams that haven't played yet
  matches.filter(m => m.group_name && !m.group_name.includes('R')).forEach(m => {
    addTeam(m.home_team, m.home_flag, m.group_name)
    addTeam(m.away_team, m.away_flag, m.group_name)
  })

  // Group by group letter
  const groups = {}
  Object.values(teamMap).forEach(team => {
    if (!groups[team.group]) groups[team.group] = []
    if (!groups[team.group].find(t => t.name === team.name)) {
      groups[team.group].push(team)
    }
  })

  const groupLetters = Object.keys(groups).sort()

  if (groupLetters.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 0' }}>
        No group stage results yet
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>📊 Group Standings</h2>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c896', display: 'inline-block' }} /> Qualify</span>
        <span style={{ color: '#C9A84C' }}>■ Points</span>
      </div>
      {groupLetters.map(g => (
        <StandingsTable key={g} group={g} teams={groups[g]} />
      ))}
    </div>
  )
}
