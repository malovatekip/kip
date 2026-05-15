import React, { useState, useEffect } from 'react'
import {
  FileText, ExternalLink, Sparkles, Mail, BarChart2,
  BookOpen, Loader2, X, Download, CheckCircle
} from 'lucide-react'
import Layout from '../components/Layout'
import api from '../lib/api'
import toast from 'react-hot-toast'

/* Tab definitions — short label for mobile */
const TABS = [
  { key: 'all',            label: 'All',          short: 'All',      icon: BookOpen   },
  { key: 'forms',          label: 'Forms',         short: 'Forms',    icon: FileText   },
  { key: 'letters',        label: 'Letters',       short: 'Letters',  icon: Mail       },
  { key: 'business_plans', label: 'Business Plans',short: 'Plans',    icon: BarChart2  },
]

const COLOR_MAP = {
  '#1B6EF3': { bg: 'rgba(27,110,243,0.1)',  border: 'rgba(27,110,243,0.3)'  },
  '#00D4B1': { bg: 'rgba(0,212,177,0.1)',   border: 'rgba(0,212,177,0.3)'   },
  '#F5A623': { bg: 'rgba(245,166,35,0.1)',  border: 'rgba(245,166,35,0.3)'  },
  '#00E676': { bg: 'rgba(0,230,118,0.1)',   border: 'rgba(0,230,118,0.3)'   },
  '#4B9EFF': { bg: 'rgba(75,158,255,0.1)',  border: 'rgba(75,158,255,0.3)'  },
  '#2B7FFF': { bg: 'rgba(43,127,255,0.1)',  border: 'rgba(43,127,255,0.3)'  },
}

const getColors = (color) => COLOR_MAP[color] || COLOR_MAP['#2B7FFF']

/* ── Letter modal ──────────────────────────────────── */
function LetterModal({ template, plans, onClose }) {
  const [planId,    setPlanId]    = useState(plans[0]?.id || '')
  const [recipient, setRecipient] = useState('')
  const [amount,    setAmount]    = useState('')
  const [notes,     setNotes]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [letter,    setLetter]    = useState(null)

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
    } catch { toast.error('Letter generation failed.') }
    finally  { setLoading(false) }
  }

  const copy = () => {
    navigator.clipboard.writeText(letter)
    toast.success('Copied!')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(4,12,24,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}
      onClick={onClose}>
      <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 640, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: '#fff', margin: 0 }}>{template.title}</h2>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>{template.description}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          {!letter ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {plans.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>For which business?</label>
                  <select value={planId} onChange={e => setPlanId(e.target.value)} className="kip-input" style={{ fontSize: 13 }}>
                    <option value="">General</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Addressed to</label>
                <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder='e.g. "The Loans Officer, Zanaco"' className="kip-input" style={{ fontSize: 13 }} />
              </div>
              {template.prompt_type === 'loan_request_letter' && (
                <div>
                  <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Amount requested</label>
                  <input value={amount} onChange={e => setAmount(e.target.value)} placeholder='e.g. "K50,000"' className="kip-input" style={{ fontSize: 13 }} />
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Additional context <span style={{ color: 'var(--faint)' }}>(optional)</span></label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder='Any specific points to include...' className="kip-input" rows={3} style={{ resize: 'none', fontSize: 13 }} />
              </div>
              <button onClick={generate} disabled={loading} className="kip-btn kip-btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 14 }}>
                {loading ? <><Loader2 size={16} style={{ animation: 'spinSlow 0.8s linear infinite' }} /> Generating…</> : <><Sparkles size={15} /> Generate Letter</>}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16, marginBottom: 12, whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
                {letter}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
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

/* ── Template card ─────────────────────────────────── */
function TemplateCard({ template, plans, onGeneratePlan, generating }) {
  const [showModal, setShowModal] = useState(false)
  const [planId,    setPlanId]    = useState(plans[0]?.id || '')
  const colors = getColors(template.color)
  const isLink = template.type === 'link' || template.type === 'download'
  const isGen  = template.type === 'generate'
  const isPlan = template.type === 'generate_plan' || template.type === 'generate_plan_short'

  return (
    <>
      {showModal && isGen && (
        <LetterModal template={template} plans={plans} onClose={() => setShowModal(false)} />
      )}
      <div style={{
        background: 'linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))',
        border: `1px solid ${colors.border}`, borderRadius: 16,
        padding: '16px', display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={16} style={{ color: template.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: '#fff', lineHeight: 1.3, marginBottom: 2 }}>
              {template.title}
            </div>
            {template.institution && (
              <span style={{ fontSize: 10, fontFamily: 'Syne', fontWeight: 700, color: template.color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {template.institution}
              </span>
            )}
          </div>
          {(isGen || isPlan) && (
            <span style={{ fontSize: 9, fontFamily: 'Syne', fontWeight: 800, color: 'var(--teal)', background: 'var(--teal-dim)', border: '1px solid rgba(0,240,200,0.25)', borderRadius: 20, padding: '2px 7px', flexShrink: 0 }}>
              AI
            </span>
          )}
        </div>

        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, margin: 0 }}>
          {template.description}
        </p>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {template.tags?.slice(0, 3).map(tag => (
            <span key={tag} style={{ fontSize: 10, fontWeight: 600, fontFamily: 'Syne', padding: '2px 8px', borderRadius: 20, background: colors.bg, color: template.color, border: `1px solid ${colors.border}` }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Business selector for plan generation */}
        {isPlan && plans.length > 0 && (
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
            <a href={template.url} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 0', borderRadius: 10, textDecoration: 'none',
              fontFamily: 'Syne', fontWeight: 600, fontSize: 12,
              color: template.color, background: colors.bg, border: `1px solid ${colors.border}`,
            }}>
              <ExternalLink size={12} /> Access Form
            </a>
          )}

          {isGen && (
            <button onClick={() => setShowModal(true)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 0', borderRadius: 10, cursor: 'pointer',
              fontFamily: 'Syne', fontWeight: 600, fontSize: 12,
              color: template.color, background: colors.bg, border: `1px solid ${colors.border}`,
            }}>
              <Sparkles size={12} /> Generate Letter
            </button>
          )}

          {isPlan && (
            plans.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--faint)', textAlign: 'center', margin: 0 }}>Start a business first</p>
            ) : (
              <button onClick={() => onGeneratePlan(parseInt(planId), template.id)} disabled={generating === template.id}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '10px 0', borderRadius: 10, cursor: generating ? 'not-allowed' : 'pointer',
                  fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: '#fff',
                  background: generating === template.id ? 'rgba(245,166,35,0.2)' : 'linear-gradient(135deg,var(--blue),var(--mid))',
                  border: 'none', opacity: generating && generating !== template.id ? 0.5 : 1,
                }}>
                {generating === template.id
                  ? <><Loader2 size={12} style={{ animation: 'spinSlow 0.8s linear infinite' }} /> Generating…</>
                  : <><Download size={12} /> Download PDF</>
                }
              </button>
            )
          )}
        </div>
      </div>
    </>
  )
}

/* ── Main page ─────────────────────────────────────── */
export default function TemplatesPage() {
  const [activeTab,  setActiveTab]  = useState('all')
  const [templates,  setTemplates]  = useState([])
  const [plans,      setPlans]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [generating, setGenerating] = useState(null)

  useEffect(() => {
    api.get('/templates/list')
      .then(r => { setTemplates(r.data.templates || []); setPlans(r.data.user_plans || []) })
      .catch(() => toast.error('Could not load templates.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = activeTab === 'all' ? templates : templates.filter(t => t.category === activeTab)

  const handleGeneratePlan = async (planId, templateId) => {
    if (!planId) { toast.error('Select a business first.'); return }
    setGenerating(templateId)
    try {
      const token = localStorage.getItem('kip_token') || localStorage.getItem('token') || localStorage.getItem('access_token')
      const base  = import.meta.env.VITE_API_URL || '/api'
      const res   = await fetch(`${base}/templates/generate-plan/${planId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = 'KIP_BusinessPlan.pdf'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Business plan PDF downloaded!')
    } catch { toast.error('PDF generation failed.') }
    finally { setGenerating(null) }
  }

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 5 }}>
            Templates & Documents
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            Government forms, AI letters, and business plans for banks and CDF.
          </p>
        </div>

        {/* ── Tabs — horizontally scrollable, no overflow ── */}
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',          /* Firefox */
          msOverflowStyle: 'none',         /* IE/Edge */
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          marginBottom: 20,
          gap: 0,
        }}>
          <style>{`::-webkit-scrollbar { display: none; }`}</style>
          {TABS.map(tab => {
            const Icon   = tab.icon
            const active = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', whiteSpace: 'nowrap', flexShrink: 0,
                fontFamily: 'Syne', fontWeight: 700, fontSize: 13,
                color: active ? 'var(--blue-bright)' : 'var(--muted)',
                borderBottom: `2px solid ${active ? 'var(--blue-bright)' : 'transparent'}`,
                background: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
                border: 'none', borderBottomWidth: 2, borderBottomStyle: 'solid',
                borderBottomColor: active ? 'var(--blue-bright)' : 'transparent',
                marginBottom: -1,
              }}>
                <Icon size={14} />
                {/* Show short label on very narrow screens */}
                <span className="tab-label-full">{tab.label}</span>
                <span className="tab-label-short" style={{ display: 'none' }}>{tab.short}</span>
              </button>
            )
          })}
        </div>
        <style>{`
          @media (max-width: 400px) {
            .tab-label-full  { display: none; }
            .tab-label-short { display: inline !important; }
          }
        `}</style>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
            {[0,1,2,3,4,5].map(i => <div key={i} className="shimmer-load" style={{ height: 200, borderRadius: 16 }} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,280px),1fr))', gap: 14 }}>
            {filtered.map(t => (
              <TemplateCard key={t.id} template={t} plans={plans}
                onGeneratePlan={handleGeneratePlan} generating={generating} />
            ))}
          </div>
        )}

        {/* No businesses notice */}
        {!loading && plans.length === 0 && (activeTab === 'business_plans' || activeTab === 'all') && (
          <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.22)', fontSize: 13, color: 'var(--gold)' }}>
            💡 Accept a business idea and click <strong>Start Business</strong> to unlock plan generation.
          </div>
        )}

      </div>
    </Layout>
  )
}
