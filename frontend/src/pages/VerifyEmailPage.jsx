import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import api from '../lib/api'
import KIP_LOGO from '../kipLogo'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('verifying') // verifying | success | error
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Missing verification token.')
      return
    }
    api.get('/auth/verify-email', { params: { token } })
      .then(() => {
        setStatus('success')
        setMessage('Your email has been verified.')
      })
      .catch(err => {
        setStatus('error')
        setMessage(err.response?.data?.detail || 'Verification failed. The link may have expired.')
      })
  }, [token])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="animate-scale-in" style={{ width: '100%', maxWidth: 420 }}>
        <div className="glass-panel" style={{ padding: '36px 36px', textAlign: 'center' }}>
          <img src={KIP_LOGO} alt="KIP" style={{ width: 48, height: 48, borderRadius: 14, objectFit: 'cover', marginBottom: 16 }} />

          {status === 'verifying' && (
            <>
              <Loader2 size={40} style={{ color: 'var(--blue-bright)', animation: 'spinSlow 0.8s linear infinite', marginBottom: 12 }} />
              <h1 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>Verifying your email…</h1>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle size={40} style={{ color: 'var(--teal)', marginBottom: 12 }} />
              <h1 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Email verified!</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{message}</p>
              <button className="kip-btn kip-btn-primary" style={{ width: '100%', padding: '12px 0' }}
                onClick={() => navigate('/dashboard', { replace: true })}>
                Go to Dashboard
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle size={40} style={{ color: 'var(--danger, #e35a5a)', marginBottom: 12 }} />
              <h1 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 6 }}>Verification failed</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{message}</p>
              <Link to="/dashboard" style={{ fontSize: 13, color: 'var(--blue-bright)', fontWeight: 600, textDecoration: 'none' }}>
                Go to Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
