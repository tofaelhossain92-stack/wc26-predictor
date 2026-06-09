'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PitchBackground from '@/components/PitchBackground'

const AVATARS = [
  { id: 'cool',      label: 'Cool',     file: '/avatars/cool.svg' },
  { id: 'angry',     label: 'Angry',    file: '/avatars/angry.svg' },
  { id: 'party',     label: 'Party',    file: '/avatars/party.svg' },
  { id: 'nerd',      label: 'Nerd',     file: '/avatars/nerd.svg' },
  { id: 'cry',       label: 'Cry',      file: '/avatars/cry.svg' },
  { id: 'devil',     label: 'Devil',    file: '/avatars/devil.svg' },
  { id: 'skull',     label: 'Skull',    file: '/avatars/skull.svg' },
  { id: 'mindblown', label: 'Blown',    file: '/avatars/mindblown.svg' },
  { id: 'sleepy',    label: 'Sleepy',   file: '/avatars/sleepy.svg' },
  { id: 'lol',       label: 'LOL',      file: '/avatars/lol.svg' },
  { id: 'hot',       label: 'Hot',      file: '/avatars/hot.svg' },
  { id: 'smug',      label: 'Smug',     file: '/avatars/smug.svg' },
  { id: 'scared',    label: 'Scared',   file: '/avatars/scared.svg' },
  { id: 'money',     label: 'Money',    file: '/avatars/money.svg' },
  { id: 'chicken',   label: 'Chicken',  file: '/avatars/chicken.svg' },
  { id: 'monkey',    label: 'Monkey',   file: '/avatars/monkey.svg' },
]

// Inline trophy SVG — never breaks
const TrophySVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 260" fill="none" width="90" height="117" style={{ filter: 'drop-shadow(0 0 18px rgba(255,200,0,0.55))' }}>
    <defs>
      <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFE066"/>
        <stop offset="30%" stopColor="#FFD700"/>
        <stop offset="60%" stopColor="#C8960C"/>
        <stop offset="100%" stopColor="#FFE566"/>
      </linearGradient>
      <linearGradient id="g2" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFF0A0"/>
        <stop offset="50%" stopColor="#DAA520"/>
        <stop offset="100%" stopColor="#B8860B"/>
      </linearGradient>
      <linearGradient id="g3" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFD700"/>
        <stop offset="100%" stopColor="#8B6914"/>
      </linearGradient>
    </defs>
    <rect x="55" y="230" width="90" height="14" rx="4" fill="url(#g3)"/>
    <rect x="62" y="224" width="76" height="10" rx="3" fill="url(#g2)"/>
    <rect x="88" y="195" width="24" height="32" rx="3" fill="url(#g2)"/>
    <rect x="84" y="205" width="32" height="6" rx="2" fill="url(#g1)"/>
    <path d="M 58 195 Q 55 160 52 130 L 148 130 Q 145 160 142 195 Z" fill="url(#g1)"/>
    <path d="M 50 130 Q 48 105 55 85 Q 70 65 100 60 Q 130 65 145 85 Q 152 105 150 130 Z" fill="url(#g2)"/>
    <ellipse cx="100" cy="60" rx="45" ry="10" fill="url(#g1)"/>
    <ellipse cx="100" cy="62" rx="38" ry="7" fill="rgba(0,0,0,0.2)"/>
    <path d="M 55 90 Q 28 95 26 115 Q 26 132 52 132" stroke="url(#g1)" strokeWidth="8" fill="none" strokeLinecap="round"/>
    <path d="M 55 90 Q 28 95 26 115 Q 26 132 52 132" stroke="url(#g2)" strokeWidth="5" fill="none" strokeLinecap="round"/>
    <path d="M 145 90 Q 172 95 174 115 Q 174 132 148 132" stroke="url(#g1)" strokeWidth="8" fill="none" strokeLinecap="round"/>
    <path d="M 145 90 Q 172 95 174 115 Q 174 132 148 132" stroke="url(#g2)" strokeWidth="5" fill="none" strokeLinecap="round"/>
    <path d="M 72 80 Q 78 70 100 68 Q 88 95 80 130" fill="rgba(255,255,220,0.22)"/>
    <path d="M 80 100 Q 84 96 90 98 Q 95 96 100 99 Q 106 97 110 100 Q 114 103 112 108 Q 108 112 102 110 Q 96 114 90 111 Q 84 109 80 105 Z" fill="rgba(160,110,0,0.35)"/>
    <ellipse cx="80" cy="88" rx="6" ry="9" fill="rgba(255,255,255,0.28)" transform="rotate(-20 80 88)"/>
    <ellipse cx="88" cy="82" rx="2" ry="3" fill="rgba(255,255,255,0.38)" transform="rotate(-20 88 82)"/>
  </svg>
)

export default function JoinPage() {
  const router = useRouter()
  const [name, setName]         = useState('')
  const [avatar, setAvatar]     = useState('cool')
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError]       = useState('')
  const [hovered, setHovered]   = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('wc26_user')
    if (stored) {
      try {
        const user = JSON.parse(stored)
        if (user?.id) { router.push('/game'); return }
      } catch {}
    }
    setChecking(false)
  }, [router])

  async function handleJoin() {
    if (!name.trim()) return
    setLoading(true); setError('')
    try {
      const selectedAvatar = AVATARS.find(a => a.id === avatar)
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), avatar: selectedAvatar?.file || '/avatars/cool.svg' }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      localStorage.setItem('wc26_user', JSON.stringify({ ...data.user, _savedAt: Date.now() }))
      router.push('/game')
    } catch (err) {
      setError(err.message || 'Something went wrong.'); setLoading(false)
    }
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#060d1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="pulsing" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Loading...</div>
    </div>
  )

  const selectedAvatar = AVATARS.find(a => a.id === avatar)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(0,160,60,0.3) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(0,80,200,0.2) 0%, transparent 50%), linear-gradient(180deg, #060d1a 0%, #081a0e 40%, #060d1a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'Georgia', serif", position: 'relative', overflow: 'hidden',
    }}>
      <PitchBackground />

      <div className="fade-in" style={{
        background: 'rgba(5,20,10,0.75)', border: '1px solid rgba(0,200,80,0.15)',
        borderRadius: 24, padding: '40px 36px', maxWidth: 500, width: '100%',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,200,80,0.1) inset',
        position: 'relative', zIndex: 10,
      }}>
        {/* Top glow line */}
        <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,220,80,0.7), transparent)', borderRadius: 1 }} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <TrophySVG />
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,160,60,0.15)', border: '1px solid rgba(0,200,80,0.2)', borderRadius: 30, padding: '4px 14px', marginBottom: 12, fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 2 }}>
            🇲🇽 MEXICO · 🇺🇸 USA · 🇨🇦 CANADA
          </div>
          <h1 style={{ color: '#fff', margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1 }}>FIFA World Cup</h1>
          <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: -2, margin: '2px 0 4px', background: 'linear-gradient(135deg, #FFE566, #FFD700, #C8960C, #FFE566)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>2026</div>
          <p style={{ color: 'rgba(255,255,255,0.3)', margin: 0, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}>Predictor · Friends Edition</p>
        </div>

        {/* Avatar picker */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' }}>Pick your character</label>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{selectedAvatar?.label}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
            {AVATARS.map(a => (
              <button
                key={a.id}
                onClick={() => setAvatar(a.id)}
                onMouseEnter={() => setHovered(a.id)}
                onMouseLeave={() => setHovered(null)}
                title={a.label}
                style={{
                  background: avatar === a.id ? 'rgba(255,210,0,0.15)' : hovered === a.id ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                  border: avatar === a.id ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.06)',
                  borderRadius: 10, padding: 3, cursor: 'pointer',
                  transition: 'all 0.15s',
                  transform: avatar === a.id ? 'scale(1.12)' : hovered === a.id ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: avatar === a.id ? '0 0 12px rgba(255,210,0,0.3)' : 'none',
                }}
              >
                <img
                  src={a.file}
                  alt={a.label}
                  width={48}
                  height={48}
                  style={{ width: '100%', aspectRatio: '1', display: 'block', borderRadius: 6 }}
                  onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
                />
                <div style={{ display: 'none', width: '100%', aspectRatio: '1', alignItems: 'center', justifyContent: 'center', fontSize: 20, borderRadius: 6, background: 'rgba(255,255,255,0.1)' }}>
                  {['😎','😤','🎉','🤓','😂','😈','💀','🤯','😴','🤣','🥵','😏','😱','🤑','🐔','🙈'][AVATARS.indexOf(a)]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Name input */}
        <div style={{ marginBottom: 6 }}>
          <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Your name</label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="Enter your name..."
            maxLength={30}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(0,200,80,0.2)', borderRadius: 12, padding: '13px 16px', color: '#fff', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginBottom: 18, marginTop: 6 }}>
          💡 Same name on any device = same account
        </p>

        {error && (
          <div style={{ background: 'rgba(255,74,74,0.1)', border: '1px solid rgba(255,74,74,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#ff4a4a', fontSize: 13 }}>{error}</div>
        )}

        <button onClick={handleJoin} disabled={!name.trim() || loading} style={{
          width: '100%', padding: '14px',
          background: name.trim() && !loading ? 'linear-gradient(135deg, #007A2A, #00A83C, #00C84A)' : 'rgba(255,255,255,0.06)',
          border: name.trim() ? '1px solid rgba(0,200,80,0.4)' : '1px solid transparent',
          borderRadius: 12, color: name.trim() && !loading ? '#fff' : 'rgba(255,255,255,0.2)',
          fontSize: 16, fontWeight: 700, cursor: name.trim() && !loading ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s', boxShadow: name.trim() && !loading ? '0 4px 24px rgba(0,168,60,0.4)' : 'none',
        }}>
          {loading ? 'Joining...' : '⚽  Kick Off'}
        </button>

        <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, textAlign: 'center', marginTop: 12, marginBottom: 0, letterSpacing: 1 }}>
          No sign-up · No email · Just football
        </p>
      </div>
    </div>
  )
}
