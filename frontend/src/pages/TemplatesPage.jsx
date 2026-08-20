import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import {
  FileText, ExternalLink, Sparkles, Mail, BarChart2,
  BookOpen, Loader2, X, Download, CheckCircle, Search,
  Landmark, Rocket
} from 'lucide-react'
import Layout from '../components/Layout'
import RotatingWords from '../components/RotatingWords'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { STARTUP_FORMS, AUTHORITIES } from '../data/startupData'
import { useT } from '../context/TranslationContext'

/* Tab definitions — short label for mobile. `label`/`short` are English
   fallbacks; `labelKey`/`shortKey` are the i18n keys used for display. */
const TABS = [
  { key: 'all',            label: 'All',          short: 'All',      labelKey: 'templates.tab_all',            shortKey: 'templates.tab_all_short',            icon: BookOpen   },
  { key: 'forms',          label: 'Forms',         short: 'Forms',    labelKey: 'templates.tab_forms',          shortKey: 'templates.tab_forms_short',          icon: FileText   },
  { key: 'letters',        label: 'Letters',       short: 'Letters',  labelKey: 'templates.tab_letters',        shortKey: 'templates.tab_letters_short',        icon: Mail       },
  { key: 'business_plans', label: 'Business Plans',short: 'Plans',    labelKey: 'templates.tab_business_plans', shortKey: 'templates.tab_business_plans_short', icon: BarChart2  },
  { key: 'startup',        label: 'Startup & Registration', short: 'Startup', labelKey: 'templates.tab_startup', shortKey: 'templates.tab_startup_short', icon: Rocket },
]

const COLOR_MAP = {
  '#1B6EF3': { bg: 'rgba(27,110,243,0.1)',  border: 'rgba(27,110,243,0.3)'  },
  '#00D4B1': { bg: 'rgba(0,212,177,0.1)',   border: 'rgba(0,212,177,0.3)'   },
  '#F5A623': { bg: 'rgba(245,166,35,0.1)',  border: 'rgba(245,166,35,0.3)'  },
  '#00E676': { bg: 'rgba(0,230,118,0.1)',   border: 'rgba(0,230,118,0.3)'   },
  '#4B9EFF': { bg: 'rgba(75,158,255,0.1)',  border: 'rgba(75,158,255,0.3)'  },
  '#2B7FFF': { bg: 'rgba(43,127,255,0.1)',  border: 'rgba(43,127,255,0.3)'  },
}

function getColors(color) {
  if (COLOR_MAP[color]) return COLOR_MAP[color]
  return { bg: `${color}1A`, border: `${color}4D` }
}

/* ── Letter modal (existing AI letter generation ) ──────────────── */
function LetterModal({ template, plans, onClose }) {
  const { t } = useT()
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
    } catch { toast.error(t('templates.letter_generation_failed')) }
    finally  { setLoading(false) }
  }

  const copy = () => {
    navigator.clipboard.writeText(letter)
    toast.success(t('templates.copied'))
  }

  return createPortal((
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(4,12,24,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0' }}
      onClick={onClose}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 640, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text)', margin: 0 }}>{template.title}</h2>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>{template.description}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 18, paddingBottom: 'calc(18px + env(safe-area-inset-bottom,0px))' }}>
          {!letter ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {plans.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{t('templates.for_which_business')}</label>
                  <select value={planId} onChange={e => setPlanId(e.target.value)} className="kip-input" style={{ fontSize: 13 }}>
                    <option value="">{t('templates.general_option')}</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{t('templates.addressed_to')}</label>
                <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder={t('templates.addressed_to_placeholder')} className="kip-input" style={{ fontSize: 13 }} />
              </div>
              {template.prompt_type === 'loan_request_letter' && (
                <div>
                  <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{t('templates.amount_requested')}</label>
                  <input value={amount} onChange={e => setAmount(e.target.value)} placeholder={t('templates.amount_requested_placeholder')} className="kip-input" style={{ fontSize: 13 }} />
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{t('templates.additional_context')} <span style={{ color: 'var(--faint)' }}>({t('templates.optional')})</span></label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('templates.additional_context_placeholder')} className="kip-input" rows={3} style={{ resize: 'none', fontSize: 13 }} />
              </div>
              <button onClick={generate} disabled={loading} className="kip-btn kip-btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 14 }}>
                {loading ? <><Loader2 size={16} style={{ animation: 'spinSlow 0.8s linear infinite' }} /> {t('templates.generating')}</> : <><Sparkles size={15} /> {t('templates.generate_letter')}</>}
              </button>
            </div>
          ) : (
            <div>
              <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 12, whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
                {letter}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={copy} className="kip-btn kip-btn-primary" style={{ flex: 1, fontSize: 13 }}>{t('templates.copy_to_clipboard')}</button>
                <button onClick={() => setLetter(null)} className="kip-btn kip-btn-ghost" style={{ fontSize: 13 }}>{t('templates.regenerate')}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ), document.body)
}

/* ── NEW: Government / Startup form detail modal ─────────────────────────── */
function GovFormModal({ form, onClose }) {
  const { t } = useT()
  const authority = AUTHORITIES[form.authority] || {}
  return createPortal((
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(4,12,24,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
          background: `${form.color}0D`,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: `${form.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Landmark size={18} style={{ color: form.color }} />
              </div>
              <div>
                <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text)', margin: 0, marginBottom: 3 }}>{form.name}</h2>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{form.full_name}</p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', flexShrink: 0 }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {t('templates.purpose')}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, margin: 0 }}>{form.purpose}</p>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {t('templates.required_for')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.required_for.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8 }}>
                  <CheckCircle size={13} style={{ color: form.color, flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{r}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            padding: '14px 16px', borderRadius: 12, marginBottom: 18,
            background: 'var(--input-bg)', border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {t('templates.issuing_authority')}
            </div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: form.color, marginBottom: 4 }}>
              {authority.full_name || form.institution}
            </div>
            {authority.phone && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>📞 {authority.phone}</div>
            )}
            {authority.email && authority.email !== 'N/A — visit in person' && (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>✉ {authority.email}</div>
            )}
          </div>

          {/* How to get — shown on Articles of Association and any form with this field */}
          {form.how_to_get && form.how_to_get.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                {t('templates.how_to_obtain')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {form.how_to_get.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: form.color, flexShrink: 0, marginTop: 6 }} />
                    <span style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6 }}>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key clauses — Articles of Association specific */}
          {form.key_clauses && form.key_clauses.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                {t('templates.key_clauses')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {form.key_clauses.map((clause, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 7, padding: '7px 10px',
                    background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8,
                  }}>
                    <CheckCircle size={11} style={{ color: form.color, flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 11.5, color: 'var(--text)', lineHeight: 1.5 }}>{clause}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{
            display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 10,
            background: 'var(--blue-dim)', border: '1px solid rgba(43,127,255,0.2)',
          }}>
            <Rocket size={14} style={{ color: 'var(--blue-bright)', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
              {t('templates.see_form_in_context')}{' '}
              <a href="/startup" style={{ color: 'var(--blue-bright)', fontWeight: 600 }}>{t('templates.startup_registration_roadmap')}</a>.
            </p>
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <a href={form.url} target="_blank" rel="noopener noreferrer"
            className="kip-btn kip-btn-primary" style={{ width: '100%', padding: '12px 0', fontSize: 14, textDecoration: 'none' }}>
            <ExternalLink size={15} /> {t('templates.visit_to_access_form', { institution: form.institution })}
          </a>
          <p style={{ fontSize: 10.5, color: 'var(--faint)', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
            {t('templates.gov_link_disclaimer')}
          </p>
        </div>
      </div>
    </div>
  ), document.body)
}

/* ── NEW: Government / Startup form card ─────────────────────────────────── */
function GovFormCard({ form, onOpen }) {
  const { t } = useT()
  const colors = getColors(form.color)
  return (
    <div className="kip-card" style={{
      border: `1px solid ${colors.border}`, borderRadius: 16,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Landmark size={16} style={{ color: form.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)', lineHeight: 1.3, marginBottom: 2 }}>
            {form.name}
          </div>
          <span style={{ fontSize: 10, fontFamily: 'Syne', fontWeight: 700, color: form.color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {form.institution}
          </span>
        </div>
        <span style={{ fontSize: 9, fontFamily: 'Syne', fontWeight: 800, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid rgba(232,151,62,0.25)', borderRadius: 20, padding: '2px 7px', flexShrink: 0 }}>
          {t('templates.gov_badge')}
        </span>
      </div>

      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {form.purpose}
      </p>

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {form.tags?.slice(0, 3).map(tag => (
          <span key={tag} style={{ fontSize: 10, fontWeight: 600, fontFamily: 'Syne', padding: '2px 8px', borderRadius: 20, background: colors.bg, color: form.color, border: `1px solid ${colors.border}` }}>
            {tag}
          </span>
        ))}
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button onClick={() => onOpen(form)} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '10px 0', borderRadius: 10, cursor: 'pointer',
          fontFamily: 'Syne', fontWeight: 600, fontSize: 12,
          color: form.color, background: colors.bg, border: `1px solid ${colors.border}`,
        }}>
          <FileText size={12} /> {t('templates.view_form_details')}
        </button>
      </div>
    </div>
  )
}

/* ── Template card (existing AI letters / business plans) ──────── */
function TemplateCard({ template, plans, onGeneratePlan, generating }) {
  const { t } = useT()
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
      <div className="kip-card" style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: '16px', display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={16} style={{ color: template.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)', lineHeight: 1.3, marginBottom: 2 }}>
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
              {t('templates.ai_badge')}
            </span>
          )}
        </div>

        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, margin: 0 }}>
          {template.description}
        </p>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {template.tags?.slice(0, 3).map(tag => (
            <span key={tag} style={{ fontSize: 10, fontWeight: 600, fontFamily: 'Syne', padding: '2px 8px', borderRadius: 20, background: colors.bg, color: template.color, border: `1px solid ${colors.border}` }}>
              {tag}
            </span>
          ))}
        </div>

        {isPlan && plans.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', fontFamily: 'Syne', fontWeight: 600, marginBottom: 5 }}>{t('templates.select_business')}</label>
            <select value={planId} onChange={e => setPlanId(e.target.value)} className="kip-input" style={{ fontSize: 12, padding: '8px 12px' }}>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div style={{ marginTop: 'auto' }}>
          {isLink && (
            <a href={template.url} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 0', borderRadius: 10, textDecoration: 'none',
              fontFamily: 'Syne', fontWeight: 600, fontSize: 12,
              color: template.color, background: colors.bg, border: `1px solid ${colors.border}`,
            }}>
              <ExternalLink size={12} /> {t('templates.access_form')}
            </a>
          )}

          {isGen && (
            <button onClick={() => setShowModal(true)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 0', borderRadius: 10, cursor: 'pointer',
              fontFamily: 'Syne', fontWeight: 600, fontSize: 12,
              color: template.color, background: colors.bg, border: `1px solid ${colors.border}`,
            }}>
              <Sparkles size={12} /> {t('templates.generate_letter')}
            </button>
          )}

          {isPlan && (
            plans.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--faint)', textAlign: 'center', margin: 0 }}>{t('templates.start_business_first')}</p>
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
                  ? <><Loader2 size={12} style={{ animation: 'spinSlow 0.8s linear infinite' }} /> {t('templates.generating')}</>
                  : <><Download size={12} /> {t('templates.download_pdf')}</>
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
  const { t, tList } = useT()
  const [searchParams]      = useSearchParams()
  const initialFilter       = searchParams.get('filter')
  const [activeTab,  setActiveTab]  = useState(initialFilter === 'startup' ? 'startup' : 'all')
  const [templates,  setTemplates]  = useState([])
  const [plans,      setPlans]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [generating, setGenerating] = useState(null)
  const [query,       setQuery]      = useState('')
  const [govFormOpen, setGovFormOpen] = useState(null)

  useEffect(() => {
    api.get('/templates/list')
      .then(r => { setTemplates(r.data.templates || []); setPlans(r.data.user_plans || []) })
      .catch(() => toast.error(t('templates.load_failed')))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (initialFilter === 'startup') setActiveTab('startup')
  }, [initialFilter])

  const allItems = activeTab === 'startup' || activeTab === 'all'
    ? [...templates, ...STARTUP_FORMS.map(f => ({ ...f, _isGovForm: true }))]
    : templates

  const filteredByTab = activeTab === 'all'
    ? allItems
    : allItems.filter(t => t.category === activeTab || (activeTab === 'startup' && t._isGovForm))

  const filtered = query.trim()
    ? filteredByTab.filter(t => {
        const haystack = [
          t.title, t.name, t.full_name, t.description, t.purpose,
          ...(t.tags || []),
        ].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(query.trim().toLowerCase())
      })
    : filteredByTab

  const handleGeneratePlan = async (planId, templateId) => {
    if (!planId) { toast.error(t('templates.select_business_first')); return }
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
      toast.success(t('templates.pdf_downloaded'))
    } catch { toast.error(t('templates.pdf_generation_failed')) }
    finally { setGenerating(null) }
  }

  return (
    <Layout>
      {govFormOpen && (
        <GovFormModal form={govFormOpen} onClose={() => setGovFormOpen(null)} />
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px', position: 'relative', zIndex: 1 }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 5 }}>
            {t('templates.title')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            <RotatingWords words={tList('templates.subtitle_items')} />
          </p>
        </div>

        <div style={{ position: 'relative', marginBottom: 18 }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('templates.search_placeholder')}
            className="kip-input"
            style={{ paddingLeft: 38, fontSize: 13 }}
          />
        </div>

        <div style={{
          display: 'flex',
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          borderBottom: '1px solid var(--border)',
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
                <span className="tab-label-full">{t(tab.labelKey)}</span>
                <span className="tab-label-short" style={{ display: 'none' }}>{t(tab.shortKey)}</span>
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

        {activeTab === 'startup' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            padding: '14px 18px', borderRadius: 14, marginBottom: 18,
            background: 'linear-gradient(135deg, rgba(43,127,255,0.1), rgba(0,240,200,0.06))',
            border: '1px solid rgba(43,127,255,0.25)',
          }}>
            <Rocket size={18} style={{ color: 'var(--blue-bright)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                {t('templates.official_forms_banner')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {t('templates.official_forms_desc')}
              </div>
            </div>
            <a href="/startup" className="kip-btn kip-btn-primary" style={{ fontSize: 12, padding: '8px 16px', flexShrink: 0, textDecoration: 'none' }}>
              {t('templates.go_to_startup_guide')}
            </a>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
            {[0,1,2,3,4,5].map(i => <div key={i} className="shimmer-load" style={{ height: 200, borderRadius: 16 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="kip-card" style={{ padding: '50px 24px', textAlign: 'center' }}>
            <Search size={32} style={{ color: 'var(--faint)', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
              {query ? t('templates.no_documents_found_query', { query }) : t('templates.no_documents_found')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,280px),1fr))', gap: 14 }}>
            {filtered.map(t => (
              t._isGovForm
                ? <GovFormCard key={t.id} form={t} onOpen={setGovFormOpen} />
                : <TemplateCard key={t.id} template={t} plans={plans} onGeneratePlan={handleGeneratePlan} generating={generating} />
            ))}
          </div>
        )}

        {!loading && plans.length === 0 && (activeTab === 'business_plans' || activeTab === 'all') && (
          <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.22)', fontSize: 13, color: 'var(--gold)' }}>
            💡 {t('templates.accept_idea_hint_prefix')} <strong>{t('templates.accept_idea_hint_strong')}</strong> {t('templates.accept_idea_hint_suffix')}
          </div>
        )}

      </div>
    </Layout>
  )
}
