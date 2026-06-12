'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ADMIN_PASSWORD = 'wc26admin'

export default function AdminPage() {
  const router = useRouter()
  const [authed, setAuthed]     = useState(false)
  const [password, setPassword] = useState('')
  const [matches, setMatches]   = useState([])
  const [saving, setSaving]     = useState({})
  const [saved, setSaved]       = useState({})
  const [scores, setScores]     = useState({})

  function login() {
    if (password === ADMIN_PASSWORD) setAuthed(true)
    else alert('Wrong password')
  }

  async function fetchMatches() {
    const res  = await fetch('/api/admin/matches')
    const data = await res.json()
    if (data.ok) {
      setMatches(data.matches)
      setScores(prev => {
        const init = {}
        data.matches.forEach(m => {
          // Only set initial values, don't overwrite what user has typed
          init[m.id] = prev[m.id] || { home: m.home_goals ?? 0, away: m.away_goals ?? 0, status: m.status }
        })
        return init
      })
    }
  }

  useEffect(() => { if (authed) fetchMatches() }, [authed])

  async function saveMatch(match) {
    setSaving(s => ({ ...s, [match.id]: true }))
    await fetch('/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:         match.id,
        home_goals: +scores[match.id].home,
        away_goals: +scores[match.id].away,
        status:     scores[match.id].status,
      })
    })
    setSaving(s => ({ ...s, [match.id]: false }))
    setSaved(s => ({ ...s, [match.id]: true }))
    setTimeout(() => setSaved(s => ({ ...s, [match.id]: false })), 2000)
  }

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>🔐</div>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, textAlign: 'center', marginBottom: 24 }}>Admin Access</div>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 15, marginBottom: 12, boxSizing: 'border-box', outline: 'none' }}
        />
        <button onClick={login} style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg,#f5c518,#e6a800)', border: 'none', borderRadius: 10, color: '#0a0f1e', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
          Enter
        </button>
      </div>
    </div>
  )

  const today = new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  const todayMatches  = matches.filter(m => new Date(m.kickoff_time).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) === today)
  const otherMatches  = matches.filter(m => new Date(m.kickoff_time).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) !== today)

  async function notifyMatch(match) {
    const res = await fetch('/api/admin/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: match.id })
    })
    const data = await res.json()
    if (data.ok) alert(`🔔 Notification sent for ${match.home_team} vs ${match.away_team}!`)
    else alert('Failed to send notification')
  }

  const renderMatch = (match) => (
    <div key={match.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px 20px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ color: '#fff', fontWeight: 700 }}>{match.home_flag} {match.home_team} vs {match.away_team} {match.away_flag}</div>
        <select
          value={scores[match.id]?.status || match.status}
          onChange={e => setScores(s => ({ ...s, [match.id]: { ...s[match.id], status: e.target.value } }))}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#f5c518', padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
        >
          <option value="upcoming">Upcoming</option>
          <option value="live">🔴 Live</option>
          <option value="done">✅ Done</option>
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="number" min={0} max={20}
          value={scores[match.id]?.home ?? 0}
          onChange={e => setScores(s => ({ ...s, [match.id]: { ...s[match.id], home: e.target.value } }))}
          style={{ width: 60, height: 48, textAlign: 'center', fontSize: 22, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#f5c518', outline: 'none' }}
        />
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>–</span>
        <input
          type="number" min={0} max={20}
          value={scores[match.id]?.away ?? 0}
          onChange={e => setScores(s => ({ ...s, [match.id]: { ...s[match.id], away: e.target.value } }))}
          style={{ width: 60, height: 48, textAlign: 'center', fontSize: 22, fontWeight: 700, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#f5c518', outline: 'none' }}
        />
        <button
          onClick={() => saveMatch(match)}
          disabled={saving[match.id]}
          style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg,#f5c518,#e6a800)', border: 'none', borderRadius: 10, color: '#0a0f1e', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving[match.id] ? 0.6 : 1 }}
        >
          {saving[match.id] ? 'Saving...' : saved[match.id] ? '✅ Saved!' : 'Update ✓'}
        </button>
        <button
          onClick={() => notifyMatch(match)}
          style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#fff', fontSize: 18, cursor: 'pointer' }}
          title="Send 5-min warning notification"
        >🔔</button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', padding: '20px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>⚽ Score Admin</div>
          <button onClick={() => router.push('/game')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 14px', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>← Back</button>
        </div>

        {todayMatches.length > 0 && (
          <>
            <div style={{ color: '#f5c518', fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Today — {today}</div>
            {todayMatches.map(renderMatch)}
          </>
        )}

        {otherMatches.length > 0 && (
          <>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, marginTop: 24 }}>All Matches</div>
            {otherMatches.map(renderMatch)}
          </>
        )}
      </div>
    </div>
  )
}
