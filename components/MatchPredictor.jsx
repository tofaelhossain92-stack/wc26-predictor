'use client'
import { useState, useRef, useEffect } from 'react'
import { calcStandings } from '@/lib/standings'

// ── FIFA Rankings (March 2026) ─────────────────────────────────────────────
const FIFA_RANKINGS = {
  'Argentina': 1, 'Spain': 2, 'France': 3, 'England': 4, 'Portugal': 5,
  'Brazil': 6, 'Morocco': 7, 'Netherlands': 8, 'Belgium': 9, 'Germany': 10,
  'Croatia': 11, 'Italy': 12, 'Colombia': 13, 'Mexico': 14, 'Senegal': 15,
  'Uruguay': 16, 'USA': 17, 'Japan': 18, 'Switzerland': 19, 'IR Iran': 20,
  'Denmark': 21, 'Türkiye': 22, 'Ecuador': 23, 'Austria': 24, 'Korea Republic': 25,
  'Nigeria': 26, 'Australia': 27, 'Algeria': 28, 'Egypt': 29, 'Canada': 30,
  'Norway': 31, 'Ukraine': 32, "Côte d'Ivoire": 33, 'Panama': 34, 'Russia': 35,
  'Poland': 36, 'Wales': 37, 'Sweden': 38, 'Hungary': 39, 'Czechia': 40,
  'Paraguay': 41, 'Scotland': 42, 'Serbia': 43, 'Cameroon': 44, 'Tunisia': 45,
  'Congo DR': 46, 'Slovakia': 47, 'Greece': 48, 'Venezuela': 49, 'Uzbekistan': 50,
  'Qatar': 56, 'Iraq': 57, 'South Africa': 60, 'Saudi Arabia': 61, 'Jordan': 63,
  'Bosnia & Herz.': 64, 'Cabo Verde': 67, 'Ghana': 73, 'Curaçao': 82,
  'Haiti': 83, 'New Zealand': 85,
}

function safeParseJSON(val) {
  if (!val) return null
  if (Array.isArray(val)) return val
  if (typeof val === 'object') return val
  try { 
    const parsed = JSON.parse(val)
    return parsed
  } catch { return null }
}

function LiveMatchInfo({ match }) {
  const rawGoals = safeParseJSON(match.goal_times)
  const goalTimes = Array.isArray(rawGoals) ? rawGoals : []
  const prob = safeParseJSON(match.win_prob)

  return (
    <>
      {goalTimes.length > 0 && (
        <div style={{ marginTop: 14, padding: '0 4px' }}>
          {goalTimes.sort((a,b) => (a.min||0) - (b.min||0)).map((g, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', flexDirection: g.team === 'away' ? 'row-reverse' : 'row' }}>
              <span style={{ fontSize: 13 }}>⚽</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '2px 8px', fontWeight: 700, flexShrink: 0 }}>{g.min}'</span>
              {g.player && (
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.player}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {prob && (
        <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 700, letterSpacing: 2, textAlign: 'center', marginBottom: 10 }}>LIVE WIN PROBABILITY</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
            <div>
              <div style={{ color: '#C8102E', fontSize: 12, fontWeight: 800 }}>{match.home_team}</div>
              <div style={{ color: '#C8102E', fontSize: 20, fontWeight: 900 }}>{prob.home}%</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#A8A9AD', fontSize: 11, fontWeight: 700 }}>Draw</div>
              <div style={{ color: '#A8A9AD', fontSize: 18, fontWeight: 800 }}>{prob.draw}%</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#4a9eff', fontSize: 12, fontWeight: 800 }}>{match.away_team}</div>
              <div style={{ color: '#4a9eff', fontSize: 20, fontWeight: 900 }}>{prob.away}%</div>
            </div>
          </div>
          <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', gap: 2 }}>
            <div style={{ width: `${prob.home}%`, background: 'linear-gradient(90deg,#C8102E,#e8374a)', borderRadius: '4px 0 0 4px' }} />
            <div style={{ width: `${prob.draw}%`, background: 'rgba(168,169,173,0.3)' }} />
            <div style={{ width: `${prob.away}%`, background: 'linear-gradient(90deg,#1a6fd4,#4a9eff)', borderRadius: '0 4px 4px 0' }} />
          </div>
        </div>
      )}
    </>
  )
}

function parsePeriod(p) {
  if (!p) return null
  const m1 = p.match(/^(\d+):(\d+)'$/)
  if (m1) return { mins: parseInt(m1[1]), secs: parseInt(m1[2]), plus: false, baseMins: parseInt(m1[1]) }
  const m2 = p.match(/^(\d+)\+:(\d+)'$/)
  if (m2) return { mins: parseInt(m2[1]), secs: parseInt(m2[2]), plus: true, baseMins: parseInt(m2[1]) }
  // Handle old format without seconds e.g. "67'"
  const m3 = p.match(/^(\d+)'$/)
  if (m3) return { mins: parseInt(m3[1]), secs: 0, plus: false, baseMins: parseInt(m3[1]) }
  return null
}

function useLivePeriod(match) {
  const pad = (n) => String(n).padStart(2, '0')

  // Calculate current time purely from kickoff — most reliable approach
  // No dependency on stored match_period which can be stale
  function calcFromKickoff() {
    if (match.status !== 'live') return match.match_period
    if (match.match_period === 'HT') return 'HT'
    if (match.match_period === 'FT') return 'FT'

    const kickoff   = new Date(match.kickoff_time)
    const elapsedMs = Date.now() - kickoff.getTime()
    const elapsedS  = Math.floor(elapsedMs / 1000)

    // First half: 0–45 mins normal time, then stoppage shows seconds
    if (elapsedS < 45 * 60) {
      const mins = Math.floor(elapsedS / 60)
      return `${mins}'`
    }
    if (elapsedS < 47 * 60) {
      // Stoppage time in 1st half — show seconds
      const stoppageS = elapsedS - 45 * 60
      return `45+:${pad(stoppageS % 60)}'`
    }
    // Half time window: 47–62 mins elapsed (15 min break)
    if (elapsedS < 62 * 60) {
      return 'HT'
    }
    // Second half: offset by 62 mins (45 play + 17 break)
    const secondHalfS = elapsedS - 62 * 60
    const mins2       = 45 + Math.floor(secondHalfS / 60)
    if (mins2 < 90) return `${mins2}'`
    // Stoppage time — show seconds, cap at 90+10
    const extraS = secondHalfS - 45 * 60
    const extraMins = Math.floor(extraS / 60)
    if (extraMins > 10) return 'FT'
    return `90+${extraMins > 0 ? extraMins : ''}:${pad(extraS % 60)}'`
  }

  const [period, setPeriod] = useState(calcFromKickoff)

  useEffect(() => {
    if (match.status !== 'live') {
      setPeriod(match.match_period)
      return
    }
    if (match.match_period === 'HT' || match.match_period === 'FT') {
      setPeriod(match.match_period)
      return
    }

    // Tick every second, always calculating from kickoff time
    const interval = setInterval(() => {
      setPeriod(calcFromKickoff())
    }, 1000)

    // Set immediately
    setPeriod(calcFromKickoff())

    return () => clearInterval(interval)
  }, [match.kickoff_time, match.status, match.match_period]) // eslint-disable-line

  return period
}

function MatchCard({ match, prediction, onPredict }) {
  const livePeriod = useLivePeriod(match)
  const [homeG, setHomeG] = useState(prediction?.predictedHome ?? '')
  const [awayG, setAwayG] = useState(prediction?.predictedAway ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(!!prediction)
  const [error, setError]   = useState('')
  const [shake, setShake]   = useState(false)
  const [reaction, setReaction] = useState(null)

  const REACTIONS = [
    { emoji: '🔥', text: "Absolute banger prediction!" },
    { emoji: '💀', text: "Bold. Very bold." },
    { emoji: '🤡', text: "Mate... really?" },
    { emoji: '🧠', text: "Galaxy brain activated!" },
    { emoji: '😂', text: "Good luck with that one lol" },
    { emoji: '👀', text: "Interesting choice..." },
    { emoji: '🎯', text: "Feeling confident are we?" },
    { emoji: '🫡', text: "Locked and loaded!" },
    { emoji: '💰', text: "Put money on that did ya?" },
    { emoji: '🤔', text: "We'll see about that..." },
    { emoji: '😤', text: "No fear. Respect." },
    { emoji: '🐔', text: "Playing it safe I see..." },
  ]


  // Allow predictions anytime before kickoff+15 for group stage
  const kickoff  = match.kickoff_time ? new Date(match.kickoff_time) : new Date(Date.now() + 86400000)
  const now      = new Date()
  const kickoffPlus15 = new Date(kickoff.getTime() + 15 * 60 * 1000)
  const locked = match.status === 'live' || match.status === 'done' || now >= kickoffPlus15
  const isGroupStage = match.group_name && !match.group_name.includes('R')
  const isFuture = false // Group stage always open
  // Compare calendar dates (local) so same-day matches don't show "Tomorrow"
  const kickoffDate = new Date(kickoff.getFullYear(), kickoff.getMonth(), kickoff.getDate())
  const todayDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const daysUntil   = Math.round((kickoffDate - todayDate) / (1000 * 60 * 60 * 24))

  const winner = homeG !== '' && awayG !== ''
    ? +homeG > +awayG ? match.home_team : +homeG < +awayG ? match.away_team : 'Draw'
    : null

  async function handleSave() {
    if (homeG === '' || awayG === '') {
      setShake(true); setTimeout(() => setShake(false), 500); return
    }
    setSaving(true); setError('')
    try {
      const res  = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:    onPredict.userId,
          matchId:   match.id,
          homeGoals: +homeG,
          awayGoals: +awayG,
        }),
      })
      const data = await res.json()
      if (res.status === 409) {
        setSaved(true)
        return
      }
      if (!data.ok) throw new Error(data.error)
      setSaved(true)
      const r = REACTIONS[Math.floor(Math.random() * REACTIONS.length)]
      setReaction(r)
      setTimeout(() => setReaction(null), 2500)
      setTimeout(() => onPredict.refresh(), 800)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const dateStr = kickoff.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  const timeStr = kickoff.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })

  const cardBorder = match.status === 'done' ? 'rgba(201,168,76,0.3)'   // championship gold
    : match.status === 'live' ? 'rgba(200,16,46,0.4)'   // FIFA crimson
    : saved ? 'rgba(201,168,76,0.25)'                    // gold when locked in
    : 'rgba(255,255,255,0.08)'
  
  const cardGlow = match.status === 'done' ? '0 0 40px rgba(245,197,24,0.05), 0 8px 32px rgba(0,0,0,0.4)'
    : match.status === 'live' ? '0 0 40px rgba(255,74,74,0.05), 0 8px 32px rgba(0,0,0,0.4)'
    : '0 4px 24px rgba(0,0,0,0.3)'

  return (
    <div 
      className={`match-card ${shake ? 'shake' : ''} ${match.status === 'live' ? 'match-card-live' : match.status === 'done' ? 'match-card-done' : saved ? 'match-card-saved' : 'match-card-upcoming'}`}
      style={{
        background: 'linear-gradient(135deg, rgba(15,25,45,0.98), rgba(10,18,35,1))',
        border: `1px solid ${cardBorder}`,
        borderRadius: 20, padding: '20px 24px', marginBottom: 14,
        position: 'relative', overflow: 'hidden',
      }}>
      {/* Glow overlay */}
      {match.status === 'live' && (
        <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, background: 'radial-gradient(circle, rgba(200,16,46,0.08) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      )}
      {match.status === 'done' && (
        <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      )}
      {/* Match header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(74,158,255,0.15)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
            GROUP {match.group_name}
          </span>
          {match.status === 'live' && (
            <span className="pulsing" style={{ background: 'rgba(200,16,46,0.15)', color: '#C8102E', border: '1px solid rgba(200,16,46,0.4)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
              🔴 {livePeriod === 'HT' ? 'HALF TIME' : livePeriod ? `LIVE ${livePeriod}` : 'LIVE'}
            </span>
          )}
          {match.status === 'done' && (
            <span style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
              ✓ Final
            </span>
          )}
          {saved && match.status === 'upcoming' && (
            <span style={{ background: 'rgba(0,200,150,0.12)', color: '#00c896', border: '1px solid rgba(0,200,150,0.25)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
              🔒 Locked In
            </span>
          )}
          {!locked && !saved && daysUntil > 0 && (
            <span style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
              🗓️ {daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
            </span>
          )}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>{dateStr} · {timeStr}</span>
      </div>

      {/* Teams */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
        {/* Home */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 10, lineHeight: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>{match.home_flag}</div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{match.home_team}</div>
          {FIFA_RANKINGS[match.home_team] ? (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>
              FIFA #{FIFA_RANKINGS[match.home_team]}
            </div>
          ) : <div style={{ marginBottom: 4 }} />}
          {match.homePos ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: match.homePos.position <= 2 ? '#00c896' : 'rgba(255,255,255,0.35)' }}>
                Grp {match.homePos.group} · #{match.homePos.position} · {match.homePos.pts}pts
              </span>
              {match.homePos.qualified && (
                <span style={{ fontSize: 8, fontWeight: 800, color: '#00c896', background: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.4)', borderRadius: 6, padding: '1px 5px' }}>Q</span>
              )}
            </div>
          ) : <div style={{ marginBottom: 10 }} />}
          {(saved || locked) && homeG !== '' ? (
            <div style={{ width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 900, color: '#C9A84C', background: 'rgba(201,168,76,0.06)', borderRadius: 16, border: '2px solid rgba(201,168,76,0.2)' }}>
              {homeG}
            </div>
          ) : (
            <input
              type="number" min={0} max={20}
              value={homeG}
              onChange={e => { setHomeG(e.target.value); setSaved(false) }}
              disabled={locked || saved}
              placeholder="0"
              style={{
                width: 72, height: 72, textAlign: 'center', fontSize: 32, fontWeight: 800,
                background: 'rgba(255,255,255,0.08)',
                border: '2px solid rgba(201,168,76,0.3)',
                borderRadius: 16, boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)', color: '#C9A84C', outline: 'none',
              }}
            />
          )}
          {match.status === 'done' && match.home_goals != null && (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 6 }}>
              Actual: <strong style={{ color: '#fff' }}>{match.home_goals}</strong>
            </div>
          )}
        </div>

        {/* VS */}
        <div style={{ textAlign: 'center', minWidth: 60 }}>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, fontWeight: 600 }}>VS</div>
          {winner && !locked && !isFuture && (
            <div style={{ color: '#00c896', fontSize: 10, marginTop: 4, fontWeight: 700 }}>
              {winner === 'Draw' ? 'Draw 🤝' : `${winner} 🏆`}
            </div>
          )}
          {(match.status === 'done' || match.status === 'live') && match.home_goals != null && (
            <div className={match.status === 'live' ? 'score-live' : ''} style={{ color: match.status === 'live' ? '#C8102E' : '#C9A84C', fontSize: 42, fontWeight: 900, margin: '4px 0', letterSpacing: '-1px', textShadow: match.status === 'live' ? '0 0 25px rgba(200,16,46,0.5)' : '0 0 25px rgba(201,168,76,0.4)' }}>
              {match.home_goals}–{match.away_goals}
            </div>
          )}
          {match.status === 'live' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 6 }}>
              {match.match_period === 'HT' ? (
                <span style={{ background: 'rgba(255,165,0,0.15)', border: '1px solid rgba(255,165,0,0.4)', borderRadius: 20, padding: '3px 12px', color: '#FFA500', fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>⏸ HALF TIME</span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="pulsing" style={{ color: '#C8102E', fontSize: 11, fontWeight: 700 }}>●</span>
                  <span style={{ color: '#C8102E', fontSize: 13, fontWeight: 800, textShadow: '0 0 8px rgba(200,16,46,0.5)' }}>{livePeriod || 'LIVE'}</span>
                </div>
              )}
            </div>
          )}
          {match.status === 'done' && (
            <div style={{ marginTop: 6 }}>
              <span style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 20, padding: '3px 12px', color: '#C9A84C', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>✓ FULL TIME</span>
            </div>
          )}
        </div>

        {/* Away */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 10, lineHeight: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>{match.away_flag}</div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{match.away_team}</div>
          {FIFA_RANKINGS[match.away_team] ? (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>
              FIFA #{FIFA_RANKINGS[match.away_team]}
            </div>
          ) : <div style={{ marginBottom: 4 }} />}
          {match.awayPos ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: match.awayPos.position <= 2 ? '#00c896' : 'rgba(255,255,255,0.35)' }}>
                Grp {match.awayPos.group} · #{match.awayPos.position} · {match.awayPos.pts}pts
              </span>
              {match.awayPos.qualified && (
                <span style={{ fontSize: 8, fontWeight: 800, color: '#00c896', background: 'rgba(0,200,150,0.15)', border: '1px solid rgba(0,200,150,0.4)', borderRadius: 6, padding: '1px 5px' }}>Q</span>
              )}
            </div>
          ) : <div style={{ marginBottom: 10 }} />}
          {(saved || locked) && awayG !== '' ? (
            <div style={{ width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 900, color: '#C9A84C', background: 'rgba(201,168,76,0.06)', borderRadius: 16, border: '2px solid rgba(201,168,76,0.2)' }}>
              {awayG}
            </div>
          ) : (
            <input
              type="number" min={0} max={20}
              value={awayG}
              onChange={e => { setAwayG(e.target.value); setSaved(false) }}
              disabled={locked || saved}
              placeholder="0"
              style={{
                width: 72, height: 72, textAlign: 'center', fontSize: 32, fontWeight: 800,
                background: 'rgba(255,255,255,0.08)',
                border: '2px solid rgba(201,168,76,0.3)',
                borderRadius: 16, boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)', color: '#C9A84C', outline: 'none',
              }}
            />
          )}
          {match.status === 'done' && match.away_goals != null && (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 6 }}>
              Actual: <strong style={{ color: '#fff' }}>{match.away_goals}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Last 5 Form — shown for upcoming matches before prediction is locked */}
      {(() => {
        try {
          const homeForm = Array.isArray(match.form?.home) ? match.form.home : []
          const awayForm = Array.isArray(match.form?.away) ? match.form.away : []
          if (match.status !== 'upcoming' || saved || locked) return null
          if (!homeForm.length && !awayForm.length) return null
          return (
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[{ team: match.home_team, form: homeForm }, { team: match.away_team, form: awayForm }].map(({ team, form }) =>
                form.length ? (
                  <div key={team} style={{ textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>LAST 5</div>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      {form.slice(-5).map((r, i) => (
                        <span key={i} style={{
                          width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 800,
                          background: r === 'W' ? 'rgba(0,200,100,0.2)' : r === 'D' ? 'rgba(255,200,0,0.2)' : 'rgba(200,16,46,0.2)',
                          color:      r === 'W' ? '#00c864' : r === 'D' ? '#f5c518' : '#C8102E',
                          border: `1px solid ${r === 'W' ? 'rgba(0,200,100,0.4)' : r === 'D' ? 'rgba(255,200,0,0.4)' : 'rgba(200,16,46,0.4)'}`,
                        }}>{r}</span>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )
        } catch { return null }
      })()}

      {/* Goal times + Win probability */}
      {match.status === 'live' && <LiveMatchInfo match={match} />}

      {/* Divider */}
      {(match.status === 'done' || match.status === 'live') && (
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '16px 0' }}></div>
      )}

      {/* Points earned */}
      {match.status === 'done' && prediction && (
        <div style={{
          padding: '0', borderRadius: 10, textAlign: 'center', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {prediction.pointsEarned > 0
            ? (<><span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Your pick: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{prediction.predictedHome}–{prediction.predictedAway}</strong></span><span style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 20, padding: '4px 14px', color: '#C9A84C', fontSize: 13, fontWeight: 700 }}>{prediction.pointsEarned === 10 ? '🎯' : '✓'} +{prediction.pointsEarned} pts{prediction.pointsEarned === 10 ? ' — Perfect!' : ''}</span></>) 
            : (<><span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>Your pick: <strong style={{ color: 'rgba(255,255,255,0.5)' }}>{prediction.predictedHome}–{prediction.predictedAway}</strong></span><span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>0 pts 😅</span></>)
          }
        </div>
      )}



      {/* Save button — only on game day, not locked */}
      {!locked && !saved && !isFuture && (
        <>
          {error && <div style={{ color: '#ff4a4a', fontSize: 12, marginTop: 10, textAlign: 'center' }}>{error}</div>}
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', marginTop: 18, padding: 14,
            background: 'linear-gradient(135deg, #C9A84C, #a8832a)',
            border: 'none', borderRadius: 12, color: '#0a0f1e',
            fontSize: 15, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1, transition: 'all 0.2s',
            boxShadow: '0 4px 20px rgba(201,168,76,0.4)',
          }}>
            {saving ? 'Saving...' : 'Lock In Prediction 🔒'}
          </button>
        </>
      )}
      {locked && match.status === 'live' && (
        <div style={{ textAlign: 'center', marginTop: 12, color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
          🔴 Match in progress — predictions locked
        </div>
      )}

      {/* Reaction popup */}
      {reaction && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 999,
          background: 'rgba(10,15,30,0.95)',
          border: '1px solid rgba(245,197,24,0.4)',
          borderRadius: 20, padding: '28px 36px',
          textAlign: 'center',
          animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          boxShadow: '0 0 60px rgba(245,197,24,0.15)',
        }}>
          <div style={{ fontSize: 56, marginBottom: 10 }}>{reaction.emoji}</div>
          <div style={{ color: '#f5c518', fontWeight: 700, fontSize: 18 }}>{reaction.text}</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 6 }}>Prediction locked 🔒</div>
        </div>
      )}
    </div>
  )
}

export default function MatchPredictor({ matches, user, leaderboard, onPredicted, formData = {} }) {
  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date()
    return today.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  })
  const dateScrollRef   = useRef(null)
  const activeDateRef   = useRef(null)

  // Auto-scroll date tabs so today is visible on mount
  useEffect(() => {
    if (activeDateRef.current && dateScrollRef.current) {
      const container = dateScrollRef.current
      const el        = activeDateRef.current
      const offset    = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2
      container.scrollTo({ left: offset, behavior: 'smooth' })
    }
  }, [])

  // Auto-switch to 'All' if no matches on today's date  
  const todayStr = new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })

  const myData    = leaderboard.find(p => p.id === user.id)
  const myPredMap = {}
  if (myData?.predictions) {
    myData.predictions.forEach(p => { myPredMap[p.matchId] = p })
  }

  // Group stage standings — used to show position/qualified badge beside team names
  const { teamPosition } = calcStandings(matches)

  const dates    = ['All', ...new Set(
    matches.filter(m => m.kickoff_time && m.kickoff_time).map(m => new Date(m.kickoff_time).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }))
  )]
  const statusOrder = { live: 0, upcoming: 1, done: 2 }
  const filtered = (filterDate === 'All'
    ? matches
    : matches.filter(m => m.kickoff_time &&
        new Date(m.kickoff_time).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) === filterDate
      )
  ).slice().sort((a, b) => {
    const so = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1)
    if (so !== 0) return so
    return new Date(a.kickoff_time) - new Date(b.kickoff_time)
  })

  const predCount  = Object.keys(myPredMap).length
  const totalCount = matches.filter(m => m.kickoff_time && m.status === 'upcoming').length

  // Count today's matches available for prediction
  const now = new Date()
  const todayMatches = matches.filter(m => {
    if (!m.kickoff_time) return false
    const k = new Date(m.kickoff_time)
    return k.getFullYear() === now.getFullYear() &&
           k.getMonth()    === now.getMonth() &&
           k.getDate()     === now.getDate() &&
           m.status === 'upcoming'
  })

  return (
    <div>
      {/* Points key */}
      <div style={{
        background: 'rgba(245,197,24,0.06)', border: '1px solid rgba(245,197,24,0.15)',
        borderRadius: 14, padding: '12px 18px', marginBottom: 16,
        display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}><span style={{ color: '#f5c518', fontWeight: 700 }}>3 pts</span> · Correct result</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}><span style={{ color: '#f5c518', fontWeight: 700 }}>+7 pts</span> · Exact score</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}><span style={{ color: '#00c896', fontWeight: 700 }}>10 pts</span> · Perfect!</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{predCount} / {totalCount + predCount} predicted</span>
      </div>

      {/* Today's matches banner */}
      {todayMatches.length > 0 && (
        <div style={{ background: 'rgba(0,200,80,0.08)', border: '1px solid rgba(0,200,80,0.2)', borderRadius: 12, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>⚽</span>
          <span style={{ color: '#00c896', fontSize: 13, fontWeight: 600 }}>
            {todayMatches.length} match{todayMatches.length > 1 ? 'es' : ''} today — predictions are open!
          </span>
        </div>
      )}

      {/* Date filter */}
<div ref={dateScrollRef} style={{
  display: 'flex', gap: 8, marginBottom: 20,
  overflowX: 'auto', paddingBottom: 6,
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
}}>
  {dates.map(d => (
    <button
      key={d}
      ref={d === filterDate ? activeDateRef : null}
      onClick={() => setFilterDate(d)}
      style={{
        padding: '6px 14px', borderRadius: 20,
        flexShrink: 0, whiteSpace: 'nowrap',
        background: filterDate === d ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.04)',
        border: filterDate === d ? '1px solid rgba(245,197,24,0.4)' : '1px solid rgba(255,255,255,0.08)',
        color: filterDate === d ? '#f5c518' : 'rgba(255,255,255,0.4)',
        fontSize: 12, cursor: 'pointer', fontWeight: filterDate === d ? 700 : 400, transition: 'all 0.15s',
      }}>{d}</button>
  ))}
</div>

      {filtered.map(match => (
        <MatchCard
          key={match.id}
          match={{
            ...match,
            form: {
              home: formData[match.home_team] || [],
              away: formData[match.away_team] || [],
            },
            homePos: teamPosition[match.home_team],
            awayPos: teamPosition[match.away_team],
          }}
          prediction={myPredMap[match.id]}
          onPredict={{ userId: user.id, refresh: onPredicted }}
        />
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 0' }}>No matches on this date</div>
      )}
    </div>
  )
}
