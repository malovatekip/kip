import React, { useState } from 'react'
import {
  DollarSign, ChevronRight, Download, CheckCircle,
  AlertCircle, Zap, ArrowRight, Building2, Info,
} from 'lucide-react'
import { useT }           from '../context/TranslationContext'
import { useAITranslation } from '../hooks/useAITranslation'
import api   from '../lib/api'
import toast from 'react-hot-toast'

const PROVIDERS = [
  {
    id: 'ceec', name: 'CEEC', full: 'Citizens Economic Empowerment Commission',
    rate: '5% p.a.', max: 'K500,000', typeKey: 'capital_access.type_government',
    colour: 'green', descKey: 'capital_access.desc_ceec',
    requirementKeys: ['capital_access.req_zambian_citizen', 'capital_access.req_pacra_registered', 'capital_access.req_business_plan_required', 'capital_access.req_no_ceec_default'],
  },
  {
    id: 'cdf', name: 'CDF', full: 'Constituency Development Fund',
    rate: 'Grant / 0%', max: 'K20,000', typeKey: 'capital_access.type_government_grant',
    colour: 'blue', descKey: 'capital_access.desc_cdf',
    requirementKeys: ['capital_access.req_zambian_citizen', 'capital_access.req_resident_constituency', 'capital_access.req_attend_cdf_meeting', 'capital_access.req_submit_project_proposal'],
  },
  {
    id: 'dbz', name: 'DBZ', full: 'Development Bank of Zambia',
    rate: '12% p.a.', max: 'K2,000,000', typeKey: 'capital_access.type_development_bank',
    colour: 'blue', descKey: 'capital_access.desc_dbz',
    requirementKeys: ['capital_access.req_years_operation', 'capital_access.req_audited_financials', 'capital_access.req_collateral_required', 'capital_access.req_business_plan'],
  },
  {
    id: 'zanaco', name: 'ZANACO', full: 'Zambia National Commercial Bank',
    rate: '26% p.a.', max: 'K1,000,000', typeKey: 'capital_access.type_commercial_bank',
    colour: 'gold', descKey: 'capital_access.desc_zanaco',
    requirementKeys: ['capital_access.req_bank_account_months', 'capital_access.req_proof_income', 'capital_access.req_business_registration', 'capital_access.req_credit_history'],
  },
]

function ProviderCard({ provider, onSelect, selected }) {
  const { t }   = useT()
  const isSelected = selected?.id === provider.id
  const colorMap = { green: 'var(--green-500)', blue: 'var(--blue-500)', gold: 'var(--gold-500)' }
  const dimMap   = { green: 'var(--green-dim)', blue: 'var(--blue-dim)',  gold: 'var(--gold-dim)'  }
  const accent   = colorMap[provider.colour]
  const dim      = dimMap[provider.colour]

  return (
    <button onClick={() => onSelect(provider)} style={{
      display: 'flex', flexDirection: 'column', textAlign: 'left',
      padding: 'var(--space-5)', borderRadius: 'var(--radius-lg)',
      background: isSelected ? dim : 'var(--surface-1)',
      border: `1.5px solid ${isSelected ? accent : 'var(--border)'}`,
      cursor: 'pointer', transition: 'all var(--transition-base)',
      boxShadow: isSelected ? `0 4px 20px ${accent}25` : 'var(--shadow-xs)',
      position: 'relative', overflow: 'hidden',
    }}
    onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = 'var(--shadow-md)' } }}
    onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)' } }}
    >
      {isSelected && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-lg)', color: accent }}>
              {provider.name}
            </span>
            <span className={`badge badge-${provider.colour}`} style={{ fontSize: 9 }}>{t(provider.typeKey)}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{provider.full}</div>
        </div>
        {isSelected && <CheckCircle size={18} style={{ color: accent, flexShrink: 0 }} />}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-5)', marginBottom: 'var(--space-3)' }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600, letterSpacing: '0.06em' }}>{t('capital_access.interest_label')}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{provider.rate}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600, letterSpacing: '0.06em' }}>{t('capital_access.max_loan_label')}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{provider.max}</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{t(provider.descKey)}</p>
    </button>
  )
}

export default function CapitalAccessPage() {
  const { t }           = useT()
  const { translateAI } = useAITranslation()
  const [amount,     setAmount]     = useState('')
  const [purpose,    setPurpose]    = useState('')
  const [selected,   setSelected]   = useState(null)
  const [letter,     setLetter]     = useState('')
  const [generating, setGenerating] = useState(false)
  const [finding,    setFinding]    = useState(false)
  const [matches,    setMatches]    = useState(null)

  const handleFind = async () => {
    if (!amount) { toast.error(t('capital_access.error_amount_required')); return }
    setFinding(true)
    try {
      const { data } = await api.post('/capital/find', { amount: parseFloat(amount), purpose })
      setMatches(data.matches || PROVIDERS)
    } catch {
      setMatches(PROVIDERS)
    } finally { setFinding(false) }
  }

  const handleGenerateLetter = async () => {
    if (!selected) { toast.error(t('capital_access.error_source_required')); return }
    setGenerating(true)
    setLetter('')
    try {
      const { data } = await api.post('/capital/generate-letter', {
        provider: selected.id, amount, purpose,
      })
      const raw       = data.letter || data.content || ''
      const localised = await translateAI(raw)
      setLetter(localised)
      toast.success(t('capital_access.letter_generated'))
    } catch {
      toast.error(t('capital_access.error_generate_letter'))
    } finally { setGenerating(false) }
  }

  const handleDownload = () => {
    const blob = new Blob([letter], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `KIP_Application_${selected?.name || 'Letter'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="content-area page-enter">

      {/* Hero */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <span className="badge badge-green"><DollarSign size={10} /> {t('nav.capital')}</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(24px,3vw,38px)', color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 'var(--space-3)', maxWidth: 520 }}>
          {t('capital_access.title')}
        </h1>
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-muted)', maxWidth: 480, lineHeight: 'var(--leading-relaxed)' }}>
          {t('capital_access.desc')}
        </p>
      </div>

      {/* Input section */}
      <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)', maxWidth: 640 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          <div className="input-group">
            <label className="input-label">{t('capital_access.amount_label')}</label>
            <input className="input input-lg" type="number" value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={t('capital_access.amount_placeholder')} />
          </div>
          <div className="input-group">
            <label className="input-label">{t('capital_access.purpose_label')}</label>
            <input className="input input-lg" type="text" value={purpose}
              onChange={e => setPurpose(e.target.value)}
              placeholder={t('capital_access.purpose_placeholder')} />
          </div>
        </div>
        <button onClick={handleFind} disabled={finding || !amount}
          className="btn btn-primary btn-lg btn-shine" style={{ gap: 8 }}>
          {finding
            ? <><span style={{ animation: 'spin 0.8s linear infinite', display:'inline-block' }}>⟳</span> {t('capital_access.finding')}</>
            : <><Zap size={16} /> {t('capital_access.find_button')} <ArrowRight size={16} /></>
          }
        </button>
      </div>

      {/* Providers grid */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div className="section-divider" style={{ marginBottom: 'var(--space-5)' }}>
          <span>{matches ? t('capital_access.results_title') : t('capital_access.available_funding_sources')}</span>
        </div>
        <div className="grid-2" style={{ maxWidth: 900 }}>
          {PROVIDERS.map(p => (
            <ProviderCard key={p.id} provider={p} selected={selected} onSelect={setSelected} />
          ))}
        </div>
      </div>

      {/* Selected provider detail */}
      {selected && (
        <div style={{ maxWidth: 720, marginBottom: 'var(--space-8)' }}>
          <div className="card card-accent-green" style={{ padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--text-primary)', marginBottom: 4 }}>
                  {selected.full}
                </h3>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {t('capital_access.eligibility')}
                </div>
              </div>
              <Building2 size={24} style={{ color: 'var(--text-faint)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
              {selected.requirementKeys.map((reqKey, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  <CheckCircle size={14} style={{ color: 'var(--green-500)', flexShrink: 0 }} />
                  {t(reqKey)}
                </div>
              ))}
            </div>

            <button onClick={handleGenerateLetter} disabled={generating}
              className="btn btn-gold btn-lg btn-shine" style={{ gap: 8 }}>
              {generating
                ? <>{t('capital_access.generating')}</>
                : <><Zap size={15} /> {t('capital_access.generate_letter_for', { name: selected.name })}</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Generated letter */}
      {letter && (
        <div style={{ maxWidth: 720 }}>
          <div className="section-divider" style={{ marginBottom: 'var(--space-5)' }}>
            <span>{t('capital_access.generated_letter_heading')}</span>
          </div>
          <div className="card" style={{ padding: 'var(--space-6)' }}>
            <div style={{
              fontFamily: 'Georgia, serif', fontSize: 14, lineHeight: 1.8,
              color: 'var(--text-primary)', whiteSpace: 'pre-wrap',
              marginBottom: 'var(--space-5)',
              padding: 'var(--space-5)',
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              maxHeight: 480, overflowY: 'auto',
            }}>
              {letter}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button onClick={handleDownload} className="btn btn-primary" style={{ gap: 8 }}>
                <Download size={15} /> {t('capital_access.download_letter')}
              </button>
              <button onClick={() => setLetter('')} className="btn btn-ghost" style={{ gap: 8 }}>
                {t('common.retry')}
              </button>
            </div>
            <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
              <Info size={13} style={{ color: 'var(--text-faint)', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.6, margin: 0 }}>
                {t('capital_access.letter_disclaimer')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
