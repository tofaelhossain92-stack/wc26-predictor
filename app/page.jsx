'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const AVATARS = ['🦁','🐯','🦊','🐺','🦅','🦈','🐉','🦄','🐸','🤖','👽','🔥','⚡','💎','🎯','🏆']

export default function JoinPage() {
  const router = useRouter()
  const [name, setName]     = useState('')
  const [avatar, setAvatar] = useState('🦁')
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

      // Store user in localStorage for session persistence
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
      background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1f3c 50%, #0a0f1e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      {/* BG grid */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.04, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 40px,#fff 40px,#fff 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,#fff 40px,#fff 41px)',
      }} />

      <div className="fade-in" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, padding: '48px 40px',
        maxWidth: 440, width: '100%',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
          <h1 style={{ color: '#fff', margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
            World Cup <span style={{ color: '#f5c518' }}>2026</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', margin: '8px 0 0', fontSize: 14 }}>
            Predictor Challenge · Friends Edition
          </p>
        </div>

        {/* Avatar picker */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Pick your avatar
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
            {AVATARS.map(a => (
              <button key={a} onClick={() => setAvatar(a)} style={{
                fontSize: 22,
                background: avatar === a ? 'rgba(245,197,24,0.2)' : 'rgba(255,255,255,0.05)',
                border: avatar === a ? '2px solid #f5c518' : '2px solid transparent',
                borderRadius: 10, padding: '6px 0', cursor: 'pointer', transition: 'all 0.15s',
              }}>{a}</button>
            ))}
          </div>
        </div>

        {/* Name input */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
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
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12, padding: '14px 16px', color: '#fff',
              fontSize: 16, outline: 'none',
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
            width: '100%', padding: 15,
            background: name.trim() && !loading ? 'linear-gradient(135deg,#f5c518,#e6a800)' : 'rgba(255,255,255,0.08)',
            border: 'none', borderRadius: 12,
            color: name.trim() && !loading ? '#0a0f1e' : 'rgba(255,255,255,0.3)',
            fontSize: 16, fontWeight: 700, cursor: name.trim() && !loading ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'Joining...' : 'Join the Game ⚽'}
        </button>

        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
          No sign-up · No email · Just football 🔥
        </p>
      </div>
    </div>
  )
}
