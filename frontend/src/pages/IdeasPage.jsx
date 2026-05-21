import React, { useEffect, useState } from 'react'
import { Lightbulb, MapPin, DollarSign, CheckCircle, XCircle,
         Clock, ThumbsUp, ThumbsDown, Rocket, Plus, Building2,
         Bell, X, ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import AddBusinessModal from '../components/AddBusinessModal'
import KipMarkdown from '../components/KipMarkdown'
import api from '../lib/api'

/* ── Branch manager notification banner ──────────────── */
function BranchNotificationBanner() {
  const [notifications, setNotifications] = useState([])
  const [dismissed,     setDismissed]     = useState(false)

  useEffect(() => {
    api.get('/enterprise/notifications')
      .then(r => setNotifications(r.data || []))
      .catch(() => {})
  }, [])

  const dismiss = async (id) => {
    await api.post(`/enterprise/notifications/${id}/read`).catch(() => {})
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  if (dismissed || notifications.length === 0) return null

  return (
    <div style={{ marginBottom: 20 }}>
      {notifications.map(n => (
        <div key={n.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: 'linear-gradient(135deg,rgba(43,127,255,0.1),rgba(0,240,200,0.06))',
          border: '1px solid rgba(43,127,255,0.3)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 8,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bell size={16} style={{ color: 'var(--blue-bright)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: 'var(--blue-bright)', marginBottom: 4 }}>
              Branch Manager Assignment
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
              <KipMarkdown content={n.message} />
            </div>
            {n.branch_id && (
              <Link to={`/business/${n.branch_id}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 12, color: 'var(--blue-bright)', fontFamily: 'Syne', fontWeight: 600, textDecoration: 'none' }}>
                View Branch Dashboard <ArrowRight size={12} />
              </Link>
            )}
          </div>
          <button onClick={() => dismiss(n.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}

/* ── Idea card ───────────────────────────────────────── */
function IdeaCard({ idea, onFeedback, onStart, startingId }) {
  const [declining, setDeclining] = useState(false)
  const [reason,    setReason]    = useState('')
  const isStarting = startingId === idea.id
  const isUserAdded = idea.generated_by_kip === false

  const accept = async () => {
    try { await api.post(`/ideas/${idea.id}/feedback`, { accepted: true }); onFeedback() }
    catch { toast.error('Failed to save feedback.') }
  }
  const decline = async () => {
    try {
      await api.post(`/ideas/${idea.id}/feedback`, { accepted: false, decline_reason: reason })
      onFeedback(); setDeclining(false)
    } catch { toast.error('Failed to save feedback.') }
  }

  const status = idea.accepted === true
    ? { label: 'Accepted', color: 'var(--green)',       bg: 'rgba(26,224,110,0.1)',  border: 'rgba(26,224,110,0.25)',  Icon: CheckCircle }
    : idea.accepted === false
    ? { label: 'Declined', color: 'var(--red)',         bg: 'rgba(255,77,106,0.1)',  border: 'rgba(255,77,106,0.25)',  Icon: XCircle }
    : { label: 'Pending',  color: 'var(--blue-bright)', bg: 'rgba(75,158,255,0.1)',  border: 'rgba(75,158,255,0.25)',  Icon: Clock }

  return (
    <div className="kip-card animate-slide-up" style={{ padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: isUserAdded
              ? 'linear-gradient(135deg,rgba(232,151,62,0.2),rgba(232,151,62,0.08))'
              : 'linear-gradient(135deg,rgba(43,127,255,0.2),rgba(0,240,200,0.08))',
            border: `1px solid ${isUserAdded ? 'rgba(232,151,62,0.2)' : 'rgba(43,127,255,0.2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isUserAdded
              ? <Building2 size={17} style={{ color: 'var(--gold)' }} />
              : <Lightbulb  size={17} style={{ color: 'var(--blue-bright)' }} />
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--text)', lineHeight: 1.3, margin: 0 }}>
                {idea.idea_name}
              </h3>
              {isUserAdded && (
                <span style={{ fontSize: 9, fontFamily: 'Syne', fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid rgba(232,151,62,0.3)', borderRadius: 20, padding: '2px 7px' }}>
                  MY BUSINESS
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {idea.location && (
                <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <MapPin size={10} /> {idea.location}
                </span>
              )}
              {idea.capital_amount && (
                <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <DollarSign size={10} /> K{Number(idea.capital_amount).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10, fontWeight: 700, fontFamily: 'Syne',
          letterSpacing: '0.04em', textTransform: 'uppercase',
          padding: '3px 9px', borderRadius: 20, flexShrink: 0,
          color: status.color, background: status.bg, border: `1px solid ${status.border}`,
        }}>
          <status.Icon size={10} /> {status.label}
        </span>
      </div>

      {/* Summary */}
      {idea.idea_summary && (
        <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {idea.idea_summary}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {idea.plan_id && (
          <Link to={`/business/${idea.plan_id}`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '10px 0', borderRadius: 10, textDecoration: 'none',
            fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: 'var(--gold)',
            background: 'var(--gold-dim)', border: '1px solid rgba(232,151,62,0.35)',
          }}>
            <Rocket size={13} /> View Business Dashboard
          </Link>
        )}

        {idea.accepted === true && !idea.plan_id && (
          <button onClick={() => onStart(idea.id)} disabled={isStarting} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '10px 0', borderRadius: 10, cursor: isStarting ? 'not-allowed' : 'pointer',
            fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: 'var(--gold)',
            background: 'var(--gold-dim)', border: '1px solid rgba(232,151,62,0.35)',
            opacity: isStarting ? 0.65 : 1,
          }}>
            {isStarting
              ? <><div style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid var(--gold)', borderTopColor: 'transparent', animation: 'spinSlow 0.8s linear infinite' }} /> Generating Plan…</>
              : <><Rocket size={13} /> Start Business — Get Launch Plan</>
            }
          </button>
        )}

        {(idea.accepted === null || idea.accepted === undefined) && !idea.plan_id && !isUserAdded && (
          declining ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <textarea rows={2} placeholder="Why declining? (optional)" className="kip-input"
                style={{ resize: 'none', fontSize: 12 }} value={reason} onChange={e => setReason(e.target.value)} />
              <div style={{ display: 'flex', gap: 7 }}>
                <button onClick={decline} className="kip-btn kip-btn-primary" style={{ flex: 1, padding: '8px 0', fontSize: 12 }}>Submit</button>
                <button onClick={() => setDeclining(false)} className="kip-btn kip-btn-ghost" style={{ flex: 1, padding: '8px 0', fontSize: 12 }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 7 }}>
              <button onClick={accept} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '9px 0', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Syne',
                color: 'var(--green)', background: 'var(--green-dim)', border: '1px solid rgba(26,224,110,0.25)',
              }}>
                <ThumbsUp size={12} /> Accept
              </button>
              <button onClick={() => setDeclining(true)} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '9px 0', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Syne',
                color: 'var(--red)', background: 'var(--red-dim)', border: '1px solid rgba(255,77,106,0.25)',
              }}>
                <ThumbsDown size={12} /> Decline
              </button>
            </div>
          )
        )}
      </div>

      <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 10 }}>
        {idea.created_at ? new Date(idea.created_at).toLocaleDateString('en-ZM', { day:'numeric', month:'short', year:'numeric' }) : ''}
      </div>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────── */
export default function IdeasPage() {
  const [ideas,       setIdeas]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [startingId,  setStartingId]  = useState(null)
  const [showAddModal,setShowAddModal]= useState(false)
  const navigate = useNavigate()

  const fetchIdeas = async () => {
    try {
      const [ideasRes, plansRes] = await Promise.all([
        api.get('/ideas/'),
        api.get('/business/my-plans').catch(() => ({ data: [] })),
      ])
      const planMap = {}
      if (Array.isArray(plansRes.data)) {
        plansRes.data.forEach(plan => { if (plan.idea_id) planMap[plan.idea_id] = plan.id })
      }
      setIdeas((ideasRes.data || []).map(idea => ({
        ...idea,
        plan_id: planMap[idea.id] || idea.plan_id || null,
      })))
    } catch { }
    setLoading(false)
  }

  useEffect(() => { fetchIdeas() }, [])

  const handleStart = async (ideaId) => {
    setStartingId(ideaId)
    try {
      const { data } = await api.post('/business/start', { idea_id: ideaId })
      const planId   = data.plan_id ?? data.id ?? null
      if (!planId) { toast.error('Plan created but ID missing. Refresh the page.'); fetchIdeas(); return }
      toast.success('Launch plan ready!')
      navigate(`/business/${planId}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not start. Try again.')
    } finally { setStartingId(null) }
  }

  return (
    <Layout>
      {showAddModal && (
        <AddBusinessModal
          onClose={() => setShowAddModal(false)}
          onSuccess={planId => navigate(`/business/${planId}`)}
        />
      )}

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, color: 'var(--text)', marginBottom: 5 }}>
              My Business Ideas
            </h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
              KIP-generated ideas and your own businesses — all in one place.
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="kip-btn kip-btn-copper" style={{ fontSize: 13, padding: '10px 18px' }}>
            <Building2 size={15} /> Add My Business
          </button>
        </div>

        {/* Branch manager notifications */}
        <BranchNotificationBanner />

        {/* Ideas grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
            {[0,1,2].map(i => <div key={i} className="shimmer-load" style={{ height: 200, borderRadius: 16 }} />)}
          </div>
        ) : ideas.length === 0 ? (
          <div className="kip-card" style={{ textAlign: 'center', padding: '52px 24px' }}>
            <Lightbulb size={48} style={{ color: 'var(--faint)', margin: '0 auto 16px', display: 'block' }} className="animate-float" />
            <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>
              No ideas yet
            </h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 22 }}>
              Ask KIP for a business idea, or add a business you're already running.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/chat" className="kip-btn kip-btn-primary" style={{ fontSize: 13 }}>Ask KIP Now</Link>
              <button onClick={() => setShowAddModal(true)} className="kip-btn kip-btn-copper" style={{ fontSize: 13 }}>
                <Building2 size={14} /> Add My Business
              </button>
            </div>
          </div>
        ) : (
          <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
            {ideas.map(idea => (
              <IdeaCard key={idea.id} idea={idea} onFeedback={fetchIdeas} onStart={handleStart} startingId={startingId} />
            ))}
          </div>
        )}

      </div>
    </Layout>
  )
}
