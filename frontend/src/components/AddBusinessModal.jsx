import React, { useState } from 'react'
import { X, Building2, MapPin, TrendingUp, Clock, Zap, Loader2, ArrowRight } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import KipMarkdown from './KipMarkdown'
import { useT } from '../context/TranslationContext'

export default function AddBusinessModal({ onClose, onSuccess }) {
  const { t } = useT()
  const TENURE_OPTIONS = [
    { value: 'just_started',  label: t('add_business_modal.tenure_just_started') },
    { value: '1_6_months',    label: t('add_business_modal.tenure_1_6_months')   },
    { value: '6_12_months',   label: t('add_business_modal.tenure_6_12_months')  },
    { value: '1_3_years',     label: t('add_business_modal.tenure_1_3_years')    },
    { value: '3_plus_years',  label: t('add_business_modal.tenure_3_plus_years') },
  ]
  const [step, setStep]       = useState('form')   // 'form' | 'analysing' | 'result'
  const [analysis, setAnalysis] = useState('')
  const [planId,   setPlanId]   = useState(null)

  const [form, setForm] = useState({
    business_name:    '',
    description:      '',
    location:         '',
    tenure:           'just_started',
    monthly_revenue:  '',
    capital_invested: '',
    main_challenge:   '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.business_name.trim()) { toast.error(t('add_business_modal.error_name_required')); return }
    if (!form.description.trim())   { toast.error(t('add_business_modal.error_description_required')); return }

    setStep('analysing')
    try {
      const { data } = await api.post('/business/add-own', {
        ...form,
        monthly_revenue:  form.monthly_revenue  ? parseFloat(form.monthly_revenue)  : null,
        capital_invested: form.capital_invested ? parseFloat(form.capital_invested) : null,
      })
      setAnalysis(data.analysis)
      setPlanId(data.plan_id)
      setStep('result')
    } catch (err) {
      toast.error(err.response?.data?.detail || t('add_business_modal.error_add_failed'))
      setStep('form')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: 0,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="animate-slide-up"
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 620,
          maxHeight: '94vh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={17} style={{ color: 'var(--blue-bright)' }} />
            </div>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                {t('add_business_modal.title')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {t('add_business_modal.subtitle')}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {/* ── Form ── */}
          {step === 'form' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                  {t('add_business_modal.business_name_label')}
                </label>
                <input value={form.business_name} onChange={e => set('business_name', e.target.value)}
                  placeholder={t('add_business_modal.business_name_placeholder')} className="kip-input" style={{ fontSize: 14 }} />
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                  {t('add_business_modal.description_label')}
                </label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder={t('add_business_modal.description_placeholder')}
                  className="kip-input" rows={3} style={{ resize: 'none', fontSize: 13 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                    <MapPin size={11} style={{ marginRight: 4 }} />{t('add_business_modal.location_label')}
                  </label>
                  <input value={form.location} onChange={e => set('location', e.target.value)}
                    placeholder={t('add_business_modal.location_placeholder')} className="kip-input" style={{ fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                    <Clock size={11} style={{ marginRight: 4 }} />{t('add_business_modal.tenure_label')}
                  </label>
                  <select value={form.tenure} onChange={e => set('tenure', e.target.value)}
                    className="kip-input" style={{ fontSize: 13 }}>
                    {TENURE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                    <TrendingUp size={11} style={{ marginRight: 4 }} />{t('add_business_modal.monthly_revenue_label')} <span style={{ color: 'var(--faint)' }}>({t('add_business_modal.approx_label')})</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--gold)', fontFamily: 'Syne', fontWeight: 700 }}>K</span>
                    <input type="number" value={form.monthly_revenue} onChange={e => set('monthly_revenue', e.target.value)}
                      placeholder="0" className="kip-input" style={{ fontSize: 13, paddingLeft: 26 }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                    {t('add_business_modal.capital_invested_label')} <span style={{ color: 'var(--faint)' }}>({t('add_business_modal.total_so_far_label')})</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--gold)', fontFamily: 'Syne', fontWeight: 700 }}>K</span>
                    <input type="number" value={form.capital_invested} onChange={e => set('capital_invested', e.target.value)}
                      placeholder="0" className="kip-input" style={{ fontSize: 13, paddingLeft: 26 }} />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                  {t('add_business_modal.main_challenge_label')} <span style={{ color: 'var(--faint)' }}>({t('add_business_modal.optional_helps_label')})</span>
                </label>
                <input value={form.main_challenge} onChange={e => set('main_challenge', e.target.value)}
                  placeholder={t('add_business_modal.main_challenge_placeholder')}
                  className="kip-input" style={{ fontSize: 13 }} />
              </div>

              <div style={{ background: 'var(--blue-dim)', border: '1px solid rgba(43,127,255,0.2)', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--blue-bright)' }}>{t('add_business_modal.what_happens_next_label')}</strong> {t('add_business_modal.what_happens_next_desc')}
              </div>

              <button onClick={handleSubmit} className="kip-btn kip-btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 14 }}>
                <Zap size={16} /> {t('add_business_modal.submit_button')}
              </button>
            </div>
          )}

          {/* ── Analysing ── */}
          {step === 'analysing' && (
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
                {t('add_business_modal.analysing_title')}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>
                {t('add_business_modal.analysing_desc')}
              </p>
            </div>
          )}

          {/* ── Result ── */}
          {step === 'result' && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                padding: '10px 14px', borderRadius: 12,
                background: 'var(--green-dim)', border: '1px solid rgba(26,224,110,0.25)',
              }}>
                <Zap size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontFamily: 'Syne', fontWeight: 700, color: 'var(--green)' }}>
                  {t('add_business_modal.analysis_complete')}
                </span>
              </div>
              <KipMarkdown content={analysis} />
            </div>
          )}
        </div>

        {/* Footer — only shown on result */}
        {step === 'result' && planId && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <button
              onClick={() => { onSuccess(planId); onClose() }}
              className="kip-btn kip-btn-primary"
              style={{ width: '100%', padding: '13px 0', fontSize: 14 }}
            >
              {t('add_business_modal.open_dashboard_button')} <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
