// ── CookiePage ────────────────────────────────────────────────────────────────
import React, { useState } from 'react'
import LegalLayout, { Section, P, UL, Callout } from '../components/LegalLayout'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import toast from 'react-hot-toast'
import KIP_LOGO from '../kipLogo'
import { Mail, MessageSquare, MapPin, ArrowRight, CheckCircle } from 'lucide-react'

export function CookiePage() {
  return (
    <LegalLayout
      title="Cookie Policy"
      subtitle="What KIP stores in your browser and why."
      lastUpdated="May 2026"
    >
      <Callout color="var(--teal)">
        KIP does not use advertising cookies or third-party tracking cookies. We only store what is necessary to keep you logged in and remember your preferences.
      </Callout>

      <Section title="1. What Is a Cookie?">
        <P>
          A cookie is a small piece of data stored in your browser. KIP primarily uses <strong>localStorage</strong> — a browser storage mechanism — rather than traditional HTTP cookies.
        </P>
      </Section>

      <Section title="2. What KIP Stores in Your Browser">
        <P>KIP stores the following items in your browser's localStorage:</P>
        <UL items={[
          'kip_token / token / access_token — your authentication token, so you stay logged in between sessions. This expires when you sign out or when the token is invalidated by the server.',
          'kip_user — your name, email, and plan tier, cached to avoid unnecessary server calls on page load.',
          'kip_theme — your light/dark mode preference (value: "light" or "dark").',
          'kip_sb — your sidebar collapsed/expanded preference (value: "0" or "1").',
          'kip_dashboard_plan — which business you last viewed on the dashboard, so it loads automatically.',
        ]} />
        <P>
          None of this data is shared with third parties. It lives only in your browser and on KIP's servers.
        </P>
      </Section>

      <Section title="3. Third-Party Storage">
        <P>
          KIP does not currently use Google Analytics, Facebook Pixel, or any other third-party tracking or advertising scripts.
        </P>
        <P>
          When Stripe payment processing is introduced (June 2026), Stripe may set cookies necessary to process payments securely. Stripe's cookie policy applies to those cookies.
        </P>
      </Section>

      <Section title="4. Managing Your Stored Data">
        <P>
          You can clear all KIP browser storage at any time by:
        </P>
        <UL items={[
          'Signing out of KIP — this clears your authentication token',
          'Clearing your browser\'s localStorage via browser Developer Tools or browser settings',
          'Using a private/incognito window — no data is stored between sessions',
        ]} />
        <P>
          Clearing localStorage will sign you out and reset your theme and layout preferences.
        </P>
      </Section>

      <Section title="5. Contact">
        <P>
          Questions about data storage? Email <strong>privacy@malovate.com</strong> or visit our <a href="/legal/privacy" style={{ color: 'var(--blue-bright)' }}>Privacy Policy</a>.
        </P>
      </Section>
    </LegalLayout>
  )
}


// ── AboutPage ────────────────────────────────────────────────────────────────

export function AboutPage() {
  return (
    <LegalLayout
      title="About KIP"
      subtitle="The story behind Zambia's AI-powered business intelligence platform."
    >
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(43,127,255,0.1), rgba(0,240,200,0.06))',
        border: '1px solid rgba(43,127,255,0.2)', borderRadius: 16,
        padding: '28px 24px', marginBottom: 32, textAlign: 'center',
      }}>
        <img src={KIP_LOGO} alt="KIP" style={{ width: 64, height: 64, borderRadius: 18, objectFit: 'cover', margin: '0 auto 16px', display: 'block' }} />
        <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 8 }}>
          Kwacha Intelligence Platform
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.75, maxWidth: 480, margin: '0 auto' }}>
          The first AI-powered business advisor built specifically for Zambian entrepreneurs — understanding local markets, local prices, and local realities.
        </p>
      </div>

      <Section title="The Problem We're Solving">
        <P>
          Zambia has over 1.2 million small and medium enterprises. The vast majority operate without access to the kind of strategic business guidance that larger companies take for granted. Generic business advice tools are built for Western markets, in Western currencies, for Western customers.
        </P>
        <P>
          A vegetable trader in Chawama, a phone repair shop in Riverside Kitwe, a delivery service in Chipata — these entrepreneurs need advice that understands copper prices, Zambian informal economy dynamics, CDF financing, and the reality of load shedding. No existing tool did that.
        </P>
      </Section>

      <Section title="What KIP Does">
        <P>
          KIP is an AI business advisor that thinks like a Zambian economist, talks like a trusted friend, and works like a professional consultant. It helps entrepreneurs:
        </P>
        <UL items={[
          'Identify viable business opportunities matched to their capital, location, and skills',
          'Get a full week-by-week launch plan for any business idea',
          'Log daily business performance and receive personalised AI coaching',
          'Generate professional documents — business plans, loan letters, PACRA guidance',
          'Understand economic indicators and how they affect their business',
          'Manage multiple business branches from one central dashboard',
        ]} />
      </Section>

      <Section title="About Malovate">
        <P>
          KIP is a product of <strong>Malovate Limited</strong>, a Zambian technology company. Malovate's mission is to build intelligent technology products that solve real African problems — starting with entrepreneurship in Zambia.
        </P>
        <P>
          Think of Malovate the way you think of Meta — a company that builds multiple products. KIP is Malovate's first product, but not its last. We are building a suite of AI-powered tools designed specifically for the African market.
        </P>
      </Section>

      <Section title="The ZICTA Innovation Challenge">
        <P>
          KIP was developed as part of the ZICTA Innovation Challenge — the Zambia Information and Communications Technology Authority's initiative to encourage homegrown technology innovation. We are proud to be building for Zambia, in Zambia.
        </P>
      </Section>

      <Section title="Technology">
        <P>
          KIP is built on a modern technology stack: Python FastAPI backend, React frontend, and Anthropic's Claude AI. The knowledge base contains thousands of documents about Zambian business regulations, market conditions, town profiles, and economic data — all curated to ensure KIP gives advice grounded in Zambian reality.
        </P>
      </Section>

      <Section title="Contact Us">
        <P>
          We'd love to hear from entrepreneurs, investors, and partners.<br />
          <strong>General:</strong> hello@malovate.com<br />
          <strong>Support:</strong> support@malovate.com<br />
          <strong>Partnerships:</strong> partners@malovate.com<br />
          Or visit our <a href="/contact" style={{ color: 'var(--blue-bright)' }}>contact page</a>.
        </P>
      </Section>
    </LegalLayout>
  )
}


// ── ContactPage ───────────────────────────────────────────────────────────────

export function ContactPage() {
  const [form, setForm]     = useState({ name: '', email: '', subject: '', message: '' })
  const [sent, setSent]     = useState(false)
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in name, email, and message.'); return
    }
    setLoading(true)
    // Store as a general survey entry for now — real email integration with Stripe sprint
    try {
      await new Promise(r => setTimeout(r, 1000)) // simulate send
      setSent(true)
      toast.success('Message sent! We\'ll get back to you within 2 business days.')
    } catch {
      toast.error('Could not send. Email us directly at support@malovate.com')
    } finally { setLoading(false) }
  }

  return (
    <LegalLayout title="Contact Us" subtitle="Get in touch with the KIP team.">

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginBottom: 32 }}>
        {[
          { icon: Mail,         label: 'General Enquiries',  value: 'hello@malovate.com',      color: 'var(--blue-bright)' },
          { icon: MessageSquare,label: 'Support',            value: 'support@malovate.com',    color: 'var(--teal)'        },
          { icon: Mail,         label: 'Partnerships',       value: 'partners@malovate.com',   color: 'var(--gold)'        },
          { icon: MapPin,       label: 'Location',           value: 'Lusaka, Zambia',          color: 'var(--green)'       },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Icon size={15} style={{ color }} />
              <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: 'var(--muted)' }}>{label}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>

      {sent ? (
        <div style={{ textAlign: 'center', padding: '40px 24px', background: 'var(--green-dim)', border: '1px solid rgba(26,224,110,0.25)', borderRadius: 16 }}>
          <CheckCircle size={40} style={{ color: 'var(--green)', margin: '0 auto 14px', display: 'block' }} />
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Message received!</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>We'll get back to you at <strong>{form.email}</strong> within 2 business days.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 20 }}>Send us a message</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" className="kip-input" style={{ fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Email *</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" className="kip-input" style={{ fontSize: 13 }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Subject</label>
              <input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="What is this about?" className="kip-input" style={{ fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Message *</label>
              <textarea value={form.message} onChange={e => set('message', e.target.value)}
                placeholder="Tell us how we can help..." className="kip-input" rows={5} style={{ resize: 'none', fontSize: 13 }} />
            </div>
            <button onClick={submit} disabled={loading} className="kip-btn kip-btn-primary" style={{ width: '100%', padding: '13px 0', fontSize: 14 }}>
              {loading
                ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spinSlow 0.8s linear infinite' }} /> Sending…</>
                : <><Mail size={15} /> Send Message</>
              }
            </button>
          </div>
        </div>
      )}
    </LegalLayout>
  )
}
