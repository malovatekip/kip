import React from 'react'
import { Link } from 'react-router-dom'
import KIP_LOGO from '../kipLogo'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
      padding: '32px 24px 24px',
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Top row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32, marginBottom: 28 }}>

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <img src={KIP_LOGO} alt="KIP" style={{ width: 34, height: 34, borderRadius: 9, objectFit: 'cover' }} />
              <div>
                <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, letterSpacing: '0.1em', color: 'var(--text)' }}>KIP</div>
                <div style={{ fontSize: 9, color: 'var(--muted)' }}>by Malovate</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>
              Zambia's AI-powered business intelligence platform. Built for Zambian entrepreneurs.
            </p>
          </div>

          {/* Product */}
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Product
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { to: '/register', label: 'Get Started Free' },
                { to: '/login',    label: 'Sign In'          },
                { to: '/about',    label: 'About KIP'        },
                { to: '/contact',  label: 'Contact Us'       },
                { to: '/pricing', label: 'Pricing' }
              ].map(({ to, label }) => (
                <Link key={to} to={to} style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = 'var(--text)'}
                  onMouseLeave={e => e.target.style.color = 'var(--muted)'}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Legal
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { to: '/legal/terms',   label: 'Terms of Use'   },
                { to: '/legal/privacy', label: 'Privacy Policy' },
                { to: '/legal/cookies', label: 'Cookie Policy'  },
              ].map(({ to, label }) => (
                <Link key={to} to={to} style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = 'var(--text)'}
                  onMouseLeave={e => e.target.style.color = 'var(--muted)'}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Contact
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'General',      value: 'malovate.tech@gmail.com'    },
                { label: 'Support',      value: 'kip.support@gmail.com'  },
                { label: 'Whatsapp', value: '+260750925784' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: 'var(--faint)', fontFamily: 'Syne', fontWeight: 600, marginBottom: 1 }}>{label}</div>
                  <a href={`mailto:${value}`} style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>{value}</a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div style={{
          borderTop: '1px solid var(--border)', paddingTop: 18,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: 10,
        }}>
          <p style={{ fontSize: 11, color: 'var(--faint)', margin: 0 }}>
            © {year} Malovate Limited · Zambia · All rights reserved
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ fontSize: 11, color: 'var(--faint)' }}>
              AI responses are informational only — not professional financial advice
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
