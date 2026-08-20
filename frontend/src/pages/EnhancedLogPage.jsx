import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  DollarSign, Users, Package, Megaphone, Clock,
  ChevronDown, ChevronUp, Zap, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, ArrowLeft, ArrowRight,
  BarChart2
} from 'lucide-react'
import Layout from '../components/Layout'
import KipMarkdown from '../components/KipMarkdown'
import { useT } from '../context/TranslationContext'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { submitLog } from '../lib/submitLog'

/* ── Collapsible section ─────────────────────────────── */
function Section({ icon: Icon, title, color, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      border: `1px solid ${open ? color + '40' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 16, overflow: 'hidden', marginBottom: 12,
      transition: 'border-color 0.2s ease',
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '14px 18px',
        background: open ? `${color}10` : 'rgba(255,255,255,0.02)',
        cursor: 'pointer', border: 'none', transition: 'background 0.2s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `${color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={16} style={{ color }} />
          </div>
          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: '#fff' }}>
            {title}
          </span>
        </div>
        {open
          ? <ChevronUp size={16} style={{ color: 'var(--muted)' }} />
          : <ChevronDown size={16} style={{ color: 'var(--muted)' }} />
        }
      </button>
      {open && (
        <div style={{ padding: '16px 18px', borderTop: `1px solid ${color}20` }}>
          {children}
        </div>
      )}
    </div>
  )
}

/* ── Field label ─────────────────────────────────────── */
function FL({ label, hint }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)' }}>
        {label}
      </span>
      {hint && (
        <span style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 6 }}>
          ({hint})
        </span>
      )}
    </div>
  )
}

/* ── Number input ────────────────────────────────────── */
function NumIn({ value, onChange, prefix = '', placeholder = '0' }) {
  return (
    <div style={{ position: 'relative', marginBottom: 12 }}>
      {prefix && (
        <span style={{
          position: 'absolute', left: 12, top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: 'Syne', fontWeight: 700, fontSize: 13,
          color: 'var(--gold)', pointerEvents: 'none',
        }}>
          {prefix}
        </span>
      )}
      <input
        type="number" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="kip-input"
        style={{ paddingLeft: prefix ? 28 : 14, fontSize: 14 }}
      />
    </div>
  )
}

/* ── Main ────────────────────────────────────────────── */
export default function EnhancedLogPage() {
  const { t }       = useT()
  const { planId }  = useParams()
  const navigate    = useNavigate()
  const [plan,      setPlan]      = useState(null)
  const [coaching,  setCoaching]  = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [planLoading, setPlanLoading] = useState(true)

  const [form, setForm] = useState({
    revenue:      '',
    expenses:     '',
    customers:    '',
    stock_status: 'sufficient',
    challenges:   '',
    wins:         '',
    notes:        '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Load plan details for business name
  useEffect(() => {
    if (!planId || planId === 'undefined') {
      toast.error(t('daily_log.error_invalid_plan'))
      navigate('/ideas')
      return
    }
    api.get(`/business/plan/${planId}`)
      .then(r => setPlan(r.data))
      .catch(() => toast.error(t('daily_log.error_load_plan')))
      .finally(() => setPlanLoading(false))
  }, [planId])

  const handleSubmit = async () => {
    // Revenue is required (can be 0)
    if (form.revenue === '' && form.revenue !== '0') {
      toast.error(t('daily_log.error_revenue_required'))
      return
    }

    setLoading(true)
    try {
      const payload = {
        plan_id:      parseInt(planId),
        revenue:      parseFloat(form.revenue)   || 0,
        expenses:     parseFloat(form.expenses)  || 0,
        customers:    parseInt(form.customers)   || 0,
        stock_status: form.stock_status,
        challenges:   form.challenges || null,
        wins:         form.wins       || null,
        notes:        form.notes      || null,
      }

      // ── Calls /api/business/log — the correct endpoint  ──
//       const { data } = await api.post('/business/log', payload)
      const result = await submitLog({ ...payload, plan_id: parseInt(planId) })
      const data = result.data || {}

      if (result.queued) {
        toast.success(t('daily_log.offline_queued'))
        setSubmitted(true)
        setCoaching(t('daily_log.offline_coaching_placeholder'))
        return
      }

      setCoaching(data.coaching)
      setSubmitted(true)
      toast.success(t('daily_log.submitted_toast'))
    } catch (err) {
      console.error('Log submit error:', err)
      const msg = err.response?.data?.detail || err.message || t('daily_log.error_submission_failed')
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // Profit preview
  const revenue  = parseFloat(form.revenue)  || 0
  const expenses = parseFloat(form.expenses) || 0
  const profit   = revenue - expenses

  // ── Coaching view after submit ──
  if (submitted && coaching) {
    return (
      <Layout>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px', position: 'relative', zIndex: 1 }}>
          <Link to={`/business/${planId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)', textDecoration: 'none', marginBottom: 20 }}>
            <ArrowLeft size={14} /> {t('daily_log.back_to_dashboard')}
          </Link>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
            {[
              { label: t('bizsim.revenue'),  val: `K${revenue.toFixed(0)}`,  color: 'var(--green)' },
              { label: t('bizsim.expenses'), val: `K${expenses.toFixed(0)}`, color: 'var(--red)' },
              { label: t('bizsim.profit'),   val: `K${profit.toFixed(0)}`,   color: profit >= 0 ? 'var(--gold)' : 'var(--red)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'Syne', fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Coaching */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: 22, marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Zap size={16} style={{ color: 'var(--gold)' }} />
              <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: '#fff' }}>
                {t('daily_log.daily_coaching_title')}
              </span>
            </div>
            <KipMarkdown content={coaching} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Link to={`/business/${planId}`} className="kip-btn kip-btn-primary" style={{ flex: 1, fontSize: 13, justifyContent: 'center' }}>
              {t('dashboard.title')} <ArrowRight size={14} />
            </Link>
            <button onClick={() => { setSubmitted(false); setForm({ revenue: '', expenses: '', customers: '', stock_status: 'sufficient', challenges: '', wins: '', notes: '' }); setCoaching(null) }}
              className="kip-btn kip-btn-ghost" style={{ fontSize: 13 }}>
              {t('daily_log.log_another_day')}
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 20px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <Link to={`/business/${planId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)', textDecoration: 'none', marginBottom: 12 }}>
            <ArrowLeft size={14} /> {t('common.back')}
          </Link>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 4 }}>
            {t('daily_log.title')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            {plan?.business_name || t('daily_log.your_business_fallback')} ·{' '}
            {new Date().toLocaleDateString('en-ZM', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* 1. Financial */}
        <Section icon={DollarSign} title={t('daily_log.section_financial')} color="var(--green)" defaultOpen={true}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <FL label={t('daily_log.total_revenue_today')} hint={t('daily_log.hint_all_income')} />
              <NumIn prefix="K" value={form.revenue} onChange={v => set('revenue', v)} />
            </div>
            <div>
              <FL label={t('daily_log.total_expenses_today')} hint={t('daily_log.hint_all_outflows')} />
              <NumIn prefix="K" value={form.expenses} onChange={v => set('expenses', v)} />
            </div>
          </div>
          {/* Profit preview */}
          {(form.revenue !== '' || form.expenses !== '') && (
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              background: `${profit >= 0 ? 'rgba(0,230,118,0.06)' : 'rgba(255,83,112,0.06)'}`,
              border: `1px solid ${profit >= 0 ? 'rgba(0,230,118,0.2)' : 'rgba(255,83,112,0.2)'}`,
              borderRadius: 10, padding: '10px 14px', marginTop: 4,
            }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{t('daily_log.profit_label')}</span>
              <span style={{
                fontFamily: 'Syne', fontWeight: 800, fontSize: 15,
                color: profit >= 0 ? 'var(--green)' : 'var(--red)',
              }}>
                K{profit.toFixed(2)}
              </span>
            </div>
          )}
        </Section>

        {/* 2. Customers */}
        <Section icon={Users} title={t('daily_log.section_customers')} color="var(--blue-bright)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <FL label={t('daily_log.total_customers_today')} />
              <NumIn value={form.customers} onChange={v => set('customers', v)} />
            </div>
          </div>
        </Section>

        {/* 3. Operations */}
        <Section icon={Package} title={t('daily_log.section_operations')} color="var(--teal)">
          <FL label={t('daily_log.stock_label')} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[
              { v: 'sufficient', l: `✓ ${t('daily_log.stock_sufficient')}`,  c: 'var(--green)' },
              { v: 'low',        l: `⚠ ${t('daily_log.stock_running_low')}`, c: 'var(--gold)' },
              { v: 'critical',   l: `✗ ${t('daily_log.stock_critical')}`,    c: 'var(--red)' },
            ].map(({ v, l, c }) => (
              <button key={v} onClick={() => set('stock_status', v)} style={{
                flex: 1, padding: '9px 0', borderRadius: 9, cursor: 'pointer',
                fontFamily: 'Syne', fontWeight: 600, fontSize: 11,
                color: form.stock_status === v ? c : 'var(--muted)',
                background: form.stock_status === v ? `${c}12` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${form.stock_status === v ? c + '40' : 'rgba(255,255,255,0.07)'}`,
                transition: 'all 0.2s ease',
              }}>
                {l}
              </button>
            ))}
          </div>
        </Section>

        {/* 4. Marketing */}
        <Section icon={Megaphone} title={t('daily_log.section_marketing')} color="var(--gold)">
          <FL label={t('daily_log.marketing_question')} hint={t('daily_log.hint_optional')} />
          <input value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder={t('daily_log.marketing_placeholder')}
            className="kip-input" style={{ fontSize: 13 }} />
        </Section>

        {/* 5. Wins & Challenges */}
        <Section icon={Clock} title={t('daily_log.section_win_challenge')} color="var(--muted)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <FL label={`🏆 ${t('daily_log.today_win_label')}`} hint={t('daily_log.hint_what_went_well')} />
              <textarea value={form.wins} onChange={e => set('wins', e.target.value)}
                placeholder={t('daily_log.win_placeholder')}
                className="kip-input" rows={3} style={{ resize: 'none', fontSize: 13 }} />
            </div>
            <div>
              <FL label={`📚 ${t('daily_log.today_challenge_label')}`} hint={t('daily_log.hint_what_slowed_down')} />
              <textarea value={form.challenges} onChange={e => set('challenges', e.target.value)}
                placeholder={t('daily_log.challenge_placeholder_example')}
                className="kip-input" rows={3} style={{ resize: 'none', fontSize: 13 }} />
            </div>
          </div>
        </Section>

        {/* Submit await */}
        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: '14px 0', marginTop: 8,
          background: 'linear-gradient(135deg, var(--blue), var(--mid))',
          border: 'none', borderRadius: 14, cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: '#fff',
          boxShadow: '0 4px 20px rgba(27,110,243,0.3)',
          opacity: loading ? 0.7 : 1, transition: 'all 0.2s ease',
        }}>
          {loading
            ? <><div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spinSlow 0.8s linear infinite' }} /> {t('daily_log.submitting_ellipsis')}</>
            : <><Zap size={17} /> {t('daily_log.submit_log_button')}</>
          }
        </button>

      </div>
    </Layout>
  )
}
