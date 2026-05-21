import React, { useEffect, useState } from 'react'
import { Lightbulb, MapPin, DollarSign, CheckCircle, XCircle,
         Clock, ThumbsUp, ThumbsDown, Rocket, ClipboardList } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import api from '../lib/api'

function IdeaCard({ idea, onFeedback, onStart, startingId }) {
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const isStarting = startingId === idea.id

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

  // Enhanced Status Logic: If a plan exists, mark as Launched
  const status = idea.plan_id
    ? { label: 'Launched', color: 'var(--gold)', bg: 'rgba(245,166,35,0.1)', border: 'rgba(245,166,35,0.25)', Icon: Rocket }
    : idea.accepted === true
    ? { label: 'Accepted', color: 'var(--green)',       bg: 'rgba(0,230,118,0.1)',  border: 'rgba(0,230,118,0.25)',  Icon: CheckCircle }
    : idea.accepted === false
    ? { label: 'Declined', color: 'var(--red)',         bg: 'rgba(255,83,112,0.1)', border: 'rgba(255,83,112,0.25)', Icon: XCircle }
    : { label: 'Pending',  color: 'var(--blue-bright)', bg: 'rgba(75,158,255,0.1)', border: 'rgba(75,158,255,0.25)', Icon: Clock }

  return (
    <div className="kip-card animate-slide-up" style={{ padding: 22 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, minWidth: 0 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(27,110,243,0.2), rgba(0,212,177,0.1))',
            border: '1px solid rgba(27,110,243,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lightbulb size={18} style={{ color: 'var(--blue-bright)' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: '#fff', lineHeight: 1.3, marginBottom: 5 }}>
              {idea.idea_name}
            </h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {idea.location && (
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={11} /> {idea.location}
                </span>
              )}
              {idea.capital_amount && (
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <DollarSign size={11} /> K{Number(idea.capital_amount).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status pill */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 600, fontFamily: 'Syne',
          letterSpacing: '0.04em', textTransform: 'uppercase',
          padding: '4px 10px', borderRadius: 20, flexShrink: 0,
          color: status.color, background: status.bg, border: `1px solid ${status.border}`,
        }}>
          <status.Icon size={10} /> {status.label}
        </span>
      </div>

      {/* Summary */}
      {idea.idea_summary && (
        <p style={{
          fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 16,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {idea.idea_summary}
        </p>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Has an active business plan → View Business */}
        {idea.plan_id && (
          <Link to={`/business/${idea.plan_id}`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 0', borderRadius: 12, textDecoration: 'none',
            fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--gold)',
            background: 'linear-gradient(135deg, rgba(245,166,35,0.12), rgba(245,166,35,0.06))',
            border: '1px solid rgba(245,166,35,0.35)',
            transition: 'all 0.2s ease',
          }}>
            <Rocket size={15} /> View Business Dashboard
          </Link>
        )}

        {/* Accepted, no plan yet → Start Business */}
        {idea.accepted === true && !idea.plan_id && (
          <button onClick={() => onStart(idea.id)} disabled={isStarting} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 0', borderRadius: 12, cursor: isStarting ? 'not-allowed' : 'pointer',
            fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--gold)',
            background: 'linear-gradient(135deg, rgba(245,166,35,0.12), rgba(245,166,35,0.06))',
            border: '1px solid rgba(245,166,35,0.35)',
            transition: 'all 0.2s ease', opacity: isStarting ? 0.65 : 1,
          }}>
            {isStarting
              ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--gold)', borderTopColor: 'transparent', animation: 'spinSlow 0.8s linear infinite' }} /> Generating Plan…</>
              : <><Rocket size={15} /> Start Business — Get Launch Plan</>
            }
          </button>
        )}

        {/* Pending → Accept / Decline */}
        {(idea.accepted === null || idea.accepted === undefined) && !idea.plan_id && (
          declining ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                rows={2} placeholder="Why are you declining? (optional)"
                className="kip-input" style={{ resize: 'none', fontSize: 13 }}
                value={reason} onChange={e => setReason(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={decline} className="kip-btn kip-btn-primary" style={{ flex: 1, padding: '9px 0', fontSize: 12 }}>Submit</button>
                <button onClick={() => setDeclining(false)} className="kip-btn kip-btn-ghost" style={{ flex: 1, padding: '9px 0', fontSize: 12 }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={accept} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'Syne',
                color: 'var(--green)', background: 'rgba(0,230,118,0.08)',
                border: '1px solid rgba(0,230,118,0.22)', transition: 'all 0.2s ease',
              }}>
                <ThumbsUp size={13} /> Accept
              </button>
              <button onClick={() => setDeclining(true)} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'Syne',
                color: 'var(--red)', background: 'rgba(255,83,112,0.08)',
                border: '1px solid rgba(255,83,112,0.22)', transition: 'all 0.2s ease',
              }}>
                <ThumbsDown size={13} /> Decline
              </button>
            </div>
          )
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 12 }}>
        {new Date(idea.created_at).toLocaleDateString('en-ZM', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
    </div>
  )
}

export default function IdeasPage() {
  const [ideas,      setIdeas]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [startingId, setStartingId] = useState(null)
  const navigate = useNavigate()

  const fetchIdeas = async () => {
    try {
      const [ideasRes, plansRes] = await Promise.all([
        api.get('/ideas/'),
        api.get('/business/my-plans').catch(() => ({ data: [] })),
      ])

      const planMap = {}
      if (Array.isArray(plansRes.data)) {
        plansRes.data.forEach(plan => {
          if (plan.idea_id) {
            planMap[plan.idea_id] = plan.id
          }
        })
      }

      setIdeas(
        (ideasRes.data || []).map(idea => ({
          ...idea,
          plan_id: planMap[idea.id] || idea.plan_id || null,
        }))
      )
    } catch (err) {
      console.error('Failed to load ideas:', err)
    }
    setLoading(false)
  }

  useEffect(() => { fetchIdeas() }, [])

  const handleStart = async (ideaId) => {
    setStartingId(ideaId)
    try {
      const { data } = await api.post('/business/start', { idea_id: ideaId })
      const planId = data.plan_id ?? data.id ?? null

      if (!planId) {
        toast.error('Plan created but ID not returned. Please refresh the page.')
        fetchIdeas()
        return
      }

      toast.success('Launch plan ready!')
      navigate(`/business/${planId}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not start. Try again.')
    } finally {
      setStartingId(null)
    }
  }

  return (
    <Layout>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 24px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 26, color: '#fff', marginBottom: 6 }}>
            My Business Ideas
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            Accept an idea then click <span style={{ color: 'var(--gold)', fontWeight: 600 }}>Start Business</span> to get your full AI-guided launch plan and daily coaching.
          </p>
        </div>

        {/* Ideas grid (Responsive minmax setup) */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 16 }}>
            {[0, 1, 2].map(i => (
              <div key={i} className="shimmer-load" style={{ height: 200, borderRadius: 16 }} />
            ))}
          </div>
        ) : ideas.length === 0 ? (
          <div className="kip-card" style={{ textAlign: 'center', padding: '56px 24px', borderStyle: 'dashed' }}>
            <Lightbulb size={48} style={{ color: 'var(--faint)', margin: '0 auto 16px', display: 'block' }} className="animate-float" />
            <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: '#fff', marginBottom: 8 }}>
              No ideas yet
            </h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              Ask KIP for your first business recommendation.
            </p>
            <Link to="/chat" className="kip-btn kip-btn-primary" style={{ fontSize: 13 }}>
              Ask KIP Now
            </Link>
          </div>
        ) : (
          <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 16 }}>
            {ideas.map(idea => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                onFeedback={fetchIdeas}
                onStart={handleStart}
                startingId={startingId}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}