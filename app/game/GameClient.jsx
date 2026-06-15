'use client'
import PitchBackground from '@/components/PitchBackground'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MatchPredictor from '@/components/MatchPredictor'
import Leaderboard   from '@/components/Leaderboard'
import TrashTalk     from '@/components/TrashTalk'
import Standings     from '@/components/Standings'
import Profile      from '@/components/Profile'

const TABS = [
  { id: 'predict',     label: 'Predict',     icon: '⚽' },
  { id: 'standings',   label: 'Standings',   icon: '📊' },
  { id: 'leaderboard', label: 'Leaders',     icon: '🏅' },
  { id: 'trash',       label: 'Trash',       icon: '💬' },
  { id: 'profile',     label: 'Profile',     icon: '👤' },
]

export default function GameClient() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser]               = useState(null)
  const [tab, setTab]                 = useState(searchParams.get('tab') || 'predict')
  const [matches, setMatches]         = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading]         = useState(true)
  const [userChecked, setUserChecked]   = useState(false)
  const [notifGranted, setNotifGranted] = useState(false)

  // Load user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('wc26_user')
    if (!stored) { router.push('/'); return }
    setUser(JSON.parse(stored))
    setUserChecked(true)
    // Check if push already granted
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async (OneSignal) => {
        const permission = await OneSignal.Notifications.permission
        setNotifGranted(!!permission)
      })
    }
  }, [router])

  // Fetch matches from Supabase
  const fetchMatches = useCallback(async () => {
    const res = await fetch('/api/matches', { cache: 'no-store' })
    const data = await res.json()
    if (data.ok) setMatches(data.matches)
  }, [])

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    const res  = await fetch('/api/leaderboard')
    const data = await res.json()
    if (data.ok) setLeaderboard(data.leaderboard)
  }, [])

  useEffect(() => {
    if (!user) return
    Promise.all([fetchMatches(), fetchLeaderboard()]).then(() => setLoading(false))
  }, [user, fetchMatches, fetchLeaderboard])

  // Live score polling — runs every 60s when a live match exists
  useEffect(() => {
    const now = new Date()
    const hasLive = matches.some(m => {
      const kickoff = new Date(m.kickoff_time)
      const kickoffPlus90 = new Date(kickoff.getTime() + 110 * 60 * 1000)
      return m.status === 'live' || (m.status === 'upcoming' && now >= kickoff && now <= kickoffPlus90)
    })
    if (!hasLive) return
    // Sync immediately on load
    fetchMatches()
    // Then every 15s
    const interval = setInterval(() => fetchMatches(), 15000)
    return () => clearInterval(interval)
  }, [matches, fetchMatches])

  // Realtime subscriptions
  useEffect(() => {
    const matchSub = supabase
      .channel('matches-channel')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, () => fetchMatches())
      .subscribe()

    const userSub = supabase
      .channel('users-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchLeaderboard())
      .subscribe()

    return () => {
      supabase.removeChannel(matchSub)
      supabase.removeChannel(userSub)
    }
  }, [fetchMatches, fetchLeaderboard])

  // Ask for push permission after user joins
  useEffect(() => {
    if (!user) return
    const timer = setTimeout(() => {
      if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async (OneSignal) => {
          const permission = await OneSignal.Notifications.permission
          if (!permission) OneSignal.Slidedown.promptPush()
        })
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [user])

  if (!userChecked || !user || loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="pulsing" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>Loading...</div>
    </div>
  )

  const currentPlayerData = leaderboard.find(p => p.id === user.id)

  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(ellipse at 50% -10%, rgba(0,160,60,0.15) 0%, transparent 50%), linear-gradient(180deg, #060d1a 0%, #0a1628 60%, #071510 100%)` }}>
      <PitchBackground />

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(4,10,20,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🏆</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>WC26 Predictor</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Friends Edition</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {user.avatar?.startsWith('/') ? (
            <img src={user.avatar} alt="avatar" style={{ width: 36, height: 36, borderRadius: 8, border: '2px solid rgba(255,210,0,0.3)' }} />
          ) : (
            <span style={{ fontSize: 24 }}>{user.avatar || '⚽'}</span>
          )}
          <div>
            <div style={{ color: '#f5c518', fontWeight: 700, fontSize: 14 }}>{user.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{currentPlayerData?.points || 0} pts</div>
          </div>
          {!notifGranted && (
            <button
              onClick={() => {
                if (window.OneSignalDeferred) {
                  window.OneSignalDeferred.push(async (OneSignal) => {
                    await OneSignal.Slidedown.promptPush()
                    const permission = await OneSignal.Notifications.permission
                    setNotifGranted(!!permission)
                  })
                }
              }}
              style={{ background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 8, padding: '6px 10px', color: '#f5c518', fontSize: 12, cursor: 'pointer' }}
            >🔔</button>
          )}
          <button
            onClick={() => { localStorage.removeItem('wc26_user'); router.push('/') }}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}
          >Switch</button>
        </div>
      </div>



      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 90px 16px' }}>
        {tab === 'predict'     && <MatchPredictor matches={matches} user={user} leaderboard={leaderboard} onPredicted={fetchLeaderboard} />}
        {tab === 'standings'   && <Standings matches={matches} />}
        {tab === 'leaderboard' && <Leaderboard leaderboard={leaderboard} currentUserId={user.id} />}
        {tab === 'trash'       && <TrashTalk user={user} />}
        {tab === 'profile'     && <Profile user={user} matches={matches} leaderboard={leaderboard} />}
      </div>
      {/* Bottom Nav Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(4,10,20,0.96)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '8px 0 max(8px, env(safe-area-inset-bottom)) 0',
        display: 'flex', justifyContent: 'center',
      }}>
        <div style={{ display: 'flex', width: '100%', maxWidth: 680 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
            transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{t.icon}</span>
            <span style={{
              fontSize: 10, fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? '#C9A84C' : 'rgba(255,255,255,0.35)',
              letterSpacing: 0.3,
            }}>{t.label}</span>
            {tab === t.id && (
              <div style={{ position: 'absolute', bottom: 0, width: 4, height: 4, borderRadius: '50%', background: '#C9A84C' }} />
            )}
          </button>
        ))}
        </div>
      </div>
    </div>
  )
}
