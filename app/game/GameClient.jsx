'use client'
import PitchBackground from '@/components/PitchBackground'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MatchPredictor from '@/components/MatchPredictor'
import Leaderboard   from '@/components/Leaderboard'
import TrashTalk     from '@/components/TrashTalk'

const TABS = [
  { id: 'predict',     label: '⚽ Predict' },
  { id: 'leaderboard', label: '🏅 Leaderboard' },
  { id: 'trash',       label: '💬 Trash Talk' },
]

export default function GameClient() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser]               = useState(null)
  const [tab, setTab]                 = useState(searchParams.get('tab') || 'predict')
  const [matches, setMatches]         = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading]         = useState(true)

  // Load user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('wc26_user')
    if (!stored) { router.push('/'); return }
    setUser(JSON.parse(stored))
  }, [router])

  // Fetch matches from Supabase
  const fetchMatches = useCallback(async () => {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .order('kickoff_time', { ascending: true })
    if (data) setMatches(data)
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

  // Realtime subscriptions
  useEffect(() => {
    const matchSub = supabase
      .channel('matches-channel')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, () => fetchMatches())
      .subscribe()

    const userSub = supabase
      .channel('users-channel')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, () => fetchLeaderboard())
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

  if (!user || loading) return (
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
          <button
            onClick={() => { localStorage.removeItem('wc26_user'); router.push('/') }}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}
          >Switch</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(10,15,30,0.6)', position: 'sticky', top: 57, zIndex: 99,
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '14px 8px', background: 'none',
            border: 'none', borderBottom: tab === t.id ? '2px solid #f5c518' : '2px solid transparent',
            color: tab === t.id ? '#f5c518' : 'rgba(255,255,255,0.35)',
            fontSize: 13, fontWeight: tab === t.id ? 700 : 400, cursor: 'pointer',
            transition: 'all 0.2s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        {tab === 'predict'     && <MatchPredictor matches={matches} user={user} leaderboard={leaderboard} onPredicted={fetchLeaderboard} />}
        {tab === 'leaderboard' && <Leaderboard leaderboard={leaderboard} currentUserId={user.id} />}
        {tab === 'trash'       && <TrashTalk user={user} />}
      </div>
    </div>
  )
}
