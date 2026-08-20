/**
 * StartupChatPage.jsx
 * ────────────────────
 * KIP Startup Advisor — a dedicated AI chat for business registration questions.
 *
 * Key differences from the main ChatPage (/chat):
 *  - Separate conversation history stored under /startup-chat/* endpoints
 *  - Every conversation is pre-seeded with the step context that opened it
 *    (step title, authority, requirements, costs, tips)
 *  - The system context tells K-BIG-1 to act as a startup registration advisor
 *  - URL: /startup/chat  (or /startup/chat/:conversationId)
 *  - A "← Back to Startup Guide" header link returns to /startup
 *
 * Route: /startup/chat          — new conversation (generic)
 *        /startup/chat/:stepId  — conversation pre-seeded with a step's context
 *
 * Protected — requires login (same Protected wrapper as all other KIP pages).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  Send, Plus, Trash2, ArrowLeft, MessageSquare,
  Rocket, Zap, ChevronRight, X, AlertCircle,
} from 'lucide-react'
import Layout from '../components/Layout'
import KipMarkdown from '../components/KipMarkdown'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { useT } from '../context/TranslationContext'

// ─── SYSTEM PROMPT SENT TO K-BIG-1 ───────────────────────────────────────────
// This is injected as the first "user" message to frame the assistant's role.
// The backend /startup-chat/send endpoint appends this before the history.

function buildSystemContext(stepContext) {
  const base = `You are KIP's Startup Registration Advisor — a specialist in Zambian business law, company registration, and regulatory compliance. You have deep knowledge of PACRA, ZRA, NAPSA, NHIMA, WCFCB, ZDA, NCC, the Bank of Zambia, and all other Zambian regulatory bodies. You give precise, practical, actionable guidance to founders registering businesses in Zambia. Always quote current fees and timelines where you know them. When you don't know something, say so clearly and direct the founder to the official body.`

  if (!stepContext) return base

  return `${base}

The founder is currently working through this specific registration step:

STEP: ${stepContext.title}
AUTHORITY: ${stepContext.authorityName || 'N/A'}
SUMMARY: ${stepContext.summary || ''}
WHAT THEY RECEIVE: ${stepContext.what_you_get || 'N/A'}
DOCUMENTS REQUIRED: ${(stepContext.requirements || []).slice(0, 6).join('; ')}
ESTIMATED COSTS: ${(stepContext.costs || []).map(c => `${c.item}: ${c.amount}`).join('; ')}
TIMELINE: ${stepContext.timeline || 'N/A'}
OFFICIAL PORTAL: ${stepContext.portal || 'N/A'}

Answer their questions specifically about this step. You may also help with related steps in the registration journey.`
}

// ─── SUGGESTION CHIPS — context-aware ────────────────────────────────────────

function suggestionsForStep(stepContext, t) {
  if (!stepContext) {
    return [
      t('startup_chat.suggestion_default_1'),
      t('startup_chat.suggestion_default_2'),
      t('startup_chat.suggestion_default_3'),
      t('startup_chat.suggestion_default_4'),
    ]
  }
  const title = stepContext.title || ''
  if (title.includes('PACRA')) return [
    t('startup_chat.suggestion_pacra_1'),
    t('startup_chat.suggestion_pacra_2'),
    t('startup_chat.suggestion_pacra_3'),
    t('startup_chat.suggestion_pacra_4'),
  ]
  if (title.includes('ZRA') || title.includes('Tax')) return [
    t('startup_chat.suggestion_zra_1'),
    t('startup_chat.suggestion_zra_2'),
    t('startup_chat.suggestion_zra_3'),
    t('startup_chat.suggestion_zra_4'),
  ]
  if (title.includes('NAPSA')) return [
    t('startup_chat.suggestion_napsa_1'),
    t('startup_chat.suggestion_napsa_2'),
    t('startup_chat.suggestion_napsa_3'),
    t('startup_chat.suggestion_napsa_4'),
  ]
  if (title.includes('NHIMA')) return [
    t('startup_chat.suggestion_nhima_1'),
    t('startup_chat.suggestion_nhima_2'),
    t('startup_chat.suggestion_nhima_3'),
    t('startup_chat.suggestion_nhima_4'),
  ]
  if (title.includes('NCC')) return [
    t('startup_chat.suggestion_ncc_1'),
    t('startup_chat.suggestion_ncc_2'),
    t('startup_chat.suggestion_ncc_3'),
    t('startup_chat.suggestion_ncc_4'),
  ]
  if (title.includes('Bank Account')) return [
    t('startup_chat.suggestion_bank_1'),
    t('startup_chat.suggestion_bank_2'),
    t('startup_chat.suggestion_bank_3'),
    t('startup_chat.suggestion_bank_4'),
  ]
  if (title.includes('Trading Licence') || title.includes('Local Council')) return [
    t('startup_chat.suggestion_trading_licence_1'),
    t('startup_chat.suggestion_trading_licence_2'),
    t('startup_chat.suggestion_trading_licence_3'),
    t('startup_chat.suggestion_trading_licence_4'),
  ]
  return [
    t('startup_chat.suggestion_fallback_1', { title: stepContext.title }),
    t('startup_chat.suggestion_fallback_2'),
    t('startup_chat.suggestion_fallback_3'),
    t('startup_chat.suggestion_fallback_4'),
  ]
}

// ─── CONVERSATION LIST PANEL ──────────────────────────────────────────────────

function ConvList({ conversations, activeId, onSelect, onNew, onDelete, loading, mobile, onClose }) {
  const { t } = useT()
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: mobile ? '100%' : 240, flexShrink: 0,
      borderRight: mobile ? 'none' : '1px solid var(--border)',
      background: 'rgba(255,255,255,0.015)',
      height: mobile ? 'auto' : '100%',
      maxHeight: mobile ? '72vh' : 'none',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
          {t('startup_chat.conversations_header')}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onNew} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
            borderRadius: 8, background: 'rgba(43,127,255,0.15)',
            border: '1px solid rgba(43,127,255,0.3)', color: 'var(--blue-bright)',
            cursor: 'pointer', fontFamily: 'Syne', fontWeight: 700, fontSize: 11,
          }}>
            <Plus size={12} /> {t('startup_chat.new_button')}
          </button>
          {mobile && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(43,127,255,0.3)', borderTopColor: 'var(--blue)', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center' }}>
            <Rocket size={24} style={{ color: 'var(--faint)', margin: '0 auto 8px', display: 'block' }} />
            <p style={{ fontSize: 11, color: 'var(--faint)', margin: 0 }}>{t('startup_chat.no_conversations')}</p>
          </div>
        ) : conversations.map(conv => {
          const active = conv.id === activeId
          return (
            <div key={conv.id} onClick={() => onSelect(conv)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 10px', borderRadius: 9, marginBottom: 2,
              cursor: 'pointer', position: 'relative',
              background: active ? 'rgba(43,127,255,0.15)' : 'transparent',
              border: `1px solid ${active ? 'rgba(43,127,255,0.3)' : 'transparent'}`,
              transition: 'all 0.15s ease',
            }}>
              {/* Step emoji or generic icon */}
              <span style={{ fontSize: 14, flexShrink: 0 }}>
                {conv.step_emoji || '🚀'}
              </span>
              <span style={{
                flex: 1, fontSize: 12, color: active ? 'var(--text)' : 'var(--muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontWeight: active ? 600 : 400,
              }}>
                {conv.title || t('startup_chat.default_conv_title')}
              </span>
              <button
                onClick={e => { e.stopPropagation(); onDelete(conv.id) }}
                style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', padding: 2, flexShrink: 0 }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function StartupChatPage() {
  const { t }         = useT()
  const { stepId }   = useParams()          // optional — step that opened this chat
  const location     = useLocation()
  const navigate     = useNavigate()

  // Step context is passed via router state from StartupPage
  const stepContext  = location.state?.stepContext || null

  const [conversations, setConversations] = useState([])
  const [activeConvId,  setActiveConvId]  = useState(null)
  const [messages,      setMessages]      = useState([])
  const [input,         setInput]         = useState('')
  const [sending,       setSending]       = useState(false)
  const [loadingConvs,  setLoadingConvs]  = useState(true)
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)
  const [showConvList,  setShowConvList]  = useState(false)
  const [chatError,     setChatError]     = useState(null)

  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const suggestions = suggestionsForStep(stepContext, t)

  // ── Load conversation list ──
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/startup-chat/conversations')
      setConversations(data || [])
    } catch {
      // Endpoint may not exist yet — handle gracefully
      setConversations([])
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  // ── Scroll to bottom on new messages ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // ── Auto-resize textarea ──
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  // ── Load a specific conversation ──
  const openConversation = async (conv) => {
    setActiveConvId(conv.id)
    setLoadingMsgs(true)
    setShowConvList(false)
    try {
      const { data } = await api.get(`/startup-chat/conversations/${conv.id}`)
      setMessages(data.messages || [])
    } catch {
      toast.error(t('startup_chat.error_load_conversation'))
    } finally {
      setLoadingMsgs(false)
    }
  }

  // ── Start a fresh conversation ──
  const startNew = () => {
    setActiveConvId(null)
    setMessages([])
    setInput('')
    setShowConvList(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ── Delete conversation ──
  const deleteConversation = async (convId) => {
    if (!confirm(t('startup_chat.confirm_delete'))) return
    try {
      await api.delete(`/startup-chat/conversations/${convId}`)
      setConversations(prev => prev.filter(c => c.id !== convId))
      if (activeConvId === convId) startNew()
      toast.success(t('startup_chat.deleted_success'))
    } catch {
      toast.error(t('startup_chat.error_delete'))
    }
  }

  // ── Send a message ──
  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || sending) return

    setInput('')
    setSending(true)
    setChatError(null)

    // Optimistic user bubble
    const optimistic = { id: `temp-${Date.now()}`, role: 'user', content: msg, _temp: true }
    setMessages(prev => [...prev, optimistic])

    try {
      const payload = {
        message:         msg,
        conversation_id: activeConvId || null,
        // Pass step context on first message so the backend seeds the system prompt
        step_context:    messages.length === 0 && stepContext
          ? buildSystemContext(stepContext)
          : null,
      }

      const { data } = await api.post('/startup-chat/send', payload)

      // If this was a new conversation, record its ID and reload list
      if (!activeConvId && data.conversation_id) {
        setActiveConvId(data.conversation_id)
        loadConversations()
      }

      setMessages(prev => [
        ...prev.filter(m => !m._temp),
        { id: Date.now(),     role: 'user',      content: msg        },
        { id: Date.now() + 1, role: 'assistant', content: data.reply },
      ])
    } catch (err) {
      setMessages(prev => prev.filter(m => !m._temp))
      const detail = err.response?.data?.detail
      if (err.response?.status === 404) {
        // /startup-chat endpoint doesn't exist yet — fall back to main /chat/send
        // with the startup system prompt injected as a prefix
        setChatError('startup_chat_not_ready')
      } else {
        toast.error(detail || t('startup_chat.error_generic_send'))
      }
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  // ── Fallback: send via main chat endpoint if /startup-chat doesn't exist yet ──
  const sendFallback = async (text) => {
    const msg = (text || input).trim()
    if (!msg || sending) return

    setInput('')
    setSending(true)
    setChatError(null)

    const systemPrefix = stepContext
      ? `[Startup Registration Context — ${stepContext.title}]\n\n`
      : '[KIP Startup Advisor]\n\n'

    const optimistic = { id: `temp-${Date.now()}`, role: 'user', content: msg, _temp: true }
    setMessages(prev => [...prev, optimistic])

    try {
      const { data } = await api.post('/chat/send', {
        message:         messages.length === 0
          ? `${systemPrefix}${msg}`
          : msg,
        conversation_id: activeConvId || null,
      })

      if (!activeConvId && data.conversation_id) setActiveConvId(data.conversation_id)

      setMessages(prev => [
        ...prev.filter(m => !m._temp),
        { id: Date.now(),     role: 'user',      content: msg        },
        { id: Date.now() + 1, role: 'assistant', content: data.reply },
      ])
    } catch {
      setMessages(prev => prev.filter(m => !m._temp))
      toast.error(t('startup_chat.error_send_fallback'))
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleSend = (text) => {
    if (chatError === 'startup_chat_not_ready') {
      sendFallback(text)
    } else {
      send(text)
    }
  }

  // ── Active conversation title ──
  const activeConv = conversations.find(c => c.id === activeConvId)
  const chatTitle  = stepContext
    ? t('startup_chat.chat_title_with_step', { title: stepContext.title })
    : activeConv?.title || t('startup_chat.default_chat_title')

  return (
    <Layout>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden', flexDirection: 'column' }}>

        {/* ── BACK BAR ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.02)', flexShrink: 0,
        }}>
          <Link
            to="/startup"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: 'var(--muted)', textDecoration: 'none',
              fontFamily: 'Syne', fontWeight: 600,
              padding: '5px 10px', borderRadius: 8,
              background: 'var(--input-bg)', border: '1px solid var(--border)',
            }}
          >
            <ArrowLeft size={13} /> {t('startup_chat.back_to_guide')}
          </Link>

          {/* Step context badge */}
          {stepContext && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0,
              padding: '5px 12px', borderRadius: 8,
              background: 'var(--blue-dim)', border: '1px solid rgba(43,127,255,0.25)',
            }}>
              <Rocket size={12} style={{ color: 'var(--blue-bright)', flexShrink: 0 }} />
              <span style={{
                fontSize: 12, fontFamily: 'Syne', fontWeight: 700,
                color: 'var(--blue-bright)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {stepContext.title}
              </span>
            </div>
          )}

          {/* Mobile conv list toggle */}
          <button
            onClick={() => setShowConvList(o => !o)}
            className="kip-mobile-only"
            style={{
              display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto',
              padding: '5px 10px', borderRadius: 8,
              background: 'var(--input-bg)', border: '1px solid var(--border)',
              color: 'var(--muted)', cursor: 'pointer', fontSize: 12, fontFamily: 'Syne', fontWeight: 600,
            }}
          >
            <MessageSquare size={13} />
            {t('startup_chat.history_button')}
          </button>
        </div>

        {/* ── MAIN BODY ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

          {/* Desktop sidebar */}
          <div className="kip-conv-sidebar" style={{ display: 'none' }}>
            <ConvList
              conversations={conversations}
              activeId={activeConvId}
              onSelect={openConversation}
              onNew={startNew}
              onDelete={deleteConversation}
              loading={loadingConvs}
            />
          </div>

          {/* Mobile bottom sheet */}
          {showConvList && (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(4,12,24,0.85)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
              onClick={() => setShowConvList(false)}
            >
              <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '20px 20px 0 0', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <ConvList
                  conversations={conversations}
                  activeId={activeConvId}
                  onSelect={openConversation}
                  onNew={startNew}
                  onDelete={deleteConversation}
                  loading={loadingConvs}
                  mobile
                  onClose={() => setShowConvList(false)}
                />
                <div style={{ padding: '10px 14px' }}>
                  <button onClick={() => setShowConvList(false)} style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600, fontSize: 14 }}>
                    {t('common.close')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── CHAT AREA ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

            {/* Chat header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
              borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', flexShrink: 0,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9,
                background: 'linear-gradient(135deg, var(--blue), var(--teal))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Rocket size={14} color="#fff" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {chatTitle}
                </div>
                <div style={{ fontSize: 10, color: 'var(--teal)' }}>
                  {t('startup_chat.advisor_subtitle')}
                </div>
              </div>
              <button onClick={startNew} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8,
                background: 'rgba(43,127,255,0.12)', border: '1px solid rgba(43,127,255,0.25)',
                color: 'var(--blue-bright)', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 700, fontSize: 11, flexShrink: 0,
              }}>
                <Plus size={12} /> {t('startup_chat.new_button')}
              </button>
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
              {loadingMsgs ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(43,127,255,0.2)', borderTopColor: 'var(--blue)', animation: 'spinSlow 0.8s linear infinite' }} />
                </div>
              ) : messages.length === 0 ? (
                /* Empty state */
                <div className="animate-fade-in" style={{ padding: '24px 20px', maxWidth: 560, margin: '0 auto' }}>
                  {/* Avatar */}
                  <div style={{ textAlign: 'center', marginBottom: 22 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 18,
                      background: 'linear-gradient(135deg, var(--blue), var(--teal))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 12px',
                      boxShadow: 'var(--glow-blue)',
                    }}>
                      <Rocket size={26} color="#fff" />
                    </div>
                    <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 17, color: 'var(--text)', marginBottom: 5 }}>
                      {t('startup_chat.advisor_heading')}
                    </h2>
                    {stepContext ? (
                      <>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8,
                          padding: '4px 14px', borderRadius: 20,
                          background: 'var(--blue-dim)', border: '1px solid rgba(43,127,255,0.3)',
                        }}>
                          <Rocket size={11} style={{ color: 'var(--blue-bright)' }} />
                          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: 'var(--blue-bright)' }}>
                            {stepContext.title}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>
                          {t('startup_chat.advisor_intro_with_step')}
                        </p>
                      </>
                    ) : (
                      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>
                        {t('startup_chat.advisor_intro_default')}
                      </p>
                    )}
                  </div>

                  {/* Suggestion chips */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(s)}
                        className="chip animate-slide-up"
                        style={{ animationDelay: `${i * 60}ms`, textAlign: 'left', fontSize: 12 }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Message thread */
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {messages.map((msg) => (
                    <div key={msg.id || Math.random()}>
                      {msg.role === 'user' ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 16px' }}>
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
                            <div style={{
                              width: 28, height: 28, borderRadius: 9, flexShrink: 0,
                              background: 'linear-gradient(135deg, var(--blue), var(--teal))',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                            }}>
                              <Rocket size={13} color="#fff" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                              <KipMarkdown content={msg.content} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {sending && (
                    <div style={{ width: '100%', background: 'rgba(255,255,255,0.018)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ maxWidth: 860, margin: '0 auto', padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 9, flexShrink: 0, background: 'linear-gradient(135deg, var(--blue), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Rocket size={13} color="#fff" />
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, paddingTop: 6 }}>
                          {[0, 1, 2].map(i => (
                            <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--blue-bright)', opacity: 0.7, animation: `pulse 1.4s ${i * 0.2}s ease-in-out infinite` }} />
                          ))}
                          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6, fontStyle: 'italic' }}>{t('startup_chat.advisor_thinking')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fallback warning banner */}
              {chatError === 'startup_chat_not_ready' && (
                <div style={{
                  margin: '12px 16px', padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(232,151,62,0.08)', border: '1px solid rgba(232,151,62,0.25)',
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                }}>
                  <AlertCircle size={13} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
                    {t('startup_chat.fallback_warning')}
                  </p>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'rgba(8,11,16,0.9)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8, maxWidth: 860, margin: '0 auto' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder={
                    stepContext
                      ? t('startup_chat.input_placeholder_with_step', { title: stepContext.title })
                      : t('startup_chat.input_placeholder_default')
                  }
                  rows={1}
                  className="kip-input"
                  style={{ flex: 1, resize: 'none', overflow: 'hidden', fontSize: 14, lineHeight: 1.5, minHeight: 48, maxHeight: 120 }}
                  disabled={sending}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sending}
                  className="kip-btn kip-btn-primary"
                  style={{ padding: '0 16px', borderRadius: 12, minWidth: 48, minHeight: 48, flexShrink: 0 }}
                >
                  <Send size={17} />
                </button>
              </div>
              <p style={{ fontSize: 10, color: 'var(--faint)', textAlign: 'center', marginTop: 6, marginBottom: 0 }}>
                {t('startup_chat.disclaimer')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .kip-conv-sidebar { display: flex !important; }
          .kip-mobile-only  { display: none  !important; }
        }
      `}</style>
    </Layout>
  )
}
