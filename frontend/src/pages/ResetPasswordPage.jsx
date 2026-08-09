import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../lib/api'
import KIP_LOGO from '../kipLogo'
import ParticleBackground from '../components/ParticleBackground'

// Pydantic validation errors (422) arrive as an array of {msg}; everything
// else as a plain detail string.
function errorMessage(err, fallback) {
  const detail = err.response?.data?.detail
  if (Array.isArray(detail)) return detail[0]?.msg?.replace(/^Value error,\s*/, '') || fallback
  return detail || fallback
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [form, setForm]       = useState({ password: '', confirm: '' })
  const [show, setShow]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, new_password: form.password })
      setDone(true)
    } catch (err) {
      toast.error(errorMessage(err, 'Could not reset password. The link may have expired.'))
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
              Choose a new password
            </h1>
          </div>

          {!token ? (
            <div style={{ textAlign: 'center' }}>
              <XCircle size={40} style={{ color: 'var(--danger, #e35a5a)', marginBottom: 12 }} />
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                This reset link is missing its token. Please use the link from your email,
                or request a new one.
              </p>
              <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--blue-bright)', fontWeight: 600, textDecoration: 'none' }}>
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle size={40} style={{ color: 'var(--teal)', marginBottom: 12 }} />
              <p style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600, marginBottom: 8 }}>
                Password updated
              </p>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
                You've been signed out of all devices. Sign in with your new password.
              </p>
              <Link to="/login" className="kip-btn kip-btn-primary" style={{ display: 'inline-flex', padding: '12px 28px', textDecoration: 'none' }}>
                Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 7, fontFamily: 'Syne' }}>
                  New password
                </label>
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
                      cursor: 'pointer', padding: 0,
                    }}
                  >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: 'var(--faint)', marginTop: 6 }}>
                  At least 8 characters, with a letter and a number.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 7, fontFamily: 'Syne' }}>
                  Confirm new password
                </label>
                <input
                  type={show ? 'text' : 'password'} required placeholder="••••••••"
                  className="kip-input"
                  value={form.confirm}
                  onChange={e => setForm({ ...form, confirm: e.target.value })}
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="kip-btn kip-btn-primary"
                style={{ width: '100%', marginTop: 8, padding: '13px 0', fontSize: 14 }}
              >
                {loading
                  ? <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spinSlow 0.8s linear infinite' }} />
                  : <>Reset Password <ArrowRight size={16} /></>
                }
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
