'use client'
import { useState } from 'react'

const MEDALS = ['🥇', '🥈', '🥉']

function StatCard({ label, player }) {
  if (!player) return null
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12, padding: '14px 16px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 28, marginBottom: 4 }}>
        {player.avatar?.startsWith('/') ? <img src={player.avatar} alt="avatar" style={{ width: 36, height: 36, borderRadius: 8 }} /> : player.avatar}
      </div>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{player.name}</div>
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 4 }}>{label}</div>
    </div>
  )
}

function PredictionHistory({ predictions }) {
  if (!predictions?.length) return (
    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '12px 0', textAlign: 'center' }}>
      No predictions yet
    </div>
  )

  return (
    <div style={{ marginTop: 12 }}>
      {predictions.map(p => {
        const isCorrect = p.pointsEarned >= 3
        const isExact   = p.pointsEarned === 10
        const isDone    = p.matchStatus === 'done'

        return (
          <div key={p.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 12px', borderRadius: 10, marginBottom: 6,
            background: isDone
              ? isCorrect ? 'rgba(0,200,150,0.06)' : 'rgba(255,255,255,0.02)'
              : 'rgba(255,255,255,0.02)',
            border: `1px solid ${isDone && isCorrect ? 'rgba(0,200,150,0.15)' : 'rgba(255,255,255,0.06)'}`,
          }}>
            <div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
                {p.homeFlag} {p.homeTeam} vs {p.awayTeam} {p.awayFlag}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>
                Your pick: <strong style={{ color: '#f5c518' }}>{p.predictedHome}–{p.predictedAway}</strong>
                {isDone && p.actualHome != null && (
                  <> · Actual: <strong style={{ color: '#fff' }}>{p.actualHome}–{p.actualAway}</strong></>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right', minWidth: 48 }}>
              {isDone ? (
                <span style={{
                  color: isCorrect ? '#00c896' : 'rgba(255,255,255,0.3)',
                  fontWeight: 700, fontSize: 15,
                }}>
                  {isExact ? '🎯' : isCorrect ? '✓' : '✗'} {p.pointsEarned}
                </span>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
                  {p.matchStatus === 'live' ? '🔴' : '⏳'}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Leaderboard({ leaderboard, currentUserId }) {
  const [expanded, setExpanded] = useState(null)

  // Fun stat derivations
  const withPreds = leaderboard.filter(p => p.stats?.totalPredictions > 0)

  const mostPredictions  = withPreds.length ? withPreds.reduce((a, b) => a.stats.totalPredictions >= b.stats.totalPredictions ? a : b) : null
  const biggestRiskTaker = withPreds.length ? withPreds.reduce((a, b) => a.stats.riskPredictions >= b.stats.riskPredictions ? a : b) : null
  const worstPredictor   = withPreds.length > 1 ? leaderboard.filter(p => p.stats?.finishedMatches > 0).reduce((a, b) => (a?.points ?? 999) <= (b?.points ?? 999) ? a : b, null) : null
  const mostAccurate     = withPreds.filter(p => p.stats?.finishedMatches > 0).length
    ? withPreds.filter(p => p.stats?.finishedMatches > 0).reduce((a, b) => a.stats.accuracy >= b.stats.accuracy ? a : b)
    : null

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>🏅 Leaderboard</h2>

      {/* Player rows */}
      {leaderboard.map((player, i) => (
        <div key={player.id}>
          <div
            onClick={() => setExpanded(expanded === player.id ? null : player.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: player.id === currentUserId ? 'rgba(245,197,24,0.08)' : 'rgba(255,255,255,0.03)',
              border: player.id === currentUserId ? '1px solid rgba(245,197,24,0.25)' : '1px solid rgba(255,255,255,0.07)',
              borderRadius: expanded === player.id ? '14px 14px 0 0' : 14,
              padding: '14px 18px', marginBottom: expanded === player.id ? 0 : 10,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: 22, minWidth: 32, textAlign: 'center' }}>
              {MEDALS[i] || <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>#{i + 1}</span>}
            </div>
            <div style={{ fontSize: 28 }}>
              {player.avatar?.startsWith('/') ? <img src={player.avatar} alt="avatar" style={{ width: 36, height: 36, borderRadius: 8, border: '2px solid rgba(255,255,255,0.1)' }} /> : player.avatar}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
                {player.name}
                {player.id === currentUserId && <span style={{ color: '#f5c518', fontSize: 11, marginLeft: 6 }}>(you)</span>}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>
                {player.stats?.totalPredictions || 0} predictions
                {player.stats?.finishedMatches > 0 && ` · ${player.stats.accuracy}% accurate`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#f5c518', fontSize: 24, fontWeight: 700 }}>{player.points}</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>pts</div>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginLeft: 4 }}>
              {expanded === player.id ? '▲' : '▼'}
            </div>
          </div>

          {/* Prediction history drawer */}
          {expanded === player.id && (
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
              borderTop: 'none', borderRadius: '0 0 14px 14px',
              padding: '14px 18px', marginBottom: 10,
            }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                Prediction History
              </div>
              <PredictionHistory predictions={player.predictions} />
            </div>
          )}
        </div>
      ))}

      {leaderboard.length === 0 && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 0' }}>
          No players yet — be the first! 🏆
        </div>
      )}

      {/* Fun stat cards */}
      {(mostPredictions || biggestRiskTaker || worstPredictor || mostAccurate) && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
            Fun Stats
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            <StatCard label="Most Predictions 📋" player={mostPredictions} />
            <StatCard label="Biggest Risk Taker 🎲" player={biggestRiskTaker} />
            <StatCard label="Most Accurate 🎯"    player={mostAccurate} />
            <StatCard label="Wooden Spoon 🥄"     player={worstPredictor} />
          </div>
        </div>
      )}
    </div>
  )
}
