import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import KIP_LOGO from '../kipLogo'
import ParticleBackground from '../components/ParticleBackground'

const PERKS = [
  'Free business idea generation',
  'Live economic news feed',
  'Capital-aware AI recommendations',
  'Daily AI business coaching',
]

export default function RegisterPage() {
  const [form, setForm]       = useState({ full_name: '', email: '', password: '' })
  const [show, setShow]       = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)

      // login() writes to localStorage synchronously
      login(data.access_token, data.user)

      toast.success(`Welcome to KIP, ${data.user.full_name.split(' ')[0]}!`)

      // Use window.location.replace instead of navigate()
      // React state (token in context) updates async — localStorage is sync.
      // Protected component reads localStorage so this is always reliable.
      window.location.replace('/dashboard')

    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      <ParticleBackground />

      <div className="animate-scale-in" style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        <div className="glass-panel" style={{ padding: '36px 36px' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
              <div style={{
                position: 'absolute', inset: -10, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0,212,177,0.3) 0%, transparent 70%)',
                filter: 'blur(12px)',
              }} className="animate-pulse-soft" />
              <img src={KIP_LOGO} alt="KIP" style={{
                position: 'relative', width: 56, height: 56,
                borderRadius: 16, objectFit: 'cover',
                boxShadow: '0 0 28px rgba(0,212,177,0.35)',
              }} className="animate-logo-glow" />
            </div>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, letterSpacing: '0.12em', color: '#fff', marginBottom: 2 }}>KIP</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em' }}>KWACHA INTELLIGENCE PLATFORM</div>
          </div>

          <h1 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 20, color: '#fff', textAlign: 'center', marginBottom: 5 }}>
            Create your account
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginBottom: 18 }}>
            Join Zambia's smartest business advisor
          </p>

          {/* Perks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 22 }}>
            {PERKS.map(p => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={12} style={{ color: 'var(--teal)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{p}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 7, fontFamily: 'Syne' }}>
                Full name
              </label>
              <input
                type="text" required placeholder="e.g. Natasha Maloba"
                className="kip-input" value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 7, fontFamily: 'Syne' }}>
                Email address
              </label>
              <input
                type="email" required placeholder="you@example.com"
                className="kip-input" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 7, fontFamily: 'Syne' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={show ? 'text' : 'password'} required placeholder="Min. 8 characters"
                  className="kip-input" style={{ paddingRight: 44 }}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button" onClick={() => setShow(!show)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--faint)',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="kip-btn kip-btn-primary"
              style={{ width: '100%', marginTop: 6, padding: '13px 0', fontSize: 14 }}
            >
              {loading
                ? <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spinSlow 0.8s linear infinite' }} />
                : <>Create Account <ArrowRight size={16} /></>
              }
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 18 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--blue-bright)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <Link to="/" style={{ fontSize: 12, color: 'var(--faint)', textDecoration: 'none' }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
