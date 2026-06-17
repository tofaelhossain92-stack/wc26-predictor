'use client'
import { useState, useEffect } from 'react'

const ADMIN_PASSWORD = 'wc26admin'

export default function AdminPage() {
  const [authed, setAuthed]       = useState(false)
  const [password, setPassword]   = useState('')
  const [matches, setMatches]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [message, setMessage]     = useState(null)
  const [editing, setEditing]     = useState(null) // match being edited
  const [form, setForm]           = useState({})

  useEffect(() => {
    if (authed) fetchMatches()
  }, [authed])

  async function fetchMatches() {
    setLoading(true)
    const res  = await fetch('/api/matches')
    const data = await res.json()
    if (data.ok) setMatches(data.matches.sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time)))
    setLoading(false)
  }

  async function saveMatch() {
    setMessage(null)
    const res = await fetch('/api/admin/update-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: ADMIN_PASSWORD, matchId: editing.id, ...form })
    })
    const data = await res.json()
    if (data.ok) {
      setMessage({ type: 'success', text: `✅ ${editing.home_team} vs ${editing.away_team} updated!` })
      setEditing(null)
      fetchMatches()
      // Also trigger points recalculation if match is done
      if (form.status === 'done') {
        await fetch(`/api/settle?secret=wc26cron2026`)
        setMessage({ type: 'success', text: `✅ Updated + points recalculated!` })
      }
    } else {
      setMessage({ type: 'error', text: `❌ ${data.error}` })
    }
  }

  async function triggerLiveSync() {
    setMessage({ type: 'info', text: '🔄 Syncing...' })
    const res  = await fetch('/api/live-scores')
    const data = await res.json()
    setMessage({ type: 'success', text: `✅ Sync done — ${data.updated} matches updated` })
    fetchMatches()
  }

  async function triggerSettle() {
    setMessage({ type: 'info', text: '🔄 Recalculating points...' })
    const res  = await fetch('/api/settle?secret=wc26cron2026')
    const data = await res.json()
    setMessage({ type: 'success', text: `✅ Points recalculated — ${data.matches_settled} matches settled` })
  }

  function openEdit(match) {
    setEditing(match)
    setForm({
      status:       match.status,
      home_goals:   match.home_goals ?? '',
      away_goals:   match.away_goals ?? '',
      match_period: match.match_period ?? '',
      kickoff_time: match.kickoff_time ? match.kickoff_time.replace('+00', '').replace(' ', 'T').slice(0, 16) : '',
    })
  }

  const statusColor = { live: '#C8102E', done: '#C9A84C', upcoming: '#4a9eff' }
  const groupedByDate = matches.reduce((acc, m) => {
    const d = new Date(m.kickoff_time).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
    if (!acc[d]) acc[d] = []
    acc[d].push(m)
    return acc
  }, {})

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 40, width: 320, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: 20, marginBottom: 24 }}>WC26 Admin</div>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && password === ADMIN_PASSWORD && setAuthed(true)}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 15, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
        />
        <button
          onClick={() => password === ADMIN_PASSWORD ? setAuthed(true) : setMessage({ type: 'error', text: 'Wrong password' })}
          style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#C9A84C,#a8832a)', color: '#0a0f1e', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}
        >Login</button>
        {message && <div style={{ marginTop: 12, color: message.type === 'error' ? '#ff4a4a' : '#00c896', fontSize: 13 }}>{message.text}</div>}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ color: '#C9A84C', fontWeight: 900, fontSize: 22 }}>⚙️ WC26 Admin</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>{matches.length} matches in DB</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={triggerLiveSync} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(74,158,255,0.4)', background: 'rgba(74,158,255,0.1)', color: '#4a9eff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              🔄 Sync Scores
            </button>
            <button onClick={triggerSettle} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.1)', color: '#C9A84C', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              🏆 Recalc Points
            </button>
            <button onClick={fetchMatches} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{ padding: '12px 16px', borderRadius: 12, marginBottom: 16, background: message.type === 'error' ? 'rgba(200,16,46,0.1)' : message.type === 'info' ? 'rgba(74,158,255,0.1)' : 'rgba(0,200,100,0.1)', border: `1px solid ${message.type === 'error' ? 'rgba(200,16,46,0.3)' : message.type === 'info' ? 'rgba(74,158,255,0.3)' : 'rgba(0,200,100,0.3)'}`, color: message.type === 'error' ? '#ff4a4a' : message.type === 'info' ? '#4a9eff' : '#00c896', fontSize: 13, fontWeight: 600 }}>
            {message.text}
          </div>
        )}

        {/* Match list by date */}
        {loading ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40 }}>Loading...</div>
        ) : (
          Object.entries(groupedByDate).map(([date, dayMatches]) => (
            <div key={date} style={{ marginBottom: 24 }}>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>{date}</div>
              {dayMatches.map(match => (
                <div key={match.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${statusColor[match.status]}22`, color: statusColor[match.status], border: `1px solid ${statusColor[match.status]}44` }}>
                        {match.status.toUpperCase()} {match.match_period ? `· ${match.match_period}` : ''}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>Group {match.group_name}</span>
                    </div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                      {match.home_flag} {match.home_team}
                      {match.home_goals != null && match.status !== 'upcoming' && (
                        <span style={{ color: '#C9A84C', margin: '0 8px' }}>{match.home_goals}–{match.away_goals}</span>
                      )}
                      {match.away_team} {match.away_flag}
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(match)}
                    style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    ✏️ Edit
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 16 }}>
          <div style={{ background: '#0f1628', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
              {editing.home_flag} {editing.home_team} vs {editing.away_team} {editing.away_flag}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 24 }}>Match ID: {editing.id}</div>

            {/* Status */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 6 }}>STATUS</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['upcoming','live','done'].map(s => (
                  <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))} style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: `1px solid ${form.status === s ? statusColor[s] : 'rgba(255,255,255,0.1)'}`, background: form.status === s ? `${statusColor[s]}22` : 'transparent', color: form.status === s ? statusColor[s] : 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: 12, cursor: 'pointer', textTransform: 'uppercase' }}>{s}</button>
                ))}
              </div>
            </div>

            {/* Score */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 6 }}>SCORE</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="number" min={0} max={20} value={form.home_goals} onChange={e => setForm(f => ({ ...f, home_goals: e.target.value }))}
                  style={{ flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 24, fontWeight: 900, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#C9A84C', outline: 'none' }} />
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 20, fontWeight: 700 }}>–</span>
                <input type="number" min={0} max={20} value={form.away_goals} onChange={e => setForm(f => ({ ...f, away_goals: e.target.value }))}
                  style={{ flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 24, fontWeight: 900, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#C9A84C', outline: 'none' }} />
              </div>
            </div>

            {/* Match period */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 6 }}>MATCH PERIOD (e.g. 45', HT, 90', FT)</label>
              <input value={form.match_period} onChange={e => setForm(f => ({ ...f, match_period: e.target.value }))}
                placeholder="e.g. 67' or HT or FT"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Kickoff time */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 1, display: 'block', marginBottom: 6 }}>KICKOFF TIME (UTC)</label>
              <input type="datetime-local" value={form.kickoff_time} onChange={e => setForm(f => ({ ...f, kickoff_time: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditing(null)} style={{ flex: 1, padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveMatch} style={{ flex: 2, padding: 14, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#C9A84C,#a8832a)', color: '#0a0f1e', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
