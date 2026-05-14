import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, TrendingUp, Plus, MessageSquare, Square, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import KipMarkdown from '../components/KipMarkdown'
import { useAuth } from '../hooks/useAuth'
import api from '../lib/api'

const CHIPS = [
  "I have K3,000. What business can I start in Riverside, Kitwe?",
  "What business suits K10,000 in Lusaka?",
  "I have K500 and live near Chipata",
  "I'm a teacher with K8,000 — what business fits me?",
]

/* ── Message ─────────────────────────────────────────── */
function Message({ msg, userInitial }) {
  const isUser = msg.role === 'user'
  const time   = msg.created_at
    ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''

  if (isUser) return (
    <div className="flex justify-end items-end gap-2.5 animate-slide-up">
      <div style={{ maxWidth: '74%' }}>
        <div className="bubble-user">
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#fff', margin: 0 }}>{msg.content}</p>
        </div>
        {time && <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--faint)', marginTop: 4, paddingRight: 4 }}>{time}</div>}
      </div>
      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        background: 'linear-gradient(135deg, var(--blue), var(--mid))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, fontFamily: 'Syne', color: '#fff',
        boxShadow: '0 2px 8px rgba(27,110,243,0.3)',
      }}>
        {userInitial}
      </div>
    </div>
  )

  return (
    <div className="flex justify-start items-end gap-2.5 animate-slide-up">
      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        background: 'linear-gradient(135deg, #1B6EF3, #00D4B1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} className="animate-logo-glow">
        <TrendingUp size={14} color="#fff" />
      </div>
      <div style={{ maxWidth: '80%' }}>
        <div className="bubble-kip">
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
            paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            <Sparkles size={11} style={{ color: 'var(--blue-bright)' }} />
            <span style={{ fontFamily: 'Syne', fontSize: 10, fontWeight: 700, color: 'var(--blue-bright)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              KIP
            </span>
          </div>
          <KipMarkdown content={msg.content} />
        </div>
        {time && <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 4, paddingLeft: 4 }}>{time}</div>}
      </div>
    </div>
  )
}

/* ── Typing indicator ────────────────────────────────── */
function TypingBubble({ onStop }) {
  return (
    <div className="flex justify-start items-end gap-2.5 animate-fade-in">
      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        background: 'linear-gradient(135deg, #1B6EF3, #00D4B1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} className="animate-logo-glow">
        <TrendingUp size={14} color="#fff" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="bubble-kip" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--blue-bright)',
                opacity: 0.7,
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6, fontStyle: 'italic' }}>
              KIP is thinking…
            </span>
          </div>
        </div>
        <button
          onClick={onStop}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600, fontFamily: 'Syne',
            color: 'var(--red)', padding: '8px 12px', borderRadius: 9,
            background: 'rgba(255,83,112,0.1)', border: '1px solid rgba(255,83,112,0.25)',
            cursor: 'pointer', transition: 'all 0.2s ease', flexShrink: 0,
          }}
          className="animate-scale-in"
        >
          <Square size={11} fill="currentColor" /> Stop
        </button>
      </div>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────── */
export default function ChatPage() {
  const { id }    = useParams()
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [messages,  setMessages]  = useState([])
  const [convId,    setConvId]    = useState(id ? parseInt(id) : null)
  const [convList,  setConvList]  = useState([])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [typing,    setTyping]    = useState(false)
  const abortRef  = useRef(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const userInitial = user?.full_name?.[0]?.toUpperCase() || 'U'

  const loadConvList = useCallback(() => {
    api.get('/chat/conversations')
      .then(r => setConvList(
        (r.data || []).sort((a,b) => new Date(b.updated_at||b.created_at) - new Date(a.updated_at||a.created_at))
      )).catch(() => {})
  }, [])

  useEffect(() => { loadConvList() }, [loadConvList])
  useEffect(() => {
    if (convId) api.get(`/chat/conversations/${convId}`).then(r => setMessages(r.data.messages || [])).catch(() => {})
  }, [convId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typing])

  const stopResponse = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null }
    setLoading(false); setTyping(false)
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (last?.role === 'user' && last?._pending) return prev.slice(0, -1)
      return prev
    })
    toast('Response stopped.', { icon: '⏹' })
  }

  const send = async () => {
    if (!input.trim() || loading) return
    const text = input.trim(); setInput(''); setLoading(true); setTyping(true)
    setMessages(prev => [...prev, {
      role: 'user', content: text, _pending: true,
      _initial: userInitial, created_at: new Date().toISOString()
    }])
    const ctrl = new AbortController(); abortRef.current = ctrl
    try {
      const { data } = await api.post('/chat/send', { message: text, conversation_id: convId }, { signal: ctrl.signal })
      if (!convId) { setConvId(data.conversation_id); navigate(`/chat/${data.conversation_id}`, { replace: true }); loadConvList() }
      setMessages(prev => [
        ...prev.slice(0, -1),
        { ...prev[prev.length-1], _pending: false },
        { role: 'assistant', content: data.reply, created_at: new Date().toISOString() }
      ])
      loadConvList()
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return
      toast.error('Message failed. Try again.')
      setMessages(prev => prev.filter(m => !m._pending))
    } finally { setLoading(false); setTyping(false); abortRef.current = null; inputRef.current?.focus() }
  }

  const newChat = () => { setConvId(null); setMessages([]); navigate('/chat') }

  return (
    <Layout>
      <div className="flex" style={{ height: 'calc(100vh - 56px)', position: 'relative', zIndex: 1 }}>

        {/* ── Conv list ── */}
        <div className="hidden md:flex flex-col flex-shrink-0" style={{
          width: 200, borderRight: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(8,15,30,0.6)', backdropFilter: 'blur(20px)',
        }}>
          <div style={{ padding: '12px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={newChat} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              fontSize: 12, fontWeight: 600, fontFamily: 'Syne',
              color: 'var(--blue-bright)', padding: '9px 0',
              background: 'rgba(27,110,243,0.08)', border: '1px solid rgba(27,110,243,0.25)',
              borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s ease',
            }}>
              <Plus size={13} /> New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ padding: '8px' }}>
            {convList.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--faint)', textAlign: 'center', padding: '16px 8px' }}>No conversations yet</p>
            )}
            {convList.map(c => (
              <button key={c.id}
                onClick={() => { setConvId(c.id); navigate(`/chat/${c.id}`) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 10px', borderRadius: 9, textAlign: 'left', cursor: 'pointer',
                  background: c.id === convId ? 'rgba(27,110,243,0.15)' : 'transparent',
                  border: `1px solid ${c.id === convId ? 'rgba(27,110,243,0.3)' : 'transparent'}`,
                  color: c.id === convId ? 'var(--text)' : 'var(--muted)',
                  fontSize: 12, transition: 'all 0.2s ease', marginBottom: 2,
                }}>
                <MessageSquare size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Chat area ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(8,15,30,0.7)', backdropFilter: 'blur(20px)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 11,
                background: 'linear-gradient(135deg, #1B6EF3, #00D4B1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px rgba(27,110,243,0.4)',
              }}>
                <TrendingUp size={16} color="#fff" />
              </div>
              <div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: '#fff' }}>KIP — Business Advisor</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--teal)' }}>
                  <span className="live-dot" style={{ width: 6, height: 6 }} />
                  Online · AI-powered
                </div>
              </div>
            </div>
            <button onClick={newChat} className="md:hidden" style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
              <Plus size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px 20px' }}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
                <div style={{
                  width: 72, height: 72, borderRadius: 22,
                  background: 'linear-gradient(135deg, rgba(27,110,243,0.2), rgba(0,212,177,0.15))',
                  border: '1px solid rgba(27,110,243,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20,
                }} className="animate-float">
                  <TrendingUp size={32} style={{ color: 'var(--blue-bright)' }} />
                </div>
                <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 8 }}>
                  Hello, {user?.full_name?.split(' ')[0]}!
                </h2>
                <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 280, lineHeight: 1.7, marginBottom: 28 }}>
                  Tell me your capital, location, and any skills — I'll find the right business for you.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, width: '100%', maxWidth: 440 }}>
                  {CHIPS.map(chip => (
                    <button key={chip} onClick={() => setInput(chip)} className="chip">{chip}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 760, margin: '0 auto' }} className="space-y-5">
                {messages.map((msg, i) => (
                  <Message key={i} msg={msg} userInitial={userInitial} />
                ))}
                {typing && <TypingBubble onStop={stopResponse} />}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{
            padding: '12px 20px 16px', flexShrink: 0,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(8,15,30,0.8)', backdropFilter: 'blur(20px)',
          }}>
            <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder="Tell KIP your capital, location, and skills…"
                  className="kip-input"
                  style={{ resize: 'none', minHeight: 48, maxHeight: 130 }}
                />
              </div>
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="kip-btn kip-btn-primary"
                style={{ padding: '0 18px', flexShrink: 0, borderRadius: 12, minHeight: 48 }}
              >
                <Send size={17} />
              </button>
            </div>
            <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--faint)', marginTop: 8 }}>
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
