import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle, X, Zap, Crown, ArrowRight, Building2,
  TrendingUp, FileText, MessageSquare, Lightbulb,
  BarChart2, Mail, Globe, Lock, Users, Calendar
} from 'lucide-react'
import KIP_LOGO from '../kipLogo'
import Footer from '../components/Footer'

/* ── Feature definitions ─────────────────────────────── */
const FREE_FEATURES = [
  { icon: Lightbulb,     text: '3 business ideas per day from KIP AI',   ok: true  },
  { icon: MessageSquare, text: '5 in-progress chat messages per day',     ok: true  },
  { icon: BarChart2,     text: 'Daily business logs & tracking',          ok: true  },
  { icon: Globe,         text: 'Live Zambian economic news feed',         ok: true  },
  { icon: FileText,      text: 'Government forms & PACRA links',          ok: true  },
  { icon: TrendingUp,    text: 'ML revenue predictions',                  ok: false },
  { icon: FileText,      text: 'Business plan PDF (bank-ready)',           ok: false },
  { icon: Mail,          text: 'AI letter generation',                    ok: false },
  { icon: Building2,     text: 'Enterprise multi-branch management',      ok: false },
  { icon: BarChart2,     text: 'KIP cross-branch analytics',              ok: false },
]

const PREMIUM_FEATURES = [
  { icon: Lightbulb,     text: 'Unlimited business ideas',                ok: true },
  { icon: MessageSquare, text: 'Unlimited in-progress chat',              ok: true },
  { icon: BarChart2,     text: 'Daily logs, coaching & tracking',         ok: true },
  { icon: Globe,         text: 'Live Zambian economic news feed',         ok: true },
  { icon: FileText,      text: 'Government forms & PACRA links',          ok: true },
  { icon: TrendingUp,    text: 'ML revenue & profit predictions',         ok: true },
  { icon: FileText,      text: 'Business plan PDF (bank/CDF-ready)',      ok: true },
  { icon: Mail,          text: 'AI letters: loan, supplier, council',     ok: true },
  { icon: Building2,     text: 'Enterprise multi-branch management',      ok: true },
  { icon: BarChart2,     text: 'KIP consolidated branch analytics',       ok: true },
]

/* ── How KIP makes money ─────────────────────────────── */
const REVENUE_STREAMS = [
  {
    icon: Crown,
    title: 'Subscription Revenue',
    color: 'var(--gold)',
    desc: 'K49/month per Premium subscriber. Target: 5,000 subscribers by end of 2026 = K245,000/month (~$9,000 USD/month) recurring revenue.',
  },
  {
    icon: Building2,
    title: 'Enterprise Licences',
    color: 'var(--blue-bright)',
    desc: 'Custom pricing for businesses with 5+ branches. Estimated K500–K2,000/month per enterprise client depending on branch count and analytics requirements.',
  },
  {
    icon: BarChart2,
    title: 'Market Intelligence Data',
    color: 'var(--teal)',
    desc: 'KIP\'s aggregated, anonymised market survey data across Zambian towns is a unique commercial asset. Licensing to banks, NGOs, government agencies, and researchers.',
  },
  {
    icon: FileText,
    title: 'API Access',
    color: 'var(--violet)',
    desc: 'Developer access to KIP\'s Zambia Intelligence API for third-party fintech and business applications. Pay-per-query pricing model planned for 2027.',
  },
]

/* ── Stats ───────────────────────────────────────────── */
const STATS = [
  { value: '1.2M+',  label: 'SMEs in Zambia',          sub: 'Target market' },
  { value: 'K49',    label: 'Per month',                sub: 'Premium price' },
  { value: '30',     label: 'Day free trial',           sub: 'For every user' },
  { value: '2026',   label: 'Revenue launch',           sub: 'June 26' },
]

/* ── FAQ ─────────────────────────────────────────────── */
const FAQS = [
  {
    q: 'When will payments go live?',
    a: 'Payment processing launches 26 June 2026. We are integrating Stripe for international card payments and Flutterwave for MTN Mobile Money and Airtel Money — the two dominant payment methods in Zambia.',
  },
  {
    q: 'Why K49 per month?',
    a: 'K49 is approximately $1.80 USD — less than a bag of mealie meal. We priced it aggressively to maximise adoption across all income levels while remaining sustainable. At 5,000 subscribers, KIP generates K245,000/month in recurring revenue.',
  },
  {
    q: 'What happens to free users\' data?',
    a: 'Free users retain full access to their business data, logs, and ideas forever. The free plan is genuinely useful — it is designed to demonstrate KIP\'s value and convert users to Premium organically.',
  },
  {
    q: 'Is the 30-day trial automatic?',
    a: 'Yes. Every new user receives 30 days of full Premium access automatically on registration — no credit card required. After the trial, unused Premium features are gated until subscription.',
  },
  {
    q: 'Will KIP work in other African countries?',
    a: 'KIP\'s current knowledge base is Zambia-first. The architecture is designed to be replicated for other markets. Zimbabwe, Malawi, and Tanzania are targeted for expansion in 2027 once the Zambia model is validated.',
  },
]

/* ── Main ────────────────────────────────────────────── */
export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState(null)
  const [billingMonths, setBillingMonths] = useState(1)
  const amount = 49 * billingMonths

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', color: 'var(--text)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)', padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(20px)',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src={KIP_LOGO} alt="KIP" style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover' }} />
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, letterSpacing: '0.1em', color: 'var(--text)' }}>KIP</span>
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/login"    className="kip-btn kip-btn-ghost"   style={{ fontSize: 13, padding: '8px 16px' }}>Sign In</Link>
          <Link to="/register" className="kip-btn kip-btn-primary" style={{ fontSize: 13, padding: '8px 16px' }}>Start Free Trial</Link>
        </div>
      </header>

      <div style={{ flex: 1, maxWidth: 960, margin: '0 auto', padding: '48px 20px 60px', width: '100%' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--teal-dim)', border: '1px solid rgba(0,240,200,0.3)', borderRadius: 20, padding: '5px 14px', marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pricing Model</span>
          </div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(26px,5vw,40px)', color: 'var(--text)', marginBottom: 14, lineHeight: 1.2 }}>
            Simple, honest pricing.<br />
            <span style={{ background: 'linear-gradient(135deg, var(--blue-bright), var(--teal))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Built for Zambia.
            </span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 560, margin: '0 auto 20px', lineHeight: 1.75 }}>
            Every new account gets <strong style={{ color: 'var(--teal)' }}>30 days of free Premium</strong> — no card required. 
            After that, K49/month unlocks everything.
          </p>

          {/* Coming soon badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--gold-dim)', border: '1px solid rgba(232,151,62,0.35)',
            borderRadius: 12, padding: '10px 18px',
          }}>
            <Calendar size={14} style={{ color: 'var(--gold)' }} />
            <span style={{ fontSize: 13, color: 'var(--gold)', fontFamily: 'Syne', fontWeight: 700 }}>
              Payment processing launches 26 June 2026
            </span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>· Card + Mobile Money</span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginBottom: 48 }}>
          {STATS.map(({ value, label, sub }) => (
            <div key={label} className="kip-card" style={{ padding: '18px 20px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, color: 'var(--blue-bright)', marginBottom: 4 }}>{value}</div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--faint)' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Duration toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {[{ m: 1, label: '1 Month' }, { m: 3, label: '3 Months' }, { m: 6, label: '6 Months' }].map(({ m, label }) => (
            <button key={m} onClick={() => setBillingMonths(m)} style={{
              padding: '8px 20px', borderRadius: 20, cursor: 'pointer',
              fontFamily: 'Syne', fontWeight: 700, fontSize: 13,
              background: billingMonths === m ? 'var(--blue)' : 'var(--input-bg)',
              border: `1px solid ${billingMonths === m ? 'var(--blue)' : 'var(--border)'}`,
              color: billingMonths === m ? '#fff' : 'var(--muted)',
              transition: 'all 0.2s ease',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 20, marginBottom: 60 }}>

          {/* Free */}
          <div className="kip-card" style={{ padding: 28 }}>
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 6 }}>Free</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 36, color: 'var(--text)' }}>K0</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>/month</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Forever free · No card needed</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 26 }}>
              {FREE_FEATURES.map(({ icon: Icon, text, ok }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  {ok
                    ? <CheckCircle size={14} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }} />
                    : <X          size={14} style={{ color: 'var(--faint)', flexShrink: 0, marginTop: 1 }} />
                  }
                  <span style={{ fontSize: 13, color: ok ? 'var(--text)' : 'var(--faint)', lineHeight: 1.4 }}>{text}</span>
                </div>
              ))}
            </div>

            <Link to="/register" className="kip-btn kip-btn-ghost"
              style={{ width: '100%', padding: '12px 0', fontSize: 14, display: 'flex', justifyContent: 'center' }}>
              Get Started Free
            </Link>
          </div>

          {/* Premium */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(43,127,255,0.1), rgba(0,240,200,0.05))',
            border: '1px solid rgba(43,127,255,0.35)', borderRadius: 16, padding: 28,
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>
              <span style={{
                fontFamily: 'Syne', fontWeight: 800, fontSize: 11, color: '#fff',
                background: 'linear-gradient(135deg, var(--blue), var(--teal))',
                padding: '4px 16px', borderRadius: 20, letterSpacing: '0.05em',
              }}>
                ✦ MOST POPULAR
              </span>
            </div>

            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Crown size={17} style={{ color: 'var(--gold)' }} />
                <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, color: 'var(--text)' }}>Premium</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 36, color: 'var(--blue-bright)' }}>K{amount}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>/ {billingMonths} month{billingMonths > 1 ? 's' : ''}</span>
              </div>
              {billingMonths > 1
                ? <div style={{ fontSize: 12, color: 'var(--teal)', fontFamily: 'Syne', fontWeight: 600 }}>K49/month · save with longer plans</div>
                : <div style={{ fontSize: 12, color: 'var(--muted)' }}>≈ $1.80 USD · less than a bag of mealie meal</div>
              }
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>30-day free trial for all new accounts</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 26 }}>
              {PREMIUM_FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <CheckCircle size={14} style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{text}</span>
                </div>
              ))}
            </div>

            <Link to="/register" className="kip-btn kip-btn-primary"
              style={{ width: '100%', padding: '13px 0', fontSize: 14, display: 'flex', justifyContent: 'center', gap: 8 }}>
              <Zap size={15} /> Start 30-Day Free Trial
            </Link>
            <p style={{ fontSize: 11, color: 'var(--faint)', textAlign: 'center', marginTop: 10, marginBottom: 0 }}>
              No credit card required · Cancel anytime · Payment launching 26 June 2026
            </p>
          </div>
        </div>

        {/* Revenue model section */}
        <div style={{ marginBottom: 60 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 8 }}>
              Revenue Model
            </h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
              KIP is designed to generate revenue across four streams, with subscriptions as the primary engine.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 14 }}>
            {REVENUE_STREAMS.map(({ icon: Icon, title, color, desc }) => (
              <div key={title} className="kip-card" style={{ padding: '20px 20px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 8 }}>{title}</div>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment methods coming soon */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(232,151,62,0.08), rgba(43,127,255,0.06))',
          border: '1px solid rgba(232,151,62,0.25)', borderRadius: 16,
          padding: '28px 28px', marginBottom: 60, textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 17, color: 'var(--text)', marginBottom: 10 }}>
            Payment Methods — Launching 26 June 2026
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 520, margin: '0 auto 20px', lineHeight: 1.7 }}>
            We are integrating <strong style={{ color: 'var(--text)' }}>Stripe</strong> for international card payments
            and <strong style={{ color: 'var(--text)' }}>Flutterwave</strong> for MTN Mobile Money and Airtel Money —
            the two dominant mobile payment networks in Zambia.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Visa / Mastercard', color: 'var(--blue-bright)' },
              { label: 'MTN Mobile Money', color: '#FFD700' },
              { label: 'Airtel Money',     color: '#FF4B2B' },
              { label: 'Zamtel Money',     color: '#00AA44' },
            ].map(({ label, color }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 20,
                background: `${color}14`, border: `1px solid ${color}40`,
                fontSize: 12, fontFamily: 'Syne', fontWeight: 700, color,
              }}>
                <Lock size={11} /> {label}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 20, textAlign: 'center' }}>
            Common Questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQS.map(({ q, a }, i) => (
              <div key={i} className="kip-card" style={{ padding: 0, overflow: 'hidden' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--text)', textAlign: 'left', gap: 12,
                }}>
                  <span>{q}</span>
                  <span style={{ color: 'var(--blue-bright)', fontSize: 18, fontWeight: 400, flexShrink: 0 }}>
                    {openFaq === i ? '−' : '+'}
                  </span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 20px 16px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.75 }}>
                    {a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(43,127,255,0.12), rgba(0,240,200,0.06))',
          border: '1px solid rgba(43,127,255,0.25)', borderRadius: 20,
          padding: '40px 32px', textAlign: 'center',
        }}>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 10 }}>
            Start your free 30-day trial today
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 22, lineHeight: 1.7 }}>
            Full Premium access. No credit card. No commitment.
          </p>
          <Link to="/register" className="kip-btn kip-btn-primary" style={{ fontSize: 15, padding: '14px 32px', display: 'inline-flex' }}>
            <Zap size={16} /> Create Free Account <ArrowRight size={15} />
          </Link>
        </div>

      </div>

      <Footer />
    </div>
  )
}
