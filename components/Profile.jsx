'use client'
import { useState } from 'react'

const ALL_TEAMS = [
  { name: 'Argentina', flag: '🇦🇷' }, { name: 'Australia', flag: '🇦🇺' },
  { name: 'Belgium', flag: '🇧🇪' }, { name: 'Bosnia & Herz.', flag: '🇧🇦' },
  { name: 'Brazil', flag: '🇧🇷' }, { name: 'Canada', flag: '🇨🇦' },
  { name: 'Cabo Verde', flag: '🇨🇻' }, { name: 'Colombia', flag: '🇨🇴' },
  { name: 'Congo DR', flag: '🇨🇩' }, { name: 'Croatia', flag: '🇭🇷' },
  { name: 'Czechia', flag: '🇨🇿' }, { name: "Côte d'Ivoire", flag: '🇨🇮' },
  { name: 'Curaçao', flag: '🇨🇼' }, { name: 'Ecuador', flag: '🇪🇨' },
  { name: 'Egypt', flag: '🇪🇬' }, { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { name: 'France', flag: '🇫🇷' }, { name: 'Germany', flag: '🇩🇪' },
  { name: 'Ghana', flag: '🇬🇭' }, { name: 'Haiti', flag: '🇭🇹' },
  { name: 'IR Iran', flag: '🇮🇷' }, { name: 'Iraq', flag: '🇮🇶' },
  { name: 'Japan', flag: '🇯🇵' }, { name: 'Jordan', flag: '🇯🇴' },
  { name: 'Korea Republic', flag: '🇰🇷' }, { name: 'Mexico', flag: '🇲🇽' },
  { name: 'Morocco', flag: '🇲🇦' }, { name: 'Netherlands', flag: '🇳🇱' },
  { name: 'New Zealand', flag: '🇳🇿' }, { name: 'Norway', flag: '🇳🇴' },
  { name: 'Panama', flag: '🇵🇦' }, { name: 'Paraguay', flag: '🇵🇾' },
  { name: 'Portugal', flag: '🇵🇹' }, { name: 'Qatar', flag: '🇶🇦' },
  { name: 'Saudi Arabia', flag: '🇸🇦' }, { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { name: 'Senegal', flag: '🇸🇳' }, { name: 'South Africa', flag: '🇿🇦' },
  { name: 'Spain', flag: '🇪🇸' }, { name: 'Sweden', flag: '🇸🇪' },
  { name: 'Switzerland', flag: '🇨🇭' }, { name: 'Tunisia', flag: '🇹🇳' },
  { name: 'Türkiye', flag: '🇹🇷' }, { name: 'Uruguay', flag: '🇺🇾' },
  { name: 'USA', flag: '🇺🇸' }, { name: 'Uzbekistan', flag: '🇺🇿' },
]

export default function Profile({ user, matches, leaderboard }) {
  const [favTeam, setFavTeam] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('wc26_fav_team') || null
    return null
  })
  const [picking, setPicking] = useState(false)
  const [search, setSearch] = useState('')

  const myData = leaderboard.find(p => p.id === user.id)
  const totalPredictions = myData?.stats?.totalPredictions || 0
  const correctPredictions = myData?.stats?.correctWinners || 0
  const accuracy = myData?.stats?.accuracy || 0
  const exactScores = myData?.stats?.exactScores || 0

  function selectTeam(team) {
    setFavTeam(team.name)
    localStorage.setItem('wc26_fav_team', team.name)
    setPicking(false)
    setSearch('')
  }

  const favTeamData = ALL_TEAMS.find(t => t.name === favTeam)
  const favMatches = favTeam ? matches.filter(m =>
    m.home_team === favTeam || m.away_team === favTeam
  ) : []

  const filteredTeams = ALL_TEAMS.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>👤 Profile</h2>

      {/* User card */}
      <div style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.03))', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 20, padding: '20px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        {user.avatar?.startsWith('/') ? (
          <img src={user.avatar} alt="avatar" style={{ width: 64, height: 64, borderRadius: 16, border: '2px solid rgba(201,168,76,0.4)' }} />
        ) : (
          <span style={{ fontSize: 52 }}>{user.avatar || '⚽'}</span>
        )}
        <div>
          <div style={{ color: '#C9A84C', fontWeight: 800, fontSize: 20 }}>{user.name}</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>{myData?.points || 0} pts total</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Predictions', value: totalPredictions, icon: '📋' },
          { label: 'Correct Results', value: correctPredictions, icon: '✅' },
          { label: 'Accuracy', value: `${accuracy}%`, icon: '🎯' },
          { label: 'Exact Scores', value: exactScores, icon: '💎' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ color: '#C9A84C', fontSize: 22, fontWeight: 800 }}>{s.value}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Favourite team */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Favourite Team</div>
        {favTeam && favTeamData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 40 }}>{favTeamData.flag}</span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>{favTeam}</span>
            </div>
            <button onClick={() => setPicking(true)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>Change</button>
          </div>
        ) : (
          <button onClick={() => setPicking(true)} style={{ width: '100%', padding: '12px', background: 'rgba(201,168,76,0.1)', border: '1px dashed rgba(201,168,76,0.3)', borderRadius: 12, color: '#C9A84C', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            🏳️ Pick your favourite team
          </button>
        )}
      </div>

      {/* Team picker modal */}
      {picking && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setPicking(false)}>
          <div style={{ background: '#0f1929', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px 20px 0 0', padding: '20px 16px', width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 12, textAlign: 'center' }}>🏆 Pick Your Team</div>
            <input
              type="text"
              placeholder="Search team..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 14, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }}
            />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredTeams.map(t => (
                <div key={t.name} onClick={() => selectTeam(t)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', borderRadius: 8 }}>
                  <span style={{ fontSize: 28 }}>{t.flag}</span>
                  <span style={{ color: '#fff', fontSize: 14 }}>{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Favourite team matches */}
      {favTeam && favMatches.length > 0 && (
        <div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>{favTeamData?.flag} {favTeam} Matches</div>
          {favMatches.map(m => {
            const isHome = m.home_team === favTeam
            const opponent = isHome ? m.away_team : m.home_team
            const oppFlag = isHome ? m.away_flag : m.home_flag
            const favGoals = isHome ? m.home_goals : m.away_goals
            const oppGoals = isHome ? m.away_goals : m.home_goals
            const kt = new Date(m.kickoff_time)
            const dateStr = kt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
            const timeStr = kt.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })

            let result = null
            let resultColor = 'rgba(255,255,255,0.3)'
            if (m.status === 'done' && favGoals != null) {
              if (favGoals > oppGoals) { result = 'W'; resultColor = '#00c896' }
              else if (favGoals < oppGoals) { result = 'L'; resultColor = '#C8102E' }
              else { result = 'D'; resultColor = '#A8A9AD' }
            }

            return (
              <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${m.status === 'live' ? 'rgba(200,16,46,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{oppFlag}</span>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{isHome ? 'vs' : '@'} {opponent}</div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>{dateStr} · {timeStr}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {m.status === 'done' && favGoals != null ? (
                    <>
                      <div style={{ color: '#C9A84C', fontWeight: 800, fontSize: 16 }}>{favGoals}–{oppGoals}</div>
                      <div style={{ color: resultColor, fontSize: 12, fontWeight: 700 }}>{result}</div>
                    </>
                  ) : m.status === 'live' ? (
                    <div style={{ color: '#C8102E', fontWeight: 800, fontSize: 14 }}>🔴 {favGoals ?? 0}–{oppGoals ?? 0}</div>
                  ) : (
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Upcoming</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
