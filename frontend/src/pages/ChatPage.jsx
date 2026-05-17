import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Send, Plus, MessageSquare, Trash2, Zap } from 'lucide-react'
import Layout from '../components/Layout'
import KipMarkdown from '../components/KipMarkdown'
import api from '../lib/api'
import toast from 'react-hot-toast'

export default function ChatPage() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState([])
  const [activeConv,    setActiveConv]    = useState(null)
  const [messages,      setMessages]      = useState([])
  const [input,         setInput]         = useState('')
  const [sending,       setSending]       = useState(false)
  const [loadingConvs,  setLoadingConvs]  = useState(true)
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)
  const [showConvList,  setShowConvList]  = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    api.get('/chat/conversations')
      .then(r => setConversations(r.data || []))
      .catch(() => {})
      .finally(() => setLoadingConvs(false))
  }, [])

  useEffect(() => {
    if (!id) { setActiveConv(null); setMessages([]); return }
    setLoadingMsgs(true)
    api.get(`/chat/conversations/${id}`)
      .then(r => { setActiveConv(r.data); setMessages(r.data.messages || []) })
      .catch(() => toast.error('Could not load conversation.'))
      .finally(() => setLoadingMsgs(false))
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // Watch input changes to dynamically adjust textarea height safely (Fixes Suggestion click bug)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  const startNew = () => {
    navigate('/chat')
    setActiveConv(null)
    setMessages([])
    setShowConvList(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const openConv = (conv) => {
    navigate(`/chat/${conv.id}`)
    setShowConvList(false)
  }

  const deleteConv = async (e, convId) => {
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return
    try {
      await api.delete(`/chat/conversations/${convId}`)
      setConversations(prev => prev.filter(c => c.id !== convId))
      if (parseInt(id) === convId) { navigate('/chat'); setMessages([]) }
      toast.success('Deleted.')
    } catch { toast.error('Could not delete.') }
  }
// ask
  const send = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)
    const optimistic = { id: Date.now(), role: 'user', content: text, _temp: true }
    setMessages(prev => [...prev, optimistic])

    try {
      const { data } = await api.post('/chat/send', {
        message:         text,
        conversation_id: activeConv?.id || null,
      })
      if (!activeConv) {
        navigate(`/chat/${data.conversation_id}`)
        api.get('/chat/conversations').then(r => setConversations(r.data || []))
      } else {
        setConversations(prev =>
          prev.map(c => c.id === activeConv.id ? { ...c, updated_at: new Date().toISOString() } : c)
              .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        )
      }
      setMessages(prev => [
        ...prev.filter(m => !m._temp),
        { id: Date.now() + 1, role: 'assistant', content: data.reply },
      ])
      if (data.idea_saved) toast.success('Business idea saved!', { icon: '💡', duration: 4000 })
    } catch {
      setMessages(prev => prev.filter(m => !m._temp))
      toast.error('Send failed.')
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const SUGGESTIONS = [
    "I have K5,000. What business can I start in Lusaka?",
    "I have K20,000 in Kitwe Riverside. Any ideas?",
    "Best business for K50,000 with no skills in Ndola?",
    "What suits a teacher with K10,000 in Chipata?",
  ]

  /* ── Conversation list ─────────────────────── */
  const ConvList = ({ mobile = false }) => (
    <div style={{
      width: mobile ? '100%' : 252,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRight: mobile ? 'none' : '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(255,255,255,0.015)',
      height: mobile ? 'auto' : '100%',
      maxHeight: mobile ? '72vh' : 'none',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: '#fff' }}>Conversations</span>
        <button onClick={startNew} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, background: 'rgba(43,127,255,0.15)', border: '1px solid rgba(43,127,255,0.3)', color: 'var(--blue-bright)', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 700, fontSize: 12 }}>
          <Plus size={13} /> New
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {loadingConvs ? (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(43,127,255,0.3)', borderTopColor: 'var(--blue)', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center' }}>
            <MessageSquare size={26} style={{ color: 'var(--faint)', margin: '0 auto 8px', display: 'block' }} />
            <p style={{ fontSize: 12, color: 'var(--faint)', margin: 0 }}>No conversations yet</p>
          </div>
        ) : conversations.map(conv => {
          const active = conv.id === parseInt(id)
          return (
            <div key={conv.id} onClick={() => openConv(conv)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 10px', borderRadius: 9, marginBottom: 2,
              cursor: 'pointer', position: 'relative',
              background: active ? 'rgba(43,127,255,0.15)' : 'transparent',
              border: `1px solid ${active ? 'rgba(43,127,255,0.3)' : 'transparent'}`,
              transition: 'all 0.15s ease',
            }}>
              <MessageSquare size={13} style={{ color: active ? 'var(--blue-bright)' : 'var(--faint)', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12.5, color: active ? '#fff' : 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: active ? 600 : 400 }}>
                {conv.title || 'New conversation'}
              </span>
              <button onClick={e => deleteConv(e, conv.id)} style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                <Trash2 size={11} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <Layout>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

        {/* Desktop sidebar */}
        <div className="kip-conv-sidebar" style={{ display: 'none' }}>
          <ConvList />
        </div>

        {/* Mobile bottom sheet */}
        {showConvList && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(4,12,24,0.85)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
            onClick={() => setShowConvList(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <ConvList mobile />
              <div style={{ padding: '10px 14px' }}>
                <button onClick={() => setShowConvList(false)} style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600, fontSize: 14 }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Chat area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
            <button onClick={() => setShowConvList(true)} className="kip-mobile-only"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'Syne', fontWeight: 600 }}>
              <MessageSquare size={13} />
              {conversations.length > 0 ? conversations.length : 'History'}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                {activeConv?.title || 'New Conversation'}
              </h1>
            </div>
            <button onClick={startNew} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, background: 'rgba(43,127,255,0.12)', border: '1px solid rgba(43,127,255,0.25)', color: 'var(--blue-bright)', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
              <Plus size={13} /> New
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
            {loadingMsgs ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(43,127,255,0.2)', borderTopColor: 'var(--blue)', animation: 'spinSlow 0.8s linear infinite' }} />
              </div>
            ) : messages.length === 0 ? (
              <div className="animate-fade-in" style={{ padding: '20px 16px', maxWidth: 560, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 22 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,var(--blue),var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: 'var(--glow-blue)' }}>
                    <Zap size={24} color="#fff" />
                  </div>
                  <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: '#fff', marginBottom: 6 }}>Sorry, KIP is currently offline</h2>
                  <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>Tell me your capital, location, and skills — I'll find the right business for you.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => setInput(s)}
                      className="chip animate-slide-up" style={{ animationDelay: `${i*60}ms`, textAlign: 'left', fontSize: 12 }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {messages.map((msg) => (
                  <div key={msg.id || Math.random()}>
                    {msg.role === 'user' ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 14px' }}>
                        <div className="bubble-user" style={{ maxWidth: 'min(80%, 520px)', wordBreak: 'break-word' }}>
                          <p style={{ fontSize: 14, color: '#fff', margin: 0, lineHeight: 1.6 }}>{msg.content}</p>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        width: '100%',
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: 'rgba(255,255,255,0.018)',
                      }}>
                        <div style={{ maxWidth: 860, margin: '0 auto', padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 9, flexShrink: 0, background: 'linear-gradient(135deg,var(--blue),var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                            <Zap size={14} color="#fff" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                            <KipMarkdown content={msg.content} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing status */}
                {sending && (
                  <div style={{ width: '100%', background: 'rgba(255,255,255,0.018)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ maxWidth: 860, margin: '0 auto', padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 9, flexShrink: 0, background: 'linear-gradient(135deg,var(--blue),var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Zap size={14} color="#fff" />
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, paddingTop: 6 }}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--blue-bright)', opacity: 0.7, animation: `pulse 1.4s ${i*0.2}s ease-in-out infinite` }} />
                        ))}
                        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6, fontStyle: 'italic' }}>KIP is thinking…</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(8,11,16,0.9)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, maxWidth: 860, margin: '0 auto' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ask KIP for a business idea…"
                rows={1}
                className="kip-input"
                style={{ flex: 1, resize: 'none', overflow: 'hidden', fontSize: 14, lineHeight: 1.5, minHeight: 48, maxHeight: 120 }}
                disabled={sending}
              />
              <button onClick={send} disabled={!input.trim() || sending}
                className="kip-btn kip-btn-primary"
                style={{ padding: '0 16px', borderRadius: 12, minWidth: 48, minHeight: 48, flexShrink: 0 }}>
                <Send size={17} />
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @media (min-width: 768px) {
            .kip-conv-sidebar { display: flex !important; }
            .kip-mobile-only  { display: none !important; }
          }
        `}</style>
      </div>
    </Layout>
  )
}