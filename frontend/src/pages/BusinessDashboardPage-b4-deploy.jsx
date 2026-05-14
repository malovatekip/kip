import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  TrendingUp, BookOpen, ClipboardList, MapPin,
  ArrowLeft, Calendar, DollarSign, Users, Zap,
  ChevronDown, ChevronUp, MessageSquare, Send,
  Sparkles, RotateCcw
} from 'lucide-react'
import Layout from '../components/Layout'
import KipMarkdown from '../components/KipMarkdown'
import api from '../lib/api'
import toast from 'react-hot-toast'

/* ── Business Chat ───────────────────────────────────── */
function BusinessChat({ planId, businessName }) {
  const [messages,    setMessages]    = useState([])
  const [input,       setInput]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    api.get(`/business-chat/suggestions/${planId}`)
      .then(r => setSuggestions(r.data.suggestions || []))
      .catch(() => {})
  }, [planId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setLoading(true)

    const userMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])

    try {
      // Build history (last 10 pairs)
      const history = messages.slice(-20)
      const { data } = await api.post('/business-chat/chat', {
        plan_id: parseInt(planId),
        message: msg,
        history,
      })
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      toast.error('Could not reach KIP. Try again.')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const reset = () => {
    setMessages([])
    setSuggestions(s => [...s]) // re-show chips
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 520 }}>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>

        {/* Empty state with suggestions */}
        {messages.length === 0 && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--blue), var(--teal))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'var(--glow-blue)',
              }}>
                <Sparkles size={16} color="#fff" />
              </div>
              <div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: '#fff' }}>
                  KIP — {businessName} Advisor
                </div>
                <div style={{ fontSize: 11, color: 'var(--teal)' }}>
                  I know everything about this business. Ask me anything.
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
              I have full context — your launch plan, daily logs, market survey, and financial targets.
              Every answer is specific to <strong style={{ color: '#fff' }}>{businessName}</strong>.
            </p>

            {/* Suggestion chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => send(s)}
                  className="chip animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms`, textAlign: 'left' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.map((msg, i) => (
            <div key={i}
              className="animate-slide-up"
              style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 10 }}>

              {msg.role === 'assistant' && (
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                  background: 'linear-gradient(135deg, var(--blue), var(--teal))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Sparkles size={13} color="#fff" />
                </div>
              )}

              <div style={{ maxWidth: '80%' }}>
                {msg.role === 'user' ? (
                  <div className="bubble-user">
                    <p style={{ fontSize: 13.5, color: '#fff', margin: 0, lineHeight: 1.6 }}>
                      {msg.content}
                    </p>
                  </div>
                ) : (
                  <div className="bubble-kip" style={{ padding: '14px 16px' }}>
                    <KipMarkdown content={msg.content} />
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                  background: 'linear-gradient(135deg, var(--blue-mid), var(--blue))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, fontFamily: 'Syne', color: '#fff',
                }}>
                  U
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="animate-fade-in" style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, var(--blue), var(--teal))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Sparkles size={13} color="#fff" />
              </div>
              <div className="bubble-kip" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: 'var(--blue-bright)', opacity: 0.7,
                      animation: `pulse 1.4s ease-in-out ${i*0.2}s infinite`
                    }} />
                  ))}
                  <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8, fontStyle: 'italic' }}>
                    KIP is thinking…
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {messages.length > 0 && (
          <button onClick={reset} style={{
            alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: 'var(--faint)', background: 'none', border: 'none',
            cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600, padding: 0,
            transition: 'color 0.2s',
          }}>
            <RotateCcw size={11} /> Start new thread
          </button>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={`Ask KIP about ${businessName}…`}
            className="kip-input"
            style={{ flex: 1, fontSize: 13 }}
            disabled={loading}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            className="kip-btn kip-btn-primary"
            style={{ padding: '0 16px', flexShrink: 0, borderRadius: 10, minHeight: 48 }}
          >
            <Send size={16} />
          </button>
        </div>
        <p style={{ fontSize: 10, color: 'var(--faint)', margin: 0 }}>
          Enter to send · KIP has full context about this business
        </p>
      </div>
    </div>
  )
}

/* ── Main Dashboard ──────────────────────────────────── */
export default function BusinessDashboardPage() {
  const { planId } = useParams()
  const navigate   = useNavigate()
  const [plan,     setPlan]    = useState(null)
  const [loading,  setLoading] = useState(true)
  const [tab,      setTab]     = useState('plan')   // 'plan' | 'logs' | 'chat'
  const [showFull, setShowFull]= useState(false)

  useEffect(() => {
    if (!planId || planId === 'undefined') {
      toast.error('Invalid business plan ID.')
      navigate('/ideas')
      return
    }
    api.get(`/business/plan/${planId}`)
      .then(r => setPlan(r.data))
      .catch(() => { toast.error('Business plan not found.'); navigate('/ideas') })
      .finally(() => setLoading(false))
  }, [planId])

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '3px solid rgba(43,127,255,0.2)', borderTopColor: 'var(--blue)',
            animation: 'spinSlow 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Loading your business dashboard…</p>
        </div>
      </div>
    </Layout>
  )

  if (!plan) return null

  const totalRevenue   = plan.logs?.reduce((s, l) => s + (l.revenue  || 0), 0) || 0
  const totalExpenses  = plan.logs?.reduce((s, l) => s + (l.expenses || 0), 0) || 0
  const totalProfit    = totalRevenue - totalExpenses
  const totalCustomers = plan.logs?.reduce((s, l) => s + (l.customers || 0), 0) || 0
  const logCount       = plan.logs?.length || 0

  const TABS = [
    { key: 'plan', label: 'Launch Plan', icon: BookOpen },
    { key: 'logs', label: `Logs (${logCount})`, icon: ClipboardList },
    { key: 'chat', label: 'Ask KIP', icon: MessageSquare },
  ]

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px', position: 'relative', zIndex: 1 }}>

        {/* Back */}
        <Link to="/ideas" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)', textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={14} /> My Ideas
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <span className="kip-badge kip-badge-green" style={{ marginBottom: 8, display: 'inline-block' }}>
                {plan.status?.toUpperCase() || 'ACTIVE'}
              </span>
              <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, color: '#fff', marginBottom: 6 }}>
                {plan.business_name}
              </h1>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>
                Started {plan.created_at ? new Date(plan.created_at).toLocaleDateString('en-ZM', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to={`/business/${planId}/log`} className="kip-btn kip-btn-primary" style={{ fontSize: 13, padding: '9px 16px' }}>
                <ClipboardList size={15} /> Log Today
              </Link>
              <Link to={`/business/${planId}/survey`} className="kip-btn kip-btn-ghost" style={{ fontSize: 13, padding: '9px 16px' }}>
                <MapPin size={15} /> Market Survey
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Revenue',   value: `K${totalRevenue.toLocaleString()}`,   color: 'var(--green)',       icon: DollarSign },
            { label: 'Expenses',  value: `K${totalExpenses.toLocaleString()}`,  color: 'var(--red)',         icon: DollarSign },
            { label: 'Profit',    value: `K${totalProfit.toLocaleString()}`,    color: totalProfit >= 0 ? 'var(--gold)' : 'var(--red)', icon: TrendingUp },
            { label: 'Customers', value: totalCustomers.toLocaleString(),       color: 'var(--teal)',        icon: Users },
            { label: 'Days',      value: logCount.toString(),                  color: 'var(--blue-bright)', icon: Calendar },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="kip-card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <Icon size={13} style={{ color }} />
                <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Syne', fontWeight: 600 }}>{label}</span>
              </div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key
            const isChat = key === 'chat'
            return (
              <button key={key} onClick={() => setTab(key)} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 20px', fontFamily: 'Syne', fontWeight: 700, fontSize: 13,
                color: active ? (isChat ? 'var(--teal)' : 'var(--blue-bright)') : 'var(--muted)',
                borderBottom: active ? `2px solid ${isChat ? 'var(--teal)' : 'var(--blue-bright)'}` : '2px solid transparent',
                background: 'none', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: -1,
                border: 'none', borderBottomWidth: 2,
                borderBottomStyle: 'solid',
                borderBottomColor: active ? (isChat ? 'var(--teal)' : 'var(--blue-bright)') : 'transparent',
              }}>
                <Icon size={14} />
                {label}
                {isChat && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 20,
                    background: 'var(--teal-dim)', color: 'var(--teal)',
                    border: '1px solid rgba(0,240,200,0.3)',
                  }}>AI</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab content */}

        {/* ── Launch Plan ── */}
        {tab === 'plan' && (
          <div className="kip-card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <BookOpen size={16} style={{ color: 'var(--gold-bright)' }} />
              <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: '#fff' }}>KIP Launch Plan</span>
            </div>
            {plan.launch_plan ? (
              <>
                <div style={{ maxHeight: showFull ? 'none' : 320, overflow: 'hidden', position: 'relative' }}>
                  <KipMarkdown content={plan.launch_plan} />
                  {!showFull && (
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
                      background: 'linear-gradient(transparent, rgba(16,21,32,0.98))',
                    }} />
                  )}
                </div>
                <button onClick={() => setShowFull(f => !f)} style={{
                  marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: 'var(--blue-bright)', background: 'none',
                  border: 'none', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600, padding: 0,
                }}>
                  {showFull ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Read full plan</>}
                </button>
              </>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Launch plan not yet generated.</p>
            )}
          </div>
        )}

        {/* ── Logs ── */}
        {tab === 'logs' && (
          <div>
            {logCount === 0 ? (
              <div className="kip-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <Zap size={36} style={{ color: 'var(--faint)', margin: '0 auto 12px', display: 'block' }} className="animate-float" />
                <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 8 }}>No logs yet</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>Log your first day to activate KIP coaching.</p>
                <Link to={`/business/${planId}/log`} className="kip-btn kip-btn-primary" style={{ fontSize: 13 }}>
                  <ClipboardList size={15} /> Log Day 1
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.logs.map(log => (
                  <div key={log.id} className="kip-card" style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: log.coaching ? 10 : 0, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'Syne', fontWeight: 600 }}>
                          {log.created_at ? new Date(log.created_at).toLocaleDateString('en-ZM', { day: 'numeric', month: 'short' }) : '—'}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>K{(log.revenue || 0).toLocaleString()} in</span>
                        <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>K{(log.expenses || 0).toLocaleString()} out</span>
                        <span style={{ fontSize: 12, color: 'var(--gold-bright)', fontWeight: 700 }}>K{((log.revenue || 0) - (log.expenses || 0)).toLocaleString()} profit</span>
                      </div>
                      {log.customers > 0 && (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{log.customers} customers</span>
                      )}
                    </div>
                    {log.coaching && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <KipMarkdown content={log.coaching} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Ask KIP chat ── */}
        {tab === 'chat' && (
          <div className="kip-card kip-card-glow" style={{ padding: 22 }}>
            <BusinessChat planId={planId} businessName={plan.business_name} />
          </div>
        )}

      </div>
    </Layout>
  )
}
