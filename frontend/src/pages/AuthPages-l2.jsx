// ── LoginPage.jsx ──────────────────────────────────────────────────────────
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap, ArrowRight, AlertCircle } from 'lucide-react'
import { useT }    from '../context/TranslationContext'
import { useAuth } from '../hooks/useAuth'
import KipBackground from '../components/KipBackground'
import {
  FinancialLiteracyIllustration,
  FinancialHealthIllustration,
  BusinessIllustration,
} from '../components/KipIllustrations'

function StatPill({ value, label, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 16px',
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.8)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600, textAlign: 'center', maxWidth: 80 }}>{label}</div>
    </div>
  )
}

export function LoginPage() {
  const { t }        = useT()
  const { login }    = useAuth()
  const navigate     = useNavigate()
  const [email,      setEmail]    = useState('')
  const [password,   setPassword] = useState('')
  const [showPass,   setShowPass] = useState(false)
  const [loading,    setLoading]  = useState(false)
  const [error,      setError]    = useState('')

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!email || !password) { setError(t('common.required_field')); return }
    setLoading(true); setError('')
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || t('auth.error_invalid'))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', position: 'relative', background: 'var(--bg-base)' }}>
      <KipBackground />

      {/* Left — hero panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 64px', position: 'relative', zIndex: 1,
      }}
        className="hide-mobile"
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 64 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--blue-500), var(--blue-700))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(26,108,240,0.35)',
          }}>
            <Zap size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>KIP</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>Kwacha Intelligence Platform</div>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: 'clamp(32px, 3.5vw, 52px)', color: 'var(--text-primary)',
          letterSpacing: '-0.03em', lineHeight: 1.1,
          marginBottom: 20, maxWidth: 480,
        }}>
          The intelligence every<br />
          <span style={{ color: 'var(--blue-500)' }}>Zambian entrepreneur</span><br />
          deserves.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-muted)', maxWidth: 400, lineHeight: 1.7, marginBottom: 48 }}>
          AI-powered business ideas, daily coaching, financial literacy courses, and capital access — built for Zambia.
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 56 }}>
          <StatPill value="1.2M+"   label="SMEs in Zambia"        color="var(--blue-500)"  />
          <StatPill value="46.1%"   label="Financially Literate"  color="var(--gold-500)"  />
          <StatPill value="K49/mo"  label="Premium Access"        color="var(--green-500)" />
        </div>

        {/* Illustration cluster */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
          <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 20, padding: 16, boxShadow: 'var(--shadow-md)' }}>
            <FinancialLiteracyIllustration width={160} height={120} />
          </div>
          <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 20, padding: 16, boxShadow: 'var(--shadow-md)', marginBottom: 20 }}>
            <BusinessIllustration width={140} height={105} />
          </div>
          <div style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 20, padding: 16, boxShadow: 'var(--shadow-md)' }}>
            <FinancialHealthIllustration width={140} height={105} />
          </div>
        </div>
      </div>

      {/* Right — login form */}
      <div style={{
        width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '48px 48px',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(24px)',
        borderLeft: '1px solid var(--border)',
        position: 'relative', zIndex: 1,
        boxShadow: '-8px 0 48px rgba(12,20,33,0.06)',
      }}>

        {/* Mobile logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }} className="show-mobile-only">
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--blue-500), var(--blue-700))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={18} color="#fff" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>KIP</span>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 8 }}>
          {t('auth.login_title')}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 36 }}>
          {t('auth.login_subtitle')}
        </p>

        {error && (
          <div className="callout callout-red" style={{ marginBottom: 20, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="input-group">
            <label className="input-label">{t('auth.email_label')}</label>
            <input
              className="input input-lg"
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder={t('auth.email_placeholder')}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="input-label">{t('auth.password_label')}</label>
              <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--blue-500)', fontWeight: 600 }}>
                {t('auth.forgot_password')}
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                className="input input-lg"
                type={showPass ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder={t('auth.password_placeholder')}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                autoComplete="current-password"
                style={{ paddingRight: 48 }}
              />
              <button
                type="button" onClick={() => setShowPass(s => !s)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading} className="btn btn-primary btn-full btn-xl btn-shine" style={{ marginTop: 4 }}>
            {loading ? 'Signing in…' : <>{t('auth.login_button')} <ArrowRight size={16} /></>}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: 'var(--text-muted)' }}>
          {t('auth.no_account')}{' '}
          <Link to="/register" style={{ color: 'var(--blue-500)', fontWeight: 700, textDecoration: 'none' }}>
            {t('auth.sign_up')}
          </Link>
        </div>

        <div style={{ marginTop: 36, padding: '14px 16px', background: 'var(--blue-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--blue-100)', fontSize: 13, color: 'var(--blue-600)', textAlign: 'center' }}>
          {t('auth.trial_message')}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .show-mobile-only { display: flex !important; }
        }
        .show-mobile-only { display: none; }
      `}</style>
    </div>
  )
}

// ── RegisterPage.jsx ───────────────────────────────────────────────────────
export function RegisterPage() {
  const { t }      = useT()
  const { register } = useAuth()
  const navigate   = useNavigate()
  const [form,     setForm]    = useState({ name: '', email: '', password: '' })
  const [showPass, setShowPass]= useState(false)
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) { setError(t('common.required_field')); return }
    if (form.password.length < 8) { setError(t('auth.error_weak_password')); return }
    setLoading(true); setError('')
    try {
      await register(form.name, form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || t('auth.error_email_taken'))
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'var(--bg-base)', padding: '24px 16px' }}>
      <KipBackground />

      <div style={{
        width: '100%', maxWidth: 480,
        background: 'rgba(255,255,255,0.90)',
        backdropFilter: 'blur(24px)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-2xl)',
        padding: '48px 44px',
        boxShadow: 'var(--shadow-xl)',
        position: 'relative', zIndex: 1,
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, var(--blue-500), var(--blue-700))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(26,108,240,0.30)' }}>
            <Zap size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>KIP</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Kwacha Intelligence Platform</div>
          </div>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 8 }}>
          {t('auth.register_title')}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>
          {t('auth.register_subtitle')}
        </p>

        {error && (
          <div className="callout callout-red" style={{ marginBottom: 20, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="input-group">
            <label className="input-label">{t('auth.name_label')}</label>
            <input className="input" type="text" value={form.name} onChange={set('name')} placeholder={t('auth.name_placeholder')} autoComplete="name" />
          </div>
          <div className="input-group">
            <label className="input-label">{t('auth.email_label')}</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} placeholder={t('auth.email_placeholder')} autoComplete="email" />
          </div>
          <div className="input-group">
            <label className="input-label">{t('auth.password_label')}</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder={t('auth.password_placeholder')} style={{ paddingRight: 48 }} autoComplete="new-password" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              <button type="button" onClick={() => setShowPass(s=>!s)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.password.length > 0 && form.password.length < 8 && (
              <span className="input-hint" style={{ color: 'var(--red-500)' }}>{t('auth.error_weak_password')}</span>
            )}
          </div>

          <button onClick={handleSubmit} disabled={loading} className="btn btn-primary btn-full btn-lg btn-shine" style={{ marginTop: 4 }}>
            {loading ? 'Creating account…' : <>{t('auth.register_button')} <ArrowRight size={16} /></>}
          </button>
        </div>

        {/* Social proof */}
        <div style={{ marginTop: 28, padding: '14px 16px', background: 'linear-gradient(135deg, var(--gold-50), var(--copper-50))', borderRadius: 'var(--radius-md)', border: '1px solid var(--gold-100)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-700)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={12} /> {t('auth.trial_message')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {t('trial.discount_women')} · {t('trial.discount_disabled')}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--text-muted)' }}>
          {t('auth.has_account')}{' '}
          <Link to="/login" style={{ color: 'var(--blue-500)', fontWeight: 700, textDecoration: 'none' }}>{t('auth.sign_in')}</Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
