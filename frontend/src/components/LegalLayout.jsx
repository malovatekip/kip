import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import KIP_LOGO from '../kipLogo'

export default function LegalLayout({ title, subtitle, lastUpdated, children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', color: 'var(--text)' }}>

      {/* Minimal header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(20px)',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src={KIP_LOGO} alt="KIP" style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover' }} />
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, letterSpacing: '0.1em', color: 'var(--text)' }}>KIP</span>
        </Link>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)', textDecoration: 'none', fontFamily: 'Syne', fontWeight: 600 }}>
          <ArrowLeft size={13} /> Back to Home
        </Link>
      </header>

      {/* Content */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Title block */}
        <div style={{ marginBottom: 36, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, color: 'var(--text)', marginBottom: 8, lineHeight: 1.2 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.65, marginBottom: 12 }}>{subtitle}</p>
          )}
          {lastUpdated && (
            <span style={{
              fontSize: 11, fontFamily: 'Syne', fontWeight: 600,
              color: 'var(--blue-bright)', background: 'var(--blue-dim)',
              border: '1px solid rgba(43,127,255,0.25)',
              padding: '3px 10px', borderRadius: 20,
            }}>
              Last updated: {lastUpdated}
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)' }}>
          {children}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '20px 24px', textAlign: 'center', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 10 }}>
          {[
            { to: '/legal/terms',   l: 'Terms of Use'    },
            { to: '/legal/privacy', l: 'Privacy Policy'  },
            { to: '/legal/cookies', l: 'Cookie Policy'   },
            { to: '/about',         l: 'About KIP'       },
            { to: '/contact',       l: 'Contact'         },
          ].map(({ to, l }) => (
            <Link key={to} to={to} style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none', fontFamily: 'Syne', fontWeight: 600 }}>
              {l}
            </Link>
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'var(--faint)', margin: 0 }}>
          © {new Date().getFullYear()} Malovate Ltd · Kwacha Intelligence Platform · Zambia
        </p>
      </div>
    </div>
  )
}

/* ── Section helpers used by legal pages ── */
export function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{
        fontFamily: 'Syne', fontWeight: 800, fontSize: 16,
        color: 'var(--blue-bright)', marginBottom: 12,
        paddingBottom: 8, borderBottom: '1px solid var(--border)',
      }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

export function P({ children }) {
  return <p style={{ marginBottom: 12, color: 'var(--text)', lineHeight: 1.8 }}>{children}</p>
}

export function UL({ items }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, marginBottom: 14 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          <span style={{ color: 'var(--blue-bright)', fontSize: 10, marginTop: 5, flexShrink: 0 }}>▸</span>
          <span style={{ color: 'var(--text)', lineHeight: 1.7 }}>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function Callout({ color = 'var(--gold)', children }) {
  return (
    <div style={{
      background: `${color}0D`, border: `1px solid ${color}30`,
      borderLeft: `3px solid ${color}`, borderRadius: '0 10px 10px 0',
      padding: '12px 16px', marginBottom: 16, fontSize: 13,
      color: 'var(--text)', lineHeight: 1.7,
    }}>
      {children}
    </div>
  )
}
