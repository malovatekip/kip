import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import KIP_LOGO from '../kipLogo'
import Footer from '../components/Footer'

const PERKS = [
  'Free business idea generation',
  'Live economic news feed',
  'Capital-aware AI recommendations',
  'Daily AI business coaching',
]

export default function RegisterPage() {
  const [form,    setForm]    = useState({ full_name: '', email: '', password: '' })
  const [show,    setShow]    = useState(false)
  const [agreed,  setAgreed]  = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    if (!agreed) {
      toast.error('Please accept the Terms of Use and Privacy Policy.')
      return
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      const token = data.access_token

      // Store immediately before calling login()
      ;['kip_token','token','access_token'].forEach(k => localStorage.setItem(k, token))
      localStorage.setItem('kip_user', JSON.stringify(data.user))
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`

      login(token, data.user)

      toast.success(`Welcome to KIP, ${(data.user.full_name || '').split(' ')[0]}! Check your email to verify your account.`)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="animate-scale-in" style={{ width: '100%', maxWidth: 440 }}>
          <div className="glass-panel" style={{ padding: '36px 36px' }}>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
                <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,240,200,0.3) 0%,transparent 70%)', filter: 'blur(12px)' }} className="animate-pulse-soft" />
                <img src={KIP_LOGO} alt="KIP" style={{ position: 'relative', width: 56, height: 56, borderRadius: 16, objectFit: 'cover', boxShadow: '0 0 28px rgba(0,212,177,0.35)' }} className="animate-logo-glow" />
              </div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, letterSpacing: '0.12em', color: 'var(--text)', marginBottom: 2 }}>KIP</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.04em' }}>KWACHA INTELLIGENCE PLATFORM</div>
            </div>

            <h1 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 20, color: 'var(--text)', textAlign: 'center', marginBottom: 5 }}>
              Create your account
            </h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginBottom: 16 }}>
              Join Zambia's AI business advisor — free for 30 days
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 20 }}>
              {PERKS.map(p => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={12} style={{ color: 'var(--teal)', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{p}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 7, fontFamily: 'Syne' }}>Full name</label>
                <input type="text" required placeholder="e.g. Mwila Banda" className="kip-input"
                  value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 7, fontFamily: 'Syne' }}>Email address</label>
                <input type="email" required placeholder="you@example.com" className="kip-input"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 7, fontFamily: 'Syne' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={show ? 'text' : 'password'} required placeholder="Min. 8 characters"
                    className="kip-input" style={{ paddingRight: 44 }}
                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                  <button type="button" onClick={() => setShow(s => !s)} style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer',
                  }}>
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Terms checkbox */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'var(--input-bg)', border: `1px solid ${agreed ? 'rgba(43,127,255,0.35)' : 'var(--border)'}`, borderRadius: 10 }}>
                <button type="button" onClick={() => setAgreed(a => !a)} style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  background: agreed ? 'var(--blue)' : 'transparent',
                  border: `2px solid ${agreed ? 'var(--blue)' : 'var(--border-h)'}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {agreed && <CheckCircle size={12} color="#fff" />}
                </button>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                  I agree to KIP's{' '}
                  <Link to="/legal/terms" target="_blank" style={{ color: 'var(--blue-bright)', fontWeight: 600, textDecoration: 'none' }}>Terms of Use</Link>
                  {' '}and{' '}
                  <Link to="/legal/privacy" target="_blank" style={{ color: 'var(--blue-bright)', fontWeight: 600, textDecoration: 'none' }}>Privacy Policy</Link>.
                  KIP's AI responses are informational only.
                </p>
              </div>

              <button type="submit" disabled={loading || !agreed} className="kip-btn kip-btn-primary"
                style={{ width: '100%', marginTop: 4, padding: '13px 0', fontSize: 14, opacity: !agreed ? 0.55 : 1 }}>
                {loading
                  ? <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spinSlow 0.8s linear infinite' }} />
                  : <>Create Account <ArrowRight size={16} /></>
                }
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 18 }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--blue-bright)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
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
