import React, { useState, useEffect } from 'react'
import {
  User, Globe, Bell, Shield, CreditCard,
  Save, Check, AlertTriangle, ChevronRight, Moon, Sun,
} from 'lucide-react'
import { useT }   from '../context/TranslationContext'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
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

function SettingRow({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-6)', padding: 'var(--space-4) 0', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        {hint && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function Toggle({ value, onChange, colour = 'blue' }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, position: 'relative',
      background: value ? `var(--${colour}-500)` : 'var(--border)',
      border: 'none', cursor: 'pointer',
      transition: 'background var(--transition-fast)',
    }}>
      <div style={{
        position: 'absolute', top: 2,
        left: value ? 22 : 2,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff', boxShadow: 'var(--shadow-sm)',
        transition: 'left var(--transition-fast)',
      }} />
    </button>
  )
}

export default function SettingsPage() {
  const { t }             = useT()
  const { user, refreshUser } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    email:     user?.email     || '',
    phone:     user?.phone     || '',
    location:  user?.location  || '',
  })
  const [notifications, setNotifications] = useState({
    daily_reminder: true,
    news_alerts:    true,
    weekly_report:  false,
  })
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await api.put('/user/profile', profile)
      if (refreshUser) await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      toast.success(t('common.saved'))
    } catch {
      toast.error(t('common.error_generic'))
    } finally { setSaving(false) }
  }

  return (
    <div className="content-area page-enter" style={{ maxWidth: 700 }}>

      {/* Header */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-3xl)', color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 'var(--space-2)' }}>
          {t('settings.title')}
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Manage your KIP account, language, and preferences.
        </p>
      </div>

      {/* Profile */}
      <Section icon={User} title={t('settings.profile_section')} colour="blue">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          <div className="input-group">
            <label className="input-label">{t('settings.name_label')}</label>
            <input className="input" value={profile.full_name}
              onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
          </div>
          <div className="input-group">
            <label className="input-label">{t('settings.email_label')}</label>
            <input className="input" type="email" value={profile.email}
              onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="input-group">
            <label className="input-label">{t('settings.phone_label')}</label>
            <input className="input" value={profile.phone} placeholder="+260 97..."
              onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="input-group">
            <label className="input-label">{t('settings.location_label')}</label>
            <input className="input" value={profile.location} placeholder="e.g. Riverside, Kitwe"
              onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} />
          </div>
        </div>
        <button onClick={handleSaveProfile} disabled={saving}
          className={`btn ${saved ? 'btn-secondary' : 'btn-primary'}`} style={{ gap: 8 }}>
          {saved ? <><Check size={15} /> Saved</> : saving ? 'Saving…' : <><Save size={15} /> {t('settings.save_settings')}</>}
        </button>
      </Section>

      {/* Language */}
      <Section icon={Globe} title={t('settings.language_section')} colour="gold">
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <LanguageToggle />
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
          {t('settings.language_note')}
        </p>
      </Section>

      {/* Appearance */}
      <Section icon={Sun} title="Appearance" colour="copper">
        <SettingRow label="Theme" hint="Choose between light and dark mode">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
            <button onClick={toggleTheme} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 'var(--radius-md)',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 600,
              color: 'var(--text-secondary)',
            }}>
              {theme === 'dark' ? <><Sun size={13} /> Switch to Light</> : <><Moon size={13} /> Switch to Dark</>}
            </button>
          </div>
        </SettingRow>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title={t('settings.notifications_section')} colour="blue">
        {[
          { key: 'daily_reminder', label: t('settings.daily_reminder'),  hint: 'Remind me to log my daily revenue and expenses' },
          { key: 'news_alerts',    label: t('settings.news_alerts'),     hint: 'KIP Alerts for economic news affecting your business' },
          { key: 'weekly_report',  label: 'Weekly performance report',   hint: 'Summary of the week emailed every Sunday' },
        ].map(({ key, label, hint }) => (
          <SettingRow key={key} label={label} hint={hint}>
            <Toggle value={notifications[key]} onChange={v => setNotifications(n => ({ ...n, [key]: v }))} />
          </SettingRow>
        ))}
      </Section>

      {/* Subscription */}
      <Section icon={CreditCard} title={t('settings.subscription_section')} colour="gold">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              <span className="badge badge-blue" style={{ fontSize: 12, padding: '4px 12px' }}>
                {user?.plan === 'premium' ? 'Premium' : 'Free Trial'}
              </span>
              {user?.trial_days_remaining > 0 && (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  {user.trial_days_remaining} {t('trial.days_remaining')}
                </span>
              )}
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
              {t('trial.discount_women')} · {t('trial.discount_disabled')}
            </p>
          </div>
          {user?.plan !== 'premium' && (
            <button className="btn btn-gold btn-shine" style={{ gap: 8 }}>
              <Zap size={14} /> {t('trial.upgrade_now')}
            </button>
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
                {t('settings.danger_section')}
              </span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
              {t('settings.delete_warning')}
            </p>
          </div>
          <button className="btn btn-danger btn-sm" style={{ flexShrink: 0 }}>
            {t('settings.delete_account')}
          </button>
        </div>
      </div>
    </div>
  )
}
