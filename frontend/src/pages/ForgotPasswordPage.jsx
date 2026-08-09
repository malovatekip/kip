import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MailCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import KIP_LOGO from '../kipLogo'
import ParticleBackground from '../components/ParticleBackground'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
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

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <img src={KIP_LOGO} alt="KIP" style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'cover', marginBottom: 12 }} className="animate-logo-glow" />
            <h1 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 22, color: '#fff', marginBottom: 6 }}>
              Forgot your password?
            </h1>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Enter your email and we'll send you a link to reset it.
            </p>
          </div>

          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <MailCheck size={40} style={{ color: 'var(--teal)', marginBottom: 12 }} />
              <p style={{ fontSize: 13.5, color: 'var(--text)', marginBottom: 8, fontWeight: 600 }}>
                Check your inbox
              </p>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
                If an account exists for <strong>{email}</strong>, we've sent a password reset
                link. It expires in 1 hour.
              </p>
              <Link to="/login" className="kip-btn kip-btn-primary" style={{ display: 'inline-flex', padding: '12px 28px', textDecoration: 'none' }}>
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 7, fontFamily: 'Syne' }}>
                  Email address
                </label>
                <input
                  type="email" required placeholder="you@example.com"
                  className="kip-input" value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="kip-btn kip-btn-primary"
                style={{ width: '100%', marginTop: 8, padding: '13px 0', fontSize: 14 }}
              >
                {loading
                  ? <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spinSlow 0.8s linear infinite' }} />
                  : <>Send Reset Link <ArrowRight size={16} /></>
                }
              </button>
            </form>
          )}

          {!sent && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 22 }}>
              Remembered it?{' '}
              <Link to="/login" style={{ color: 'var(--blue-bright)', fontWeight: 600, textDecoration: 'none' }}>
                Back to Sign In
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
