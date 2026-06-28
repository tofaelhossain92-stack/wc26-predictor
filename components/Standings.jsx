'use client'
import { useState, useEffect } from 'react'

const KNOCKOUT_GROUPS = ['R32', 'R16', 'QF', 'SF', '3RD', 'FINAL']
const KNOCKOUT_LABELS = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-Finals',
  SF: 'Semi-Finals',
  '3RD': '3rd Place Playoff',
  FINAL: 'Final',
}
const KNOCKOUT_ICONS = {
  R32: '🔥', R16: '⚡', QF: '🏆', SF: '🌟', '3RD': '🥉', FINAL: '👑',
}

function StatusBadge({ match }) {
  if (match.status === 'live') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: 'rgba(200,16,46,0.15)', border: '1px solid rgba(200,16,46,0.4)',
        borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 800, color: '#ff4d4d',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff4d4d', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
        LIVE {match.match_period || ''}
      </span>
    )
  }
  if (match.status === 'done') {
    return (
      <span style={{
        background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.35)',
        borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 800, color: '#00c896',
      }}>
        ✓ FULL TIME
      </span>
    )
  }
  return (
    <span style={{
      background: 'rgba(74,158,255,0.1)', border: '1px solid rgba(74,158,255,0.3)',
      borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#4a9eff',
    }}>
      UPCOMING
    </span>
  )
}

function TeamRow({ flag, name, score, isWinner, isTBD, align }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      flexDirection: align === 'right' ? 'row-reverse' : 'row',
      justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
    }}>
      <span style={{ fontSize: 26, flexShrink: 0, opacity: isTBD ? 0.3 : 1 }}>{flag || '🏳️'}</span>
      <span style={{
        color: isTBD ? 'rgba(255,255,255,0.3)' : (isWinner ? '#fff' : 'rgba(255,255,255,0.65)'),
        fontSize: 15, fontWeight: isWinner ? 800 : 600,
        textAlign: align === 'right' ? 'right' : 'left',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {isTBD ? 'TBD' : name}
      </span>
      {score != null && (
        <span style={{
          color: isWinner ? '#C9A84C' : 'rgba(255,255,255,0.4)',
          fontSize: 22, fontWeight: 900, minWidth: 28, textAlign: 'center', flexShrink: 0,
        }}>
          {score}
        </span>
      )}
    </div>
  )
}

function KnockoutCard({ match }) {
  const isHomeTBD = !match.home_team || match.home_team.startsWith('TBD')
  const isAwayTBD = !match.away_team || match.away_team.startsWith('TBD')
  const isDone = match.status === 'done'
  const isLive = match.status === 'live'
  const homeWin = isDone && match.home_goals > match.away_goals
  const awayWin = isDone && match.away_goals > match.home_goals

  const dateStr = new Date(match.kickoff_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeStr = new Date(match.kickoff_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  const borderColor = isLive ? 'rgba(200,16,46,0.4)' : isDone ? 'rgba(0,200,150,0.25)' : 'rgba(255,255,255,0.08)'
  const glow = isLive ? '0 0 24px rgba(200,16,46,0.15)' : 'none'

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(18,28,48,0.98), rgba(10,16,30,1))',
      border: `1px solid ${borderColor}`,
      borderRadius: 18, padding: '16px 18px', marginBottom: 12,
      boxShadow: glow,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Top row: date/time + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600 }}>
          {dateStr} · {timeStr}
        </span>
        <StatusBadge match={match} />
      </div>

      {/* Teams */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <TeamRow
            flag={match.home_flag} name={match.home_team}
            score={isDone || isLive ? match.home_goals : null}
            isWinner={homeWin} isTBD={isHomeTBD} align="left"
          />
        </div>
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>VS</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <TeamRow
            flag={match.away_flag} name={match.away_team}
            score={isDone || isLive ? match.away_goals : null}
            isWinner={awayWin} isTBD={isAwayTBD} align="right"
          />
        </div>
      </div>

      {/* Penalty / extra time note */}
      {isDone && match.match_period && match.match_period !== 'FT' && (
        <div style={{ marginTop: 10, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600 }}>
          {match.match_period}
        </div>
      )}
    </div>
  )
}

export default function Standings({ matches }) {
  // ── Build knockout stage matches only ────────────────────────────────────
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
      <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>

      <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>🏆 Knockout Stage</h2>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 20 }}>
        Group stage complete — single elimination from here
      </p>

      {knockoutStages.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 0' }}>
          Knockout stage hasn't started yet
        </div>
      ) : (
        knockoutStages.map(stage => (
          <div key={stage} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>{KNOCKOUT_ICONS[stage]}</span>
              <span style={{ color: '#C9A84C', fontSize: 14, fontWeight: 800, letterSpacing: 1 }}>
                {KNOCKOUT_LABELS[stage] || stage}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
                ({knockoutByStage[stage].length} {knockoutByStage[stage].length === 1 ? 'match' : 'matches'})
              </span>
            </div>
            {knockoutByStage[stage].map(m => <KnockoutCard key={m.id} match={m} />)}
          </div>
        ))
      )}
    </div>
  )
}
