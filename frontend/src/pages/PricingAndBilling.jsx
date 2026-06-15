// ── PricingPage.jsx ───────────────────────────────────────────────────────────
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, X, Zap, Crown, ArrowRight } from 'lucide-react'
import Footer from '../components/Footer'
import KIP_LOGO from '../kipLogo'

const FREE_FEATURES = [
  { text: '3 business ideas per day',          ok: true  },
  { text: '5 business chat messages per day',  ok: true  },
  { text: 'Daily logs & basic coaching',        ok: true  },
  { text: 'Economic news feed',                 ok: true  },
  { text: 'Market survey',                      ok: true  },
  { text: 'ML revenue predictions',             ok: false },
  { text: 'Business plan PDF',                  ok: false },
  { text: 'AI letter generation',               ok: false },
  { text: 'Enterprise / multi-branch',          ok: false },
]

const PREMIUM_FEATURES = [
  { text: 'Unlimited business ideas',           ok: true },
  { text: 'Unlimited business chat',            ok: true },
  { text: 'Daily logs & AI coaching',           ok: true },
  { text: 'Economic news feed',                 ok: true },
  { text: 'Market survey',                      ok: true },
  { text: 'ML revenue & profit predictions',    ok: true },
  { text: 'Business plan PDF (bank-ready)',     ok: true },
  { text: 'AI letter generation',               ok: true },
  { text: 'Enterprise / multi-branch accounts',ok: true  },
]

export function PricingPage() {
  const [months, setMonths] = useState(1)
  const amount = 49 * months

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src={KIP_LOGO} alt="KIP" style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover' }} />
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, letterSpacing: '0.1em', color: 'var(--text)' }}>KIP</span>
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/login"    className="kip-btn kip-btn-ghost"   style={{ fontSize: 13, padding: '8px 16px' }}>Sign In</Link>
          <Link to="/register" className="kip-btn kip-btn-primary" style={{ fontSize: 13, padding: '8px 16px' }}>Start Free Trial</Link>
        </div>
      </header>

      <div style={{ flex: 1, maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div className="kip-badge kip-badge-teal" style={{ marginBottom: 12 }}>Simple Pricing</div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 32, color: 'var(--text)', marginBottom: 12 }}>
            Start free. Upgrade when ready.
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
            Every new account gets <strong style={{ color: 'var(--teal)' }}>30 days of free Premium</strong>. No credit card required to start.
          </p>
        </div>

        {/* Duration selector */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {[
            { m: 1, label: '1 Month'  },
            { m: 3, label: '3 Months' },
            { m: 6, label: '6 Months' },
          ].map(({ m, label }) => (
            <button key={m} onClick={() => setMonths(m)} style={{
              padding: '8px 20px', borderRadius: 20, cursor: 'pointer',
              fontFamily: 'Syne', fontWeight: 700, fontSize: 13,
              background: months === m ? 'var(--blue)'    : 'var(--input-bg)',
              border:     months === m ? '1px solid var(--blue)' : '1px solid var(--border)',
              color:      months === m ? '#fff' : 'var(--muted)',
              transition: 'all 0.2s ease',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

          {/* Free */}
          <div className="kip-card" style={{ padding: 28 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 4 }}>Free</div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 32, color: 'var(--text)' }}>K0</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Forever free</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {FREE_FEATURES.map(f => (
                <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  {f.ok
                    ? <CheckCircle size={14} style={{ color: 'var(--green)', flexShrink: 0 }} />
                    : <X size={14} style={{ color: 'var(--faint)', flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: 13, color: f.ok ? 'var(--text)' : 'var(--faint)' }}>{f.text}</span>
                </div>
              ))}
            </div>
            <Link to="/register" className="kip-btn kip-btn-ghost" style={{ width: '100%', padding: '12px 0', fontSize: 14, display: 'flex', justifyContent: 'center' }}>
              Get Started Free
            </Link>
          </div>

          {/* Premium */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(43,127,255,0.12), rgba(0,240,200,0.06))',
            border: '1px solid rgba(43,127,255,0.35)',
            borderRadius: 16, padding: 28, position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }}>
              <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 11, color: '#fff', background: 'linear-gradient(135deg, var(--blue), var(--teal))', padding: '4px 14px', borderRadius: 20 }}>
                MOST POPULAR
              </span>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Crown size={16} style={{ color: 'var(--gold)' }} />
                <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>Premium</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 32, color: 'var(--blue-bright)' }}>K{amount}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>/ {months} month{months > 1 ? 's' : ''}</span>
              </div>
              {months > 1 && <div style={{ fontSize: 12, color: 'var(--teal)' }}>K49/month</div>}
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                30-day free trial — no card needed
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {PREMIUM_FEATURES.map(f => (
                <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <CheckCircle size={14} style={{ color: 'var(--teal)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{f.text}</span>
                </div>
              ))}
            </div>
            <Link to="/register" className="kip-btn kip-btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 14, display: 'flex', justifyContent: 'center', gap: 7 }}>
              <Zap size={15} /> Start Free Trial <ArrowRight size={14} />
            </Link>
            <p style={{ fontSize: 11, color: 'var(--faint)', textAlign: 'center', marginTop: 10 }}>
              No credit card required · Cancel anytime
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 48 }}>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 20, textAlign: 'center' }}>
            Common Questions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {[
              { q: 'What happens after my 30-day trial?', a: 'Your account automatically switches to the Free plan. You keep your data — you just lose access to Premium features like unlimited ideas, PDFs, and ML predictions.' },
              { q: 'Can I pay with mobile money?', a: 'Yes — we accept MTN Mobile Money, Airtel Money, and Zamtel Money. You\'ll receive a USSD prompt on your phone to approve the payment.' },
              { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your billing page at any time. You keep Premium access until the end of your paid period.' },
              { q: 'Is my business data safe?', a: 'Yes. Your data is stored on encrypted servers. We never sell your data. See our Privacy Policy for full details.' },
            ].map(({ q, a }) => (
              <div key={q} className="kip-card" style={{ padding: '16px 18px' }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>{q}</div>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}


// ── BillingPage.jsx ───────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import UpgradeModal from '../components/UpgradeModal'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { DollarSign, Calendar, CheckCircle as CheckCircleIcon,
         Clock, CreditCard, Smartphone, ExternalLink } from 'lucide-react'

export function BillingPage() {
  const [status,  setStatus]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const location  = useLocation()
  const navigate  = useNavigate()

  useEffect(() => {
    // Handle return from Stripe/Flutterwave
    const params = new URLSearchParams(location.search)
    if (params.get('success') === 'true') {
      toast.success('Payment successful! Premium activated.', { duration: 5000 })
      navigate('/billing', { replace: true })
    }
    if (params.get('cancelled') === 'true') {
      toast.error('Payment cancelled.')
      navigate('/billing', { replace: true })
    }
    // Flutterwave return — verify
    if (params.get('flw') === 'complete') {
      const txRef = params.get('tx_ref')
      if (txRef) {
        api.get(`/flutterwave/verify/${txRef}`)
          .then(r => {
            if (r.data.status === 'success') toast.success('Mobile money payment confirmed!')
            else toast.error('Payment not yet confirmed. It may take a few minutes.')
          }).catch(() => {})
      }
      navigate('/billing', { replace: true })
    }
  }, [])

  useEffect(() => {
    api.get('/stripe/status')
      .then(r => setStatus(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const openBillingPortal = async () => {
    try {
      const { data } = await api.post('/stripe/billing-portal')
      window.location.href = data.portal_url
    } catch { toast.error('No Stripe subscription found.') }
  }

  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-ZM', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

  return (
    <Layout>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 16px', position: 'relative', zIndex: 1 }}>

        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>
          Billing & Subscription
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
          Manage your KIP Premium plan.
        </p>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(43,127,255,0.2)', borderTopColor: 'var(--blue)', animation: 'spinSlow 0.8s linear infinite' }} />
          </div>
        ) : (
          <>
            {/* Plan status */}
            <div className="kip-card" style={{ padding: '20px 22px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Crown size={16} style={{ color: status?.is_premium ? 'var(--gold)' : 'var(--faint)' }} />
                    <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text)', textTransform: 'capitalize' }}>
                      {status?.plan_tier || 'Free'} Plan
                    </span>
                    {status?.trial?.on_trial && (
                      <span className="kip-badge kip-badge-teal">Trial</span>
                    )}
                  </div>
                  {status?.trial?.on_trial && (
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                      Trial ends {fmt(status.trial.ends_at)} · {status.trial.days_left} days remaining
                    </p>
                  )}
                  {status?.current_period_end && !status?.trial?.on_trial && (
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                      Renews {fmt(status.current_period_end)}
                    </p>
                  )}
                  {!status?.is_premium && !status?.trial?.on_trial && (
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                      {status?.ideas_today || 0}/{status?.ideas_limit || 3} ideas today · {status?.chat_today || 0}/{status?.chat_limit || 5} messages today
                    </p>
                  )}
                </div>
                {!status?.is_premium && (
                  <button onClick={() => setShowUpgrade(true)} className="kip-btn kip-btn-primary" style={{ fontSize: 13, padding: '9px 18px' }}>
                    <Crown size={14} /> Upgrade — K49/mo
                  </button>
                )}
                {status?.has_stripe && (
                  <button onClick={openBillingPortal} className="kip-btn kip-btn-ghost" style={{ fontSize: 12, padding: '8px 14px' }}>
                    <ExternalLink size={13} /> Manage on Stripe
                  </button>
                )}
              </div>
            </div>

            {/* Today's usage */}
            <div className="kip-card" style={{ padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 14 }}>Today's Usage</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Business Ideas',  used: status?.ideas_today || 0, limit: status?.ideas_limit, icon: Zap      },
                  { label: 'Chat Messages',   used: status?.chat_today  || 0, limit: status?.chat_limit,  icon: DollarSign },
                ].map(({ label, used, limit, icon: Icon }) => {
                  const unlimited = limit === -1
                  const pct = unlimited ? 0 : Math.min(100, (used / limit) * 100)
                  return (
                    <div key={label} style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'Syne', fontWeight: 600 }}>{label}</span>
                        <span style={{ fontSize: 12, fontFamily: 'Syne', fontWeight: 700, color: unlimited ? 'var(--teal)' : pct >= 100 ? 'var(--red)' : 'var(--text)' }}>
                          {unlimited ? '∞' : `${used}/${limit}`}
                        </span>
                      </div>
                      {!unlimited && (
                        <div className="kip-progress">
                          <div className="kip-progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--red)' : undefined }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Payment history */}
            {status?.payment_history?.length > 0 && (
              <div className="kip-card" style={{ padding: '18px 20px' }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 14 }}>Payment History</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {status.payment_history.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 9 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.provider === 'stripe'
                          ? <CreditCard size={13} style={{ color: 'var(--blue-bright)' }} />
                          : <Smartphone  size={13} style={{ color: 'var(--teal)' }} />
                        }
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.amount} · {p.months} month{p.months > 1 ? 's' : ''}</div>
                          <div style={{ fontSize: 10, color: 'var(--faint)' }}>{fmt(p.date)} · {p.provider}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: p.status === 'success' ? 'var(--green)' : 'var(--red)', textTransform: 'uppercase' }}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
