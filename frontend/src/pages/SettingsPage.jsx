import React, { useState } from 'react'
import {
  User, Globe, CreditCard, Sun, Moon, AlertTriangle, Zap, X,
} from 'lucide-react'
import { useAuth }  from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import Layout from '../components/Layout'
import LanguageToggle from '../components/LanguageToggle'
import api   from '../lib/api'
import toast from 'react-hot-toast'

function Section({ icon: Icon, title, children, colour = 'blue' }) {
  return (
    <div className="card" style={{ overflow: 'visible', marginBottom: 'var(--space-5)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-5) var(--space-6)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 'var(--radius-sm)',
          background: `var(--${colour}-dim)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} style={{ color: `var(--${colour}-500)` }} />
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', margin: 0 }}>
          {title}
        </h3>
      </div>
      <div style={{ padding: 'var(--space-6)' }}>
        {children}
      </div>
    </div>
  )
}

function DeleteAccountModal({ onClose }) {
  const [password, setPassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async e => {
    e.preventDefault()
    setDeleting(true)
    try {
      // axios sends the body of a DELETE via config.data
      await api.delete('/auth/me', { data: { password } })
      ;['kip_token', 'token', 'access_token', 'kip_user'].forEach(k => localStorage.removeItem(k))
      toast.success('Your account has been deleted.')
      window.location.replace('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not delete your account. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div className="card animate-scale-in" onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 420, padding: 'var(--space-6)',
        border: '1px solid rgba(220,38,38,0.35)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <AlertTriangle size={17} style={{ color: 'var(--red-500)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
              Delete account
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 'var(--space-5)' }}>
          This permanently deletes your account and <strong>all</strong> of your data —
          conversations, business ideas, launch plans, daily logs, and subscription
          records. This cannot be undone.
        </p>

        <form onSubmit={handleDelete}>
          <div className="input-group" style={{ marginBottom: 'var(--space-5)' }}>
            <label className="input-label">Enter your password to confirm</label>
            <input
              className="input" type="password" required autoFocus
              placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={deleting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger btn-sm" disabled={deleting || !password}>
              {deleting ? 'Deleting…' : 'Delete my account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, toggle } = useTheme()
  const [showDelete, setShowDelete] = useState(false)

  const isPremium = ['premium', 'enterprise', 'pro'].includes((user?.plan_tier || 'free').toLowerCase())

  return (
    <Layout>
      <div className="content-area page-enter" style={{ maxWidth: 700 }}>

        {/* Header */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 'var(--space-2)' }}>
            Settings
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Manage your KIP account, language, and preferences.
          </p>
        </div>

        {/* Profile */}
        <Section icon={User} title="Profile" colour="blue">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label className="input-label">Full name</label>
              <input className="input" value={user?.full_name || ''} readOnly disabled />
            </div>
            <div className="input-group">
              <label className="input-label">Email address</label>
              <input className="input" type="email" value={user?.email || ''} readOnly disabled />
            </div>
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-3)', marginBottom: 0 }}>
            Profile editing is coming soon.
          </p>
        </Section>

        {/* Language */}
        <Section icon={Globe} title="Language" colour="gold">
          <div style={{ marginBottom: 'var(--space-3)' }}>
            <LanguageToggle />
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
            Choose the language KIP uses across the app.
          </p>
        </Section>

        {/* Appearance */}
        <Section icon={Sun} title="Appearance" colour="copper">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-6)' }}>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Theme</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>Choose between light and dark mode</div>
            </div>
            <button onClick={toggle} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 'var(--radius-md)',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600,
              color: 'var(--text-secondary)', flexShrink: 0,
            }}>
              {theme === 'dark' ? <><Sun size={13} /> Switch to Light</> : <><Moon size={13} /> Switch to Dark</>}
            </button>
          </div>
        </Section>

        {/* Subscription */}
        <Section icon={CreditCard} title="Subscription" colour="gold">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <span className="badge badge-blue" style={{ fontSize: 12, padding: '4px 12px', textTransform: 'capitalize' }}>
              {user?.plan_tier || 'free'} plan
            </span>
            {!isPremium && (
              <a href="/pricing" className="btn btn-gold btn-shine" style={{ gap: 8, textDecoration: 'none' }}>
                <Zap size={14} /> Upgrade
              </a>
            )}
          </div>
        </Section>

        {/* Danger zone */}
        <div className="card" style={{ padding: 'var(--space-5) var(--space-6)', border: '1px solid rgba(220,38,38,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
                <AlertTriangle size={15} style={{ color: 'var(--red-500)' }} />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--red-500)' }}>
                  Danger zone
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
                Permanently delete your account and all of your data. This cannot be undone.
              </p>
            </div>
            <button className="btn btn-danger btn-sm" style={{ flexShrink: 0 }} onClick={() => setShowDelete(true)}>
              Delete account
            </button>
          </div>
        </div>

        {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} />}
      </div>
    </Layout>
  )
}
