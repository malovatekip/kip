import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Download, ExternalLink, Sparkles,
  ChevronRight, Building2, Mail, BarChart2,
  BookOpen, Loader2, CheckCircle, X, Send
} from 'lucide-react'
import Layout from '../components/Layout'
import api from '../lib/api'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'all',           label: 'All Templates',  icon: BookOpen },
  { key: 'forms',         label: 'Forms',          icon: FileText },
  { key: 'letters',       label: 'Letters',        icon: Mail },
  { key: 'business_plans',label: 'Business Plans', icon: BarChart2 },
]

const TAB_DESC = {
  all:            'All available templates, forms and documents.',
  forms:          'Official government and regulatory forms — download or access from official sites.',
  letters:        'AI-generated professional letters tailored to your business.',
  business_plans: 'Full business plan PDF for bank, CDF, CEEC, and DBZ applications.',
}

const COLOR_MAP = {
  '#1B6EF3': { bg: 'rgba(27,110,243,0.1)', border: 'rgba(27,110,243,0.3)' },
  '#00D4B1': { bg: 'rgba(0,212,177,0.1)',  border: 'rgba(0,212,177,0.3)' },
  '#F5A623': { bg: 'rgba(245,166,35,0.1)', border: 'rgba(245,166,35,0.3)' },
  '#00E676': { bg: 'rgba(0,230,118,0.1)',  border: 'rgba(0,230,118,0.3)' },
  '#4B9EFF': { bg: 'rgba(75,158,255,0.1)', border: 'rgba(75,158,255,0.3)' },
}

/* ── Letter generation modal ─────────────────────────────── */
function LetterModal({ template, plans, onClose }) {
  const [planId, setPlanId]       = useState(plans[0]?.id || '')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount]       = useState('')
  const [notes, setNotes]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [letter, setLetter]       = useState(null)

  const generate = async () => {
    setLoading(true)
    try {
      const { data } = await api.post('/templates/generate-letter', {
        prompt_type: template.prompt_type,
        plan_id:     planId || null,
        recipient:   recipient || null,
        amount:      amount   || null,
        notes:       notes    || null,
      })
      setLetter(data.letter_text)
    } catch {
      toast.error('Letter generation failed.')
    } finally {
      setLoading(false) }
  }

  const copy = () => {
    navigator.clipboard.writeText(letter)
    toast.success('Copied to clipboard!')
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(4,12,24,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: '#fff' }}>{template.title}</h2>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{template.description}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          {!letter ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {plans.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 7 }}>For which business?</label>
                  <select value={planId} onChange={e => setPlanId(e.target.value)} className="kip-input" style={{ fontSize: 13 }}>
                    <option value="">General (no specific business)</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 7 }}>Addressed to</label>
                <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder='e.g. "The Loans Officer, Zanaco Bank"' className="kip-input" style={{ fontSize: 13 }} />
              </div>
              {template.prompt_type === 'loan_request_letter' && (
                <div>
                  <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 7 }}>Amount requested</label>
                  <input value={amount} onChange={e => setAmount(e.target.value)} placeholder='e.g. "K50,000"' className="kip-input" style={{ fontSize: 13 }} />
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 7 }}>Additional context <span style={{ color: 'var(--faint)' }}>(optional)</span></label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder='Any specific points to include...' className="kip-input" rows={3} style={{ resize: 'none', fontSize: 13 }} />
              </div>
              <button onClick={generate} disabled={loading} className="kip-btn kip-btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 14 }}>
                {loading ? <><Loader2 size={16} style={{ animation: 'spinSlow 0.8s linear infinite' }} /> Generating…</> : <><Sparkles size={15} /> Generate Letter</>}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 18, marginBottom: 14, whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
                {letter}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={copy} className="kip-btn kip-btn-primary" style={{ flex: 1, fontSize: 13 }}>Copy to Clipboard</button>
                <button onClick={() => setLetter(null)} className="kip-btn kip-btn-ghost" style={{ fontSize: 13 }}>Regenerate</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Template card ───────────────────────────────────────── */
function TemplateCard({ template, plans, onGeneratePlan, generating }) {
  const [showModal, setShowModal] = useState(false)
  const [planId, setPlanId]       = useState(plans[0]?.id || '')
  const colors = COLOR_MAP[template.color] || COLOR_MAP['#1B6EF3']
  const isGen   = template.type === 'generate' || template.type === 'generate_plan' || template.type === 'generate_plan_short'
  const isLink  = template.type === 'link' || template.type === 'download'

  return (
    <>
      {showModal && template.type === 'generate' && (
        <LetterModal template={template} plans={plans} onClose={() => setShowModal(false)} />
      )}

      <div style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
        border: `1px solid ${colors.border}`,
        borderRadius: 16, padding: 20,
        transition: 'all 0.2s ease',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileText size={18} style={{ color: template.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: '#fff', marginBottom: 3 }}>
              {template.title}
            </div>
            {template.institution && (
              <span style={{
                fontSize: 10, fontFamily: 'Syne', fontWeight: 700,
                color: template.color, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {template.institution}
              </span>
            )}
          </div>
          {isGen && (
            <div style={{ fontSize: 10, fontFamily: 'Syne', fontWeight: 700, color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              <Sparkles size={11} /> AI
            </div>
          )}
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
          {template.description}
        </p>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {template.tags.slice(0,3).map(tag => (
            <span key={tag} style={{
              fontSize: 10, fontWeight: 600, fontFamily: 'Syne',
              padding: '2px 8px', borderRadius: 20,
              background: colors.bg, color: template.color, border: `1px solid ${colors.border}`,
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Business plan selector */}
        {(template.type === 'generate_plan' || template.type === 'generate_plan_short') && plans.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontFamily: 'Syne', fontWeight: 600, marginBottom: 5 }}>Select business</label>
            <select value={planId} onChange={e => setPlanId(e.target.value)} className="kip-input" style={{ fontSize: 12, padding: '8px 12px' }}>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        {/* Action */}
        <div style={{ marginTop: 'auto' }}>
          {isLink && (
            <a href={template.url} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '10px 0', borderRadius: 10,
                fontFamily: 'Syne', fontWeight: 600, fontSize: 12,
                color: template.color,
                background: colors.bg, border: `1px solid ${colors.border}`,
                textDecoration: 'none', transition: 'all 0.2s ease',
              }}>
              <ExternalLink size={13} /> Access Form
            </a>
          )}

          {template.type === 'generate' && (
            <button onClick={() => setShowModal(true)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '10px 0', borderRadius: 10, cursor: 'pointer',
              fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: template.color,
              background: colors.bg, border: `1px solid ${colors.border}`, transition: 'all 0.2s ease',
            }}>
              <Sparkles size={13} /> Generate Letter
            </button>
          )}

          {(template.type === 'generate_plan' || template.type === 'generate_plan_short') && (
            plans.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>
                Start a business first to generate a plan
              </div>
            ) : (
              <button
                onClick={() => onGeneratePlan(parseInt(planId), template.id)}
                disabled={generating === template.id}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '10px 0', borderRadius: 10, cursor: generating ? 'not-allowed' : 'pointer',
                  fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: '#fff',
                  background: generating === template.id ? 'rgba(245,166,35,0.2)' : 'linear-gradient(135deg, var(--blue), var(--mid))',
                  border: 'none', transition: 'all 0.2s ease',
                  opacity: generating && generating !== template.id ? 0.5 : 1,
                }}>
                {generating === template.id
                  ? <><Loader2 size={13} style={{ animation: 'spinSlow 0.8s linear infinite' }} /> Generating PDF…</>
                  : <><Download size={13} /> Download Business Plan PDF</>
                }
              </button>
            )
          )}
        </div>
      </div>
    </>
  )
}

/* ── Main page ───────────────────────────────────────────── */
export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [templates, setTemplates] = useState([])
  const [plans,     setPlans]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [generating,setGenerating]= useState(null)

  useEffect(() => {
    api.get('/templates/list')
      .then(r => { setTemplates(r.data.templates); setPlans(r.data.user_plans) })
      .catch(() => toast.error('Could not load templates.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = activeTab === 'all'
    ? templates
    : templates.filter(t => t.category === activeTab)

  const handleGeneratePlan = async (planId, templateId) => {
    if (!planId) { toast.error('Select a business first.'); return }
    setGenerating(templateId)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}/templates/generate-plan/${planId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('kip_token') || localStorage.getItem('token') || localStorage.getItem('access_token')}`,
          }
        }
      )
      if (!response.ok) throw new Error('Generation failed')
      const blob = await response.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `KIP_BusinessPlan.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Business plan PDF downloaded!')
    } catch {
      toast.error('Could not generate PDF. Try again.')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 26, color: '#fff', marginBottom: 6 }}>
            Templates & Documents
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 560, lineHeight: 1.65 }}>
            Official government forms, AI-generated letters, and professional business plans ready for banks, CDF, and CEEC.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: 24 }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '10px 20px', fontFamily: 'Syne', fontWeight: 600, fontSize: 13,
                color: active ? 'var(--blue-bright)' : 'var(--muted)',
                borderBottom: active ? '2px solid var(--blue-bright)' : '2px solid transparent',
                background: 'none', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: -1,
                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
              }}>
                <Icon size={14} /> {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab description */}
        <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 20, fontStyle: 'italic' }}>
          {TAB_DESC[activeTab]}
        </p>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
            {[0,1,2,3,4,5].map(i => <div key={i} className="shimmer-load" style={{ height: 220, borderRadius: 16 }} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
            {filtered.map(t => (
              <TemplateCard key={t.id} template={t} plans={plans}
                onGeneratePlan={handleGeneratePlan} generating={generating} />
            ))}
          </div>
        )}

        {/* No active businesses notice */}
        {!loading && plans.length === 0 && (activeTab === 'business_plans' || activeTab === 'all') && (
          <div style={{
            marginTop: 20, padding: '14px 18px', borderRadius: 12,
            background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 13, color: 'var(--gold)' }}>
              💡 Accept a business idea and click <strong>Start Business</strong> on the Ideas page to unlock business plan generation.
            </span>
          </div>
        )}

      </div>
    </Layout>
  )
}
