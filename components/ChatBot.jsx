'use client'
import { useState, useRef, useEffect } from 'react'

export default function ChatBot() {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hey! Ask me anything about matches, standings, or the leaderboard ⚽" }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: text }])
    setLoading(true)

    try {
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })
      const data = await res.json()

      if (!data.ok) {
        if (res.status === 503) setEnabled(false)
        setMessages(m => [...m, { role: 'assistant', content: "Sorry, I'm not available right now." }])
      } else {
        setMessages(m => [...m, { role: 'assistant', content: data.reply }])
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "Something went wrong — try again?" }])
    }
    setLoading(false)
  }

  if (!enabled) return null

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed', bottom: 84, right: 16, zIndex: 998,
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #C9A84C, #a8832a)',
            border: 'none', boxShadow: '0 4px 16px rgba(201,168,76,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, cursor: 'pointer',
          }}
          aria-label="Open stats chatbot"
        >
          💬
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 0, right: 0, left: 0, top: 0,
          zIndex: 999, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setOpen(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480, height: '70vh', maxHeight: 600,
              background: '#0f1628', borderRadius: '20px 20px 0 0',
              border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                💬 Stats Bot
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.6)', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 12,
                }}>
                  <div style={{
                    maxWidth: '80%', padding: '10px 14px', borderRadius: 14,
                    background: m.role === 'user' ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.06)',
                    border: m.role === 'user' ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    color: '#fff', fontSize: 13, lineHeight: 1.5,
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                  <div style={{ padding: '10px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about matches, standings..."
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
                  color: '#fff', fontSize: 14, outline: 'none',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                style={{
                  padding: '10px 18px', borderRadius: 12, border: 'none',
                  background: loading || !input.trim() ? 'rgba(201,168,76,0.3)' : 'linear-gradient(135deg,#C9A84C,#a8832a)',
                  color: '#0a0f1e', fontWeight: 700, fontSize: 14, cursor: loading || !input.trim() ? 'default' : 'pointer',
                }}
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
