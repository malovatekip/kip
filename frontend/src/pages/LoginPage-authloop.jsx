import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import KIP_LOGO from '../kipLogo'
import Footer from '../components/Footer'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [show,     setShow]     = useState(false)
  const [loading,  setLoading]  = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })

      // ── Store token under ALL keys immediately ──────────────────────────
      const token = data.access_token
      localStorage.setItem('kip_token',     token)
      localStorage.setItem('token',         token)
      localStorage.setItem('access_token',  token)
      localStorage.setItem('kip_user',      JSON.stringify(data.user))

      // ── Set axios header immediately (belt AND suspenders) ──────────────
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`

      // ── Call useAuth login to sync React state ──────────────────────────
      login(token, data.user)

      toast.success(`Welcome back, ${data.user.full_name.split(' ')[0]}!`)
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Incorrect email or password.'
      toast.error(msg)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="animate-scale-in" style={{ width: '100%', maxWidth: 420 }}>
          <div className="glass-panel" style={{ padding: '36px 32px' }}>

            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: 26 }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
                <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', background: 'radial-gradient(circle, rgba(43,127,255,0.25) 0%, transparent 70%)', filter: 'blur(12px)' }} className="animate-pulse-soft" />
                <img src={KIP_LOGO} alt="KIP" style={{ position: 'relative', width: 54, height: 54, borderRadius: 15, objectFit: 'cover', boxShadow: '0 0 28px rgba(43,127,255,0.4)' }} className="animate-logo-glow" />
              </div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, letterSpacing: '0.12em', color: 'var(--text)', marginBottom: 2 }}>KIP</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em' }}>KWACHA INTELLIGENCE PLATFORM</div>
            </div>

            <h1 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 20, color: 'var(--text)', textAlign: 'center', marginBottom: 5 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginBottom: 22 }}>
              Sign in to your KIP account
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 7, fontFamily: 'Syne' }}>
                  Email address
                </label>
                <input
                  type="email" required autoComplete="email"
                  placeholder="you@example.com"
                  className="kip-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 7, fontFamily: 'Syne' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={show ? 'text' : 'password'} required autoComplete="current-password"
                    placeholder="Your password"
                    className="kip-input" style={{ paddingRight: 44 }}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShow(!show)} style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer',
                  }}>
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="kip-btn kip-btn-primary"
                style={{ width: '100%', marginTop: 4, padding: '13px 0', fontSize: 14 }}
              >
                {loading ? (
                  <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spinSlow 0.8s linear infinite' }} />
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 18 }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: 'var(--blue-bright)', fontWeight: 600, textDecoration: 'none' }}>
                Create one free
              </Link>
            </p>
          </div>

          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <Link to="/" style={{ fontSize: 12, color: 'var(--faint)', textDecoration: 'none' }}>← Back to home</Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
