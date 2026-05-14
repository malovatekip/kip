import React, { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  TrendingUp, BookOpen, ClipboardList, MapPin,
  ArrowLeft, Calendar, DollarSign, Users, Zap,
  ChevronDown, ChevronUp, MessageSquare, Send,
  Sparkles, RotateCcw, CheckCircle, XCircle, History
} from 'lucide-react'
import Layout from '../components/Layout'
import KipMarkdown from '../components/KipMarkdown'
import api from '../lib/api'
import toast from 'react-hot-toast'

/* ── Plan update banner ──────────────────────────────── */
function UpdateBanner({ summary, onConfirm, onCancel }) {
  return (
    <div className="animate-slide-up" style={{
      background: 'linear-gradient(135deg, rgba(26,224,110,0.1), rgba(0,240,200,0.07))',
      border: '1px solid rgba(26,224,110,0.35)',
      borderRadius: 14, padding: '14px 18px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
        <CheckCircle size={16} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--green)', marginBottom: 4 }}>
            KIP approved this change
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
            {summary}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onConfirm} style={{
          flex: 1, padding: '9px 0', borderRadius: 9, cursor: 'pointer',
          fontFamily: 'Syne', fontWeight: 700, fontSize: 12,
          color: '#050D05', background: 'var(--green)',
          border: 'none', transition: 'all 0.2s ease',
          boxShadow: '0 2px 12px rgba(26,224,110,0.3)',
        }}>
          ✓ Apply to Plan
        </button>
        <button onClick={onCancel} style={{
          flex: 1, padding: '9px 0', borderRadius: 9, cursor: 'pointer',
          fontFamily: 'Syne', fontWeight: 600, fontSize: 12,
          color: 'var(--muted)', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s ease',
        }}>
          ✗ Keep Current Plan
        </button>
      </div>
    </div>
  )
}

/* ── Business Chat ───────────────────────────────────── */
function BusinessChat({ planId, businessName }) {
  const [messages,     setMessages]     = useState([])
  const [input,        setInput]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [histLoading,  setHistLoading]  = useState(true)
  const [suggestions,  setSuggestions]  = useState([])
  const [pendingUpdate,setPendingUpdate]= useState(null) // {summary}
  const [planUpdated,  setPlanUpdated]  = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // Load persistent history on mount
  useEffect(() => {
    Promise.all([
      api.get(`/business-chat/history/${planId}`),
      api.get(`/business-chat/suggestions/${planId}`),
    ]).then(([hist, sugg]) => {
      setMessages(hist.data || [])
      setSuggestions(sugg.data.suggestions || [])
      // Check if last assistant message has a pending update
      const msgs = hist.data || []
      const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant')
      if (lastAssistant?.is_plan_update_proposal && !lastAssistant?.is_plan_update_applied) {
        // Find the summary — it won't be in content (sentinel stripped), use update_summary
        setPendingUpdate({ summary: lastAssistant.update_summary || 'Proposed change' })
      }
    }).catch(() => {}).finally(() => setHistLoading(false))
  }, [planId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    setLoading(true)

    // Optimistic user message
    const optimistic = { role: 'user', content: msg, _temp: true }
    setMessages(prev => [...prev, optimistic])

    try {
      const { data } = await api.post('/business-chat/chat', {
        plan_id: parseInt(planId),
        message: msg,
      })

      setMessages(prev => [
        ...prev.filter(m => !m._temp),
        { role: 'user',      content: msg },
        { role: 'assistant', content: data.reply,
          is_plan_update_proposal: data.is_proposal,
          update_summary: data.update_summary },
      ])

      if (data.is_proposal) {
        setPendingUpdate({ summary: data.update_summary })
      }

      if (data.plan_updated) {
        setPendingUpdate(null)
        setPlanUpdated(true)
        toast.success('Plan updated successfully!')
        setTimeout(() => setPlanUpdated(false), 4000)
      }
    } catch {
      setMessages(prev => prev.filter(m => !m._temp))
      toast.error('Could not reach KIP. Try again.')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleConfirm = () => {
    setPendingUpdate(null)
    send('confirm')
  }
  const handleCancel = () => {
    setPendingUpdate(null)
    send('cancel')
  }

  const reset = async () => {
    // Just clears display — history stays in DB for continuity
    setMessages([])
    setPendingUpdate(null)
    setSuggestions(s => [...s])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 540 }}>

      {/* Plan updated banner */}
      {planUpdated && (
        <div className="animate-slide-up" style={{
          background: 'rgba(26,224,110,0.12)', border: '1px solid rgba(26,224,110,0.3)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: 'var(--green)', fontFamily: 'Syne', fontWeight: 700,
        }}>
          <CheckCircle size={15} />
          Plan updated! View it in the Launch Plan tab.
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>

        {histLoading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(43,127,255,0.3)', borderTopColor: 'var(--blue)', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        )}

        {/* Empty state */}
        {!histLoading && messages.length === 0 && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, var(--blue), var(--teal))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px rgba(43,127,255,0.4)',
              }}>
                <Sparkles size={16} color="#fff" />
              </div>
              <div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: '#fff' }}>
                  KIP — {businessName} Advisor
                </div>
                <div style={{ fontSize: 11, color: 'var(--teal)' }}>
                  Full context loaded · Conversation saved automatically
                </div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.65 }}>
              I have your launch plan, logs, market survey, and financial targets.
              Ask anything about <strong style={{ color: '#fff' }}>{businessName}</strong> — or suggest a change to the plan.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => send(s)}
                  className="chip animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message thread */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((msg, i) => (
            <div key={msg.id || i} className="animate-fade-in"
              style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 9, alignItems: 'flex-end' }}>

              {msg.role === 'assistant' && (
                <div style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--blue), var(--teal))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Sparkles size={12} color="#fff" />
                </div>
              )}

              <div style={{ maxWidth: '80%' }}>
                {msg.role === 'user' ? (
                  <div className="bubble-user">
                    <p style={{ fontSize: 13.5, color: '#fff', margin: 0, lineHeight: 1.6 }}>{msg.content}</p>
                  </div>
                ) : (
                  <div>
                    <div className="bubble-kip" style={{ padding: '13px 15px' }}>
                      <KipMarkdown content={msg.content} />
                    </div>
                    {msg.is_plan_update_applied && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 11, color: 'var(--green)', fontFamily: 'Syne', fontWeight: 600 }}>
                        <CheckCircle size={11} /> Plan updated
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--blue-mid), var(--blue))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, fontFamily: 'Syne', color: '#fff',
                }}>U</div>
              )}
            </div>
          ))}

          {/* Typing */}
          {loading && (
            <div className="animate-fade-in" style={{ display: 'flex', gap: 9, alignItems: 'flex-end' }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, var(--blue), var(--teal))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={12} color="#fff" />
              </div>
              <div className="bubble-kip" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--blue-bright)', opacity: 0.7, animation: `pulse 1.4s ease-in-out ${i*0.2}s infinite` }} />
                  ))}
                  <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8, fontStyle: 'italic' }}>KIP is thinking…</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Pending update banner */}
      {pendingUpdate && !loading && (
        <UpdateBanner
          summary={pendingUpdate.summary}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {/* Input */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {messages.length > 2 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--faint)', fontFamily: 'Syne', fontWeight: 600 }}>
              {messages.length} messages · saved
            </span>
            <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--faint)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600 }}>
              <RotateCcw size={10} /> Clear view
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={pendingUpdate ? 'Type "confirm" or "cancel"…' : `Ask KIP about ${businessName}…`}
            className="kip-input"
            style={{ flex: 1, fontSize: 13, borderColor: pendingUpdate ? 'rgba(26,224,110,0.4)' : undefined }}
            disabled={loading}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="kip-btn kip-btn-primary"
            style={{ padding: '0 16px', flexShrink: 0, borderRadius: 10, minHeight: 48 }}>
            <Send size={16} />
          </button>
        </div>
        <p style={{ fontSize: 10, color: 'var(--faint)', margin: 0 }}>
          Suggest "add delivery service" or "change pricing" to update your plan
        </p>
      </div>
    </div>
  )
}

/* ── Main Dashboard Page ─────────────────────────────── */
export default function BusinessDashboardPage() {
  const { planId } = useParams()
  const navigate   = useNavigate()
  const [plan,    setPlan]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('plan')
  const [showFull,setShowFull]= useState(false)
  const [versions,setVersions]= useState([])
  const [showVer, setShowVer] = useState(false)

  const reload = () => {
    api.get(`/business/plan/${planId}`).then(r => setPlan(r.data)).catch(() => {})
  }

  useEffect(() => {
    if (!planId || planId === 'undefined') { toast.error('Invalid plan.'); navigate('/ideas'); return }
    api.get(`/business/plan/${planId}`)
      .then(r => setPlan(r.data))
      .catch(() => { toast.error('Plan not found.'); navigate('/ideas') })
      .finally(() => setLoading(false))
    api.get(`/business-chat/plan-versions/${planId}`)
      .then(r => setVersions(r.data || [])).catch(() => {})
  }, [planId])

  // Reload plan when switching to plan tab (in case it was updated via chat)
  useEffect(() => {
    if (tab === 'plan' && planId) reload()
  }, [tab])

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(43,127,255,0.2)', borderTopColor: 'var(--blue)', animation: 'spinSlow 0.8s linear infinite', margin: '0 auto' }} />
      </div>
    </Layout>
  )
  if (!plan) return null

  const totalRevenue   = plan.logs?.reduce((s,l) => s+(l.revenue||0), 0) || 0
  const totalExpenses  = plan.logs?.reduce((s,l) => s+(l.expenses||0), 0) || 0
  const totalProfit    = totalRevenue - totalExpenses
  const totalCustomers = plan.logs?.reduce((s,l) => s+(l.customers||0), 0) || 0
  const logCount       = plan.logs?.length || 0

  const TABS = [
    { key: 'plan', label: 'Launch Plan',       icon: BookOpen      },
    { key: 'logs', label: `Logs (${logCount})`,icon: ClipboardList  },
    { key: 'chat', label: 'Ask KIP',           icon: MessageSquare, accent: 'var(--teal)' },
  ]

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px', position: 'relative', zIndex: 1 }}>

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
                Started {plan.created_at ? new Date(plan.created_at).toLocaleDateString('en-ZM', { day:'numeric', month:'long', year:'numeric' }) : '—'}
                {versions.length > 0 && (
                  <span style={{ marginLeft: 12, color: 'var(--teal)', fontFamily: 'Syne', fontWeight: 600, cursor: 'pointer' }}
                    onClick={() => setShowVer(v => !v)}>
                    · v{versions.length + 1} ({versions.length} update{versions.length !== 1 ? 's' : ''})
                  </span>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link to={`/business/${planId}/log`} className="kip-btn kip-btn-primary" style={{ fontSize: 13, padding: '9px 16px' }}>
                <ClipboardList size={15} /> Log Today
              </Link>
              <Link to={`/business/${planId}/survey`} className="kip-btn kip-btn-ghost" style={{ fontSize: 13, padding: '9px 16px' }}>
                <MapPin size={15} /> Survey
              </Link>
            </div>
          </div>

          {/* Version history */}
          {showVer && versions.length > 0 && (
            <div className="animate-slide-up" style={{ marginTop: 12, background: 'rgba(0,240,200,0.05)', border: '1px solid rgba(0,240,200,0.2)', borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: 'var(--teal)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <History size={13} /> Plan Change History
              </div>
              {versions.map((v, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--muted)', marginBottom: 4, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: 'Syne', fontWeight: 700, color: 'var(--teal)', flexShrink: 0 }}>v{v.version}</span>
                  <span style={{ flex: 1 }}>{v.change}</span>
                  <span style={{ color: 'var(--faint)', flexShrink: 0 }}>{new Date(v.at).toLocaleDateString('en-ZM', { day:'numeric', month:'short' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { label:'Revenue',   value:`K${totalRevenue.toLocaleString()}`,   color:'var(--green)',       icon:DollarSign },
            { label:'Expenses',  value:`K${totalExpenses.toLocaleString()}`,  color:'var(--red)',         icon:DollarSign },
            { label:'Profit',    value:`K${totalProfit.toLocaleString()}`,    color:totalProfit>=0?'var(--gold-bright)':'var(--red)', icon:TrendingUp },
            { label:'Customers', value:totalCustomers.toLocaleString(),       color:'var(--teal)',        icon:Users },
            { label:'Days',      value:logCount.toString(),                  color:'var(--blue-bright)', icon:Calendar },
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

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }}>
          {TABS.map(({ key, label, icon: Icon, accent }) => {
            const active = tab === key
            const c = accent || 'var(--blue-bright)'
            return (
              <button key={key} onClick={() => setTab(key)} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 20px', fontFamily: 'Syne', fontWeight: 700, fontSize: 13,
                color: active ? c : 'var(--muted)',
                borderBottom: `2px solid ${active ? c : 'transparent'}`,
                background: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                border: 'none', borderBottomWidth: 2, borderBottomStyle: 'solid',
                borderBottomColor: active ? c : 'transparent', marginBottom: -1,
              }}>
                <Icon size={14} />
                {label}
                {key === 'chat' && (
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 20, background: 'var(--teal-dim)', color: 'var(--teal)', border: '1px solid rgba(0,240,200,0.3)' }}>
                    AI
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Launch Plan tab ── */}
        {tab === 'plan' && (
          <div className="kip-card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <BookOpen size={16} style={{ color: 'var(--gold-bright)' }} />
              <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: '#fff' }}>KIP Launch Plan</span>
              {versions.length > 0 && (
                <span className="kip-badge kip-badge-teal" style={{ marginLeft: 'auto' }}>
                  v{versions.length + 1} — latest
                </span>
              )}
            </div>
            {plan.launch_plan ? (
              <>
                <div style={{ maxHeight: showFull ? 'none' : 340, overflow: 'hidden', position: 'relative' }}>
                  <KipMarkdown content={plan.launch_plan} />
                  {!showFull && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(transparent, rgba(16,21,32,0.98))' }} />
                  )}
                </div>
                <button onClick={() => setShowFull(f => !f)} style={{
                  marginTop: 10, display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, color: 'var(--blue-bright)', background: 'none',
                  border: 'none', cursor: 'pointer', fontFamily: 'Syne', fontWeight: 600, padding: 0,
                }}>
                  {showFull ? <><ChevronUp size={14}/> Show less</> : <><ChevronDown size={14}/> Read full plan</>}
                </button>
              </>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Plan not yet generated.</p>
            )}
          </div>
        )}

        {/* ── Logs tab ── */}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: log.coaching ? 10 : 0 }}>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'Syne', fontWeight: 600 }}>
                          {log.created_at ? new Date(log.created_at).toLocaleDateString('en-ZM', { day:'numeric', month:'short' }) : '—'}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>K{(log.revenue||0).toLocaleString()} in</span>
                        <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>K{(log.expenses||0).toLocaleString()} out</span>
                        <span style={{ fontSize: 12, color: 'var(--gold-bright)', fontWeight: 700 }}>K{((log.revenue||0)-(log.expenses||0)).toLocaleString()} profit</span>
                      </div>
                      {log.customers > 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{log.customers} customers</span>}
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

        {/* ── Ask KIP tab ── */}
        {tab === 'chat' && (
          <div className="kip-card kip-card-glow" style={{ padding: 22 }}>
            <BusinessChat planId={planId} businessName={plan.business_name} />
          </div>
        )}

      </div>
    </Layout>
  )
}
