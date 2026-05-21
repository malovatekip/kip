import React, { useState } from 'react'
import { X, Building2, MapPin, TrendingUp, Clock, Zap, Loader2, ArrowRight } from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import KipMarkdown from './KipMarkdown'

const TENURE_OPTIONS = [
  { value: 'just_started',  label: 'Just started (under 1 month)' },
  { value: '1_6_months',    label: '1 – 6 months' },
  { value: '6_12_months',   label: '6 – 12 months' },
  { value: '1_3_years',     label: '1 – 3 years' },
  { value: '3_plus_years',  label: 'Over 3 years' },
]

export default function AddBusinessModal({ onClose, onSuccess }) {
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
    if (!form.business_name.trim()) { toast.error('Enter your business name.'); return }
    if (!form.description.trim())   { toast.error('Describe what your business does.'); return }

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
      toast.error(err.response?.data?.detail || 'Could not add business.')
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
                Add Your Business
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                KIP will analyse it and build your growth plan
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
                  Business name *
                </label>
                <input value={form.business_name} onChange={e => set('business_name', e.target.value)}
                  placeholder="e.g. Chanda's Fresh Produce" className="kip-input" style={{ fontSize: 14 }} />
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                  What does your business do? *
                </label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="e.g. I sell fresh vegetables and fruits at Soweto Market. I have one stall and 2 assistants."
                  className="kip-input" rows={3} style={{ resize: 'none', fontSize: 13 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                    <MapPin size={11} style={{ marginRight: 4 }} />Location
                  </label>
                  <input value={form.location} onChange={e => set('location', e.target.value)}
                    placeholder="e.g. Soweto Market, Lusaka" className="kip-input" style={{ fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                    <Clock size={11} style={{ marginRight: 4 }} />How long running?
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
                    <TrendingUp size={11} style={{ marginRight: 4 }} />Monthly revenue <span style={{ color: 'var(--faint)' }}>(approx)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--gold)', fontFamily: 'Syne', fontWeight: 700 }}>K</span>
                    <input type="number" value={form.monthly_revenue} onChange={e => set('monthly_revenue', e.target.value)}
                      placeholder="0" className="kip-input" style={{ fontSize: 13, paddingLeft: 26 }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                    Capital invested <span style={{ color: 'var(--faint)' }}>(total so far)</span>
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
                  Main challenge right now <span style={{ color: 'var(--faint)' }}>(optional — helps KIP give better advice)</span>
                </label>
                <input value={form.main_challenge} onChange={e => set('main_challenge', e.target.value)}
                  placeholder='e.g. "Not enough customers" or "Stock spoils before I sell it"'
                  className="kip-input" style={{ fontSize: 13 }} />
              </div>

              <div style={{ background: 'var(--blue-dim)', border: '1px solid rgba(43,127,255,0.2)', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--blue-bright)' }}>What happens next:</strong> KIP will review your business details and generate a personalised growth plan. You'll go straight to your business dashboard — no approval needed.
              </div>

              <button onClick={handleSubmit} className="kip-btn kip-btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 14 }}>
                <Zap size={16} /> Add Business & Get KIP Analysis
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
                KIP is analysing your business…
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65 }}>
                Reviewing your business details against Zambian market conditions, local competition, and growth opportunities. This takes about 15 seconds.
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
                  KIP Analysis Complete
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
              Open Business Dashboard <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
