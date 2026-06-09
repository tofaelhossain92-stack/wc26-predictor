'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const AVATARS = [
  '🤡','😤','🥶','😎','🤓','😈','🥵','🤯',
  '🫠','🤪','😴','🤑','😇','🫡','🥴','👹',
  '💀','🤬','😱','🫣','🙈','🐔','🦧','🐧'
]

export default function JoinPage() {
  const router = useRouter()
  const [name, setName]     = useState('')
  const [avatar, setAvatar] = useState('😎')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  async function handleJoin() {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), avatar }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      localStorage.setItem('wc26_user', JSON.stringify(data.user))
      router.push('/game')
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: `
        radial-gradient(ellipse at 50% 0%, rgba(0,160,60,0.25) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 100%, rgba(0,80,200,0.2) 0%, transparent 50%),
        radial-gradient(ellipse at 20% 80%, rgba(180,0,60,0.15) 0%, transparent 50%),
        linear-gradient(180deg, #060d1a 0%, #0a1628 40%, #071510 100%)
      `,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'Georgia', serif", position: 'relative', overflow: 'hidden',
    }}>

      {/* Pitch lines background */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.04,
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 60px, #00ff44 60px, #00ff44 61px),
          repeating-linear-gradient(90deg, transparent, transparent 60px, #00ff44 60px, #00ff44 61px)
        `,
      }} />

      {/* Center circle */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 600, height: 600, borderRadius: '50%',
        border: '1px solid rgba(0,255,68,0.04)',
        pointerEvents: 'none',
      }} />

      {/* Floating balls decoration */}
      {['⚽','⚽','⚽'].map((b, i) => (
        <div key={i} style={{
          position: 'fixed',
          top: `${[15, 70, 40][i]}%`,
          left: `${[8, 88, 5][i]}%`,
          fontSize: [40, 30, 20][i],
          opacity: 0.06,
          pointerEvents: 'none',
          transform: `rotate(${[15, -20, 35][i]}deg)`,
        }}>{b}</div>
      ))}

      <div className="fade-in" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, padding: '44px 40px',
        maxWidth: 460, width: '100%',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,200,80,0.08) inset',
        position: 'relative',
      }}>

        {/* Top green glow line */}
        <div style={{
          position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(0,200,80,0.6), transparent)',
          borderRadius: 1,
        }} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {/* FIFA WC 2026 official-style logo */}
          <div style={{ fontSize: 64, marginBottom: 8, lineHeight: 1 }}>🌍</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, rgba(0,160,60,0.2), rgba(0,80,200,0.2))',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 30, padding: '4px 16px', marginBottom: 14,
            fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 3, textTransform: 'uppercase',
          }}>
            🇲🇽 USA 🇺🇸 Canada 🇨🇦
          </div>
          <h1 style={{ color: '#fff', margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.1 }}>
            FIFA World Cup
          </h1>
          <div style={{
            fontSize: 38, fontWeight: 900, letterSpacing: -1, marginTop: 2,
            background: 'linear-gradient(135deg, #e8c840, #f5a623, #e8c840)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>2026</div>
          <p style={{ color: 'rgba(255,255,255,0.35)', margin: '6px 0 0', fontSize: 13, letterSpacing: 1 }}>
            ⚽ Predictor Challenge · Friends Edition
          </p>
        </div>

        {/* Avatar picker */}
        <div style={{ marginBottom: 22 }}>
          <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Pick your vibe
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
            {AVATARS.map(a => (
              <button key={a} onClick={() => setAvatar(a)} style={{
                fontSize: 24, lineHeight: 1,
                background: avatar === a ? 'rgba(245,197,24,0.2)' : 'rgba(255,255,255,0.04)',
                border: avatar === a ? '2px solid #f5c518' : '2px solid rgba(255,255,255,0.06)',
                borderRadius: 10, padding: '7px 0', cursor: 'pointer',
                transition: 'all 0.15s',
                transform: avatar === a ? 'scale(1.1)' : 'scale(1)',
              }}>{a}</button>
            ))}
          </div>
        </div>

        {/* Name input */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Your name
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="Enter your name..."
            maxLength={30}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12, padding: '13px 16px', color: '#fff',
              fontSize: 16, outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        {error && (
          <div style={{ background: 'rgba(255,74,74,0.1)', border: '1px solid rgba(255,74,74,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#ff4a4a', fontSize: 13 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleJoin}
          disabled={!name.trim() || loading}
          style={{
            width: '100%', padding: '14px',
            background: name.trim() && !loading
              ? 'linear-gradient(135deg, #00a83c, #00c84a)'
              : 'rgba(255,255,255,0.07)',
            border: 'none', borderRadius: 12,
            color: name.trim() && !loading ? '#fff' : 'rgba(255,255,255,0.25)',
            fontSize: 16, fontWeight: 700, cursor: name.trim() && !loading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s', letterSpacing: 0.3,
            boxShadow: name.trim() && !loading ? '0 4px 20px rgba(0,168,60,0.4)' : 'none',
          }}
        >
          {loading ? 'Joining...' : '⚽ Join the Game'}
        </button>

        <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11, textAlign: 'center', marginTop: 14, marginBottom: 0, letterSpacing: 1 }}>
          No sign-up · No email · Just football
        </p>
      </div>
    </div>
  )
}
