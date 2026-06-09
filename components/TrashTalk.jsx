'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const REACTIONS = ['🔥', '😂', '💀', '🎯', '👀', '🤡']

export default function TrashTalk({ user }) {
  const [messages, setMessages] = useState([])
  const [content, setContent]   = useState('')
  const [sending, setSending]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const bottomRef = useRef(null)

  // Fetch initial messages
  useEffect(() => {
    fetch('/api/messages')
      .then(r => r.json())
      .then(data => { if (data.ok) setMessages(data.messages) })
      .finally(() => setLoading(false))
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages'
      }, payload => {
        // Fetch the full message with user join
        fetch('/api/messages')
          .then(r => r.json())
          .then(data => { if (data.ok) setMessages(data.messages) })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function handleSend() {
    if (!content.trim() || sending) return
    setSending(true)
    try {
      const res  = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, content }),
      })
      const data = await res.json()
      if (data.ok) {
        setContent('')
        // Scroll to bottom
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    } finally {
      setSending(false)
    }
  }

  function addReaction(r) { setContent(prev => prev + r) }

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1)  return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 20 }}>💬 Trash Talk Wall</h2>

      {/* Compose */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: 16, marginBottom: 20,
      }}>
        {/* Quick reactions */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {REACTIONS.map(r => (
            <button key={r} onClick={() => addReaction(r)} style={{
              fontSize: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '4px 8px', cursor: 'pointer', transition: 'all 0.15s',
            }}>{r}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ fontSize: 24 }}>{user.avatar}</div>
          <input
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Say something cheeky... 😏"
            maxLength={200}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '10px 14px', color: '#fff',
              fontSize: 14, outline: 'none',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!content.trim() || sending}
            style={{
              background: content.trim() ? 'linear-gradient(135deg,#f5c518,#e6a800)' : 'rgba(255,255,255,0.06)',
              border: 'none', borderRadius: 10, padding: '10px 16px',
              color: content.trim() ? '#0a0f1e' : 'rgba(255,255,255,0.3)',
              fontWeight: 700, fontSize: 14, cursor: content.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 8, textAlign: 'right' }}>
          {content.length}/200
        </div>
      </div>

      {/* Messages */}
      {loading ? (
        <div className="pulsing" style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : messages.length === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px 0' }}>
          Be the first to talk trash 😂
        </div>
      ) : (
        messages.map(msg => (
          <div key={msg.id} className="fade-in" style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            background: msg.user?.id === user.id ? 'rgba(245,197,24,0.05)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${msg.user?.id === user.id ? 'rgba(245,197,24,0.15)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 12, padding: '12px 16px', marginBottom: 10,
          }}>
            <div style={{ fontSize: 26, flexShrink: 0 }}>{msg.user?.avatar || '👤'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#f5c518', fontWeight: 700, fontSize: 13 }}>
                  {msg.user?.name || 'Unknown'}
                  {msg.user?.id === user.id && <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, fontSize: 11, marginLeft: 6 }}>(you)</span>}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>{timeAgo(msg.created_at)}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.5 }}>{msg.content}</div>
            </div>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  )
}
