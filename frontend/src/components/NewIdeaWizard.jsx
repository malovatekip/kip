import React, { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Lightbulb, MapPin, Loader2, Sparkles, LocateFixed } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import MultiSelectChips from './MultiSelectChips'
import { useT } from '../context/TranslationContext'

const SKILL_OPTIONS = [
  'selling_and_marketing', 'operations_and_management', 'digital_and_creative',
  'food_and_catering', 'agriculture', 'trades_and_repairs',
  'services_and_care', 'finance_and_administration', 'transport_and_logistics',
]

const ASSET_GROUPS = [
  { key: 'physical', skills: ['vehicle', 'land', 'shop_space', 'furniture', 'equipment', 'tools', 'storage', 'stock'] },
  { key: 'digital',  skills: ['smartphone', 'laptop', 'internet_access', 'website', 'social_media_following', 'payment_tools'] },
  { key: 'business', skills: ['business_registration', 'license', 'supplier_contacts', 'existing_customers', 'brand', 'staff'] },
]

const TOTAL_SLIDES = 4

export default function NewIdeaWizard({ onClose, onGenerated }) {
  const { t } = useT()
  const skillLabel = (key) => t(`new_idea_wizard.skill_${key}`)
  const assetLabel = (key) => t(`new_idea_wizard.asset_${key}`)

  const [step, setStep] = useState(0) // 0-3 slides, then 'submitting' | 'result'
  const [phase, setPhase] = useState('form') // 'form' | 'submitting' | 'result'

  // Slide 1 — capital
  const [capitalInput, setCapitalInput] = useState('')
  const [showLoanPrompt, setShowLoanPrompt] = useState(false)
  const [loanExpected, setLoanExpected] = useState(null) // true | false | null
  const [loanMin, setLoanMin] = useState('')
  const [loanMax, setLoanMax] = useState('')
  const [capitalResolved, setCapitalResolved] = useState(false) // true once slide 1 is answered (with or without a number)

  // Slide 2 — location
  const [location, setLocation] = useState('')
  const [locating, setLocating] = useState(false)

  // Slide 3 & 4
  const [skills, setSkills] = useState([])
  const [assets, setAssets] = useState([])

  const [results, setResults] = useState([])

  const handleSkipCapital = () => setShowLoanPrompt(true)

  const resolveLoanAnswer = (expectsLoan) => {
    setLoanExpected(expectsLoan)
    setCapitalInput('')
    setCapitalResolved(true)
    setShowLoanPrompt(false)
  }

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error(t('new_idea_wizard.geolocation_unsupported'))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await api.get('/ideas/nearest-town', {
            params: { lat: pos.coords.latitude, lon: pos.coords.longitude },
          })
          setLocation(`${data.town.replace(/\b\w/g, c => c.toUpperCase())}, ${data.province}`)
        } catch {
          toast.error(t('new_idea_wizard.location_lookup_failed'))
        } finally {
          setLocating(false)
        }
      },
      () => { toast.error(t('new_idea_wizard.location_permission_denied')); setLocating(false) },
    )
  }

  const canAdvance = () => {
    if (step === 0) return capitalInput.trim() !== '' || capitalResolved
    if (step === 1) return location.trim() !== ''
    return true
  }

  const next = () => {
    if (!canAdvance()) return
    if (step < TOTAL_SLIDES - 1) setStep(step + 1)
    else handleSubmit()
  }
  const back = () => {
    if (step > 0) setStep(step - 1)
  }

  const handleSubmit = async () => {
    setPhase('submitting')
    const capital_available = capitalResolved ? null : (capitalInput.trim() === '' ? null : parseFloat(capitalInput))
    try {
      const { data } = await api.post('/ideas/generate', {
        capital_available,
        capital_skip_loan_expected: !!loanExpected,
        capital_loan_amount_min: loanMin ? parseFloat(loanMin) : null,
        capital_loan_amount_max: loanMax ? parseFloat(loanMax) : null,
        location,
        skills,
        assets,
      })
      setResults(data.ideas || [])
      setPhase('result')
    } catch (err) {
      toast.error(err.response?.data?.detail || t('new_idea_wizard.generate_failed'))
      setPhase('form')
    }
  }

  const finish = () => {
    onGenerated?.()
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="animate-slide-up"
        style={{
          background: 'var(--surface-1)', border: '1px solid var(--border)',
          borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 620,
          maxHeight: '94vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lightbulb size={17} style={{ color: 'var(--blue-bright)' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                {t('new_idea_wizard.title')}
              </div>
              {phase === 'form' && (
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {t('new_idea_wizard.step_label', { current: step + 1, total: TOTAL_SLIDES })}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Progress dots */}
        {phase === 'form' && (
          <div style={{ display: 'flex', gap: 6, padding: '12px 20px 0' }}>
            {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: 4,
                background: i <= step ? 'var(--blue)' : 'var(--surface-3)',
              }} />
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {phase === 'form' && step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>
                  {t('new_idea_wizard.capital_question')}
                </label>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>{t('new_idea_wizard.capital_helper')}</p>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--gold)', fontFamily: 'Syne', fontWeight: 700 }}>K</span>
                  <input
                    type="number" min="0" value={capitalInput}
                    onChange={e => { setCapitalInput(e.target.value); setCapitalResolved(false); setShowLoanPrompt(false) }}
                    placeholder="0" className="kip-input" style={{ fontSize: 15, paddingLeft: 26 }}
                  />
                </div>
              </div>

              {!capitalResolved && (
                <button onClick={handleSkipCapital} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}>
                  {t('new_idea_wizard.capital_skip')}
                </button>
              )}

              {showLoanPrompt && (
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
                  <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 10 }}>{t('new_idea_wizard.loan_question')}</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <button onClick={() => resolveLoanAnswer(true)} className="kip-btn kip-btn-primary" style={{ flex: 1, padding: '8px 0', fontSize: 12.5 }}>{t('common.yes')}</button>
                    <button onClick={() => resolveLoanAnswer(false)} className="kip-btn kip-btn-ghost" style={{ flex: 1, padding: '8px 0', fontSize: 12.5 }}>{t('common.no')}</button>
                  </div>
                  {loanExpected && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <input type="number" min="0" value={loanMin} onChange={e => setLoanMin(e.target.value)}
                        placeholder={t('new_idea_wizard.loan_min_placeholder')} className="kip-input" style={{ fontSize: 13 }} />
                      <input type="number" min="0" value={loanMax} onChange={e => setLoanMax(e.target.value)}
                        placeholder={t('new_idea_wizard.loan_max_placeholder')} className="kip-input" style={{ fontSize: 13 }} />
                    </div>
                  )}
                </div>
              )}

              {capitalResolved && (
                <div style={{ fontSize: 12.5, color: 'var(--blue-bright)', background: 'var(--blue-dim)', border: '1px solid rgba(43,127,255,0.2)', borderRadius: 10, padding: '10px 12px' }}>
                  {t('new_idea_wizard.capital_limitless_confirmed')}
                </div>
              )}
            </div>
          )}

          {phase === 'form' && step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>
                  {t('new_idea_wizard.location_question')}
                </label>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>{t('new_idea_wizard.location_helper')}</p>
                <div style={{ position: 'relative' }}>
                  <MapPin size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input value={location} onChange={e => setLocation(e.target.value)}
                    placeholder={t('new_idea_wizard.location_placeholder')} className="kip-input" style={{ fontSize: 14, paddingLeft: 34 }} />
                </div>
              </div>
              <button onClick={useMyLocation} disabled={locating} className="kip-btn kip-btn-ghost" style={{ alignSelf: 'flex-start', fontSize: 12.5, padding: '8px 14px' }}>
                {locating
                  ? <><Loader2 size={13} style={{ animation: 'spinSlow 0.8s linear infinite' }} /> {t('new_idea_wizard.locating')}</>
                  : <><LocateFixed size={13} /> {t('new_idea_wizard.use_my_location')}</>
                }
              </button>
            </div>
          )}

          {phase === 'form' && step === 2 && (
            <div>
              <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>
                {t('new_idea_wizard.skills_question')}
              </label>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>{t('new_idea_wizard.skills_helper')}</p>
              <MultiSelectChips
                options={SKILL_OPTIONS.map(key => ({ value: key, label: skillLabel(key) }))}
                selected={skills}
                onChange={setSkills}
              />
            </div>
          )}

          {phase === 'form' && step === 3 && (
            <div>
              <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>
                {t('new_idea_wizard.assets_question')}
              </label>
              <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>{t('new_idea_wizard.assets_helper')}</p>
              {ASSET_GROUPS.map(group => (
                <MultiSelectChips
                  key={group.key}
                  groupLabel={t(`new_idea_wizard.asset_group_${group.key}`)}
                  options={group.skills.map(key => ({ value: key, label: assetLabel(key) }))}
                  selected={assets}
                  onChange={setAssets}
                />
              ))}
            </div>
          )}

          {phase === 'submitting' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'linear-gradient(135deg, var(--blue), var(--teal))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 18px', boxShadow: 'var(--glow-blue)',
              }}>
                <Loader2 size={24} color="#fff" style={{ animation: 'spinSlow 0.8s linear infinite' }} />
              </div>
              <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>
                {t('new_idea_wizard.generating_title')}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>
                {t('new_idea_wizard.generating_desc')}
              </p>
            </div>
          )}

          {phase === 'result' && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                padding: '10px 14px', borderRadius: 12,
                background: 'var(--green-dim)', border: '1px solid rgba(26,224,110,0.25)',
              }}>
                <Sparkles size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontFamily: 'Syne', fontWeight: 700, color: 'var(--green)' }}>
                  {t('new_idea_wizard.results_ready', { count: results.length })}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.map(idea => (
                  <div key={idea.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{idea.idea_name}</div>
                      <div style={{ flexShrink: 0, fontFamily: 'Syne', fontWeight: 800, fontSize: 13, color: 'var(--blue-bright)' }}>
                        {idea.viability_score.toFixed(1)}/10
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, margin: 0 }}>{idea.idea_summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === 'form' && (
          <div style={{ display: 'flex', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            {step > 0 && (
              <button onClick={back} className="kip-btn kip-btn-ghost" style={{ padding: '13px 18px', fontSize: 14 }}>
                <ChevronLeft size={15} />
              </button>
            )}
            <button onClick={next} disabled={!canAdvance()} className="kip-btn kip-btn-primary" style={{ flex: 1, padding: '13px 0', fontSize: 14, opacity: canAdvance() ? 1 : 0.5 }}>
              {step < TOTAL_SLIDES - 1 ? <>{t('common.next')} <ChevronRight size={15} /></> : t('new_idea_wizard.generate_button')}
            </button>
          </div>
        )}
        {phase === 'result' && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <button onClick={finish} className="kip-btn kip-btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 14 }}>
              {t('common.done')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
