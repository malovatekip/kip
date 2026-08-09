import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import KIP_LOGO from '../kipLogo'
import ParticleBackground from '../components/ParticleBackground'

export default function LoginPage() {
  const [form, setForm]     = useState({ email: '', password: '' })
  const [show, setShow]     = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)

      // login() saves token to localStorage synchronously
      login(data.access_token, data.user)

      toast.success(`Welcome back, ${data.user.full_name.split(' ')[0]}!`)

      // window.location.replace is used instead of navigate()
      // because React state updates are async — the Protected component
      // would read the old (null) token before setState propagates.
      // localStorage is written synchronously so this always works.
      window.location.replace('/dashboard')

    } catch (err) {
      toast.error(err.response?.data?.detail || 'Incorrect email or password.')
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

      <div className="animate-scale-in" style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div className="glass-panel" style={{ padding: '40px 36px' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 14 }}>
              <div style={{
                position: 'absolute', inset: -10, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(27,110,243,0.35) 0%, transparent 70%)',
                filter: 'blur(12px)',
              }} className="animate-pulse-soft" />
              <img src={KIP_LOGO} alt="KIP" style={{
                position: 'relative', width: 60, height: 60,
                borderRadius: 18, objectFit: 'cover',
                boxShadow: '0 0 30px rgba(27,110,243,0.4)',
              }} className="animate-logo-glow" />
            </div>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, letterSpacing: '0.12em', color: '#fff', marginBottom: 3 }}>KIP</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.06em' }}>KWACHA INTELLIGENCE PLATFORM</div>
          </div>

          <h1 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 22, color: '#fff', textAlign: 'center', marginBottom: 6 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginBottom: 28 }}>
            Sign in to your KIP account
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', fontFamily: 'Syne' }}>
                  Password
                </label>
                <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--blue-bright)', fontWeight: 600, textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={show ? 'text' : 'password'} required placeholder="••••••••"
                  className="kip-input" style={{ paddingRight: 44 }}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button" onClick={() => setShow(!show)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--faint)',
                    cursor: 'pointer', padding: 0, transition: 'color 0.2s',
                  }}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="kip-btn kip-btn-primary"
              style={{ width: '100%', marginTop: 8, padding: '13px 0', fontSize: 14 }}
            >
              {loading
                ? <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spinSlow 0.8s linear infinite' }} />
                : <>Sign In <ArrowRight size={16} /></>
              }
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 22 }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--blue-bright)', fontWeight: 600, textDecoration: 'none' }}>
              Create one free
            </Link>
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/" style={{ fontSize: 12, color: 'var(--faint)', textDecoration: 'none' }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
