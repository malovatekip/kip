// Shared building blocks for the field collector screens: a lean full-screen
// shell (one-handed phone use, no sidebar), form controls and the hooks for
// GPS and the offline outbox.
import React, { useEffect, useState, useCallback } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowLeft, CloudOff, CloudUpload, Crosshair } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { watchPosition } from '../../lib/geo'
import { getOutbox, onOutboxChange, syncNow } from '../../lib/fieldStore'

// Must match the server limits in backend/app/services/ground_truth.py.
export const MAX_BUSINESS_ACCURACY_M = Number(import.meta.env.VITE_FIELD_MAX_GPS_ACCURACY_M) || 15
export const MAX_MARKET_ACCURACY_M = Math.max(50, MAX_BUSINESS_ACCURACY_M)

export const isCollector = user => !!user && (user.is_admin || ['collector', 'supervisor'].includes(user.role))
export const isSupervisor = user => !!user && (user.is_admin || user.role === 'supervisor')

/** Route guard: collectors only (or supervisors only with `supervisor`). */
export function FieldGuard({ children, supervisor = false }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!(supervisor ? isSupervisor(user) : isCollector(user))) return <Navigate to="/dashboard" replace />
  return children
}

export function useGps() {
  const [fix, setFix] = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => watchPosition(f => { setFix(f); setError(null) }, setError), [])
  return { fix, error }
}

export function useOutbox() {
  const [items, setItems] = useState([])
  const [syncing, setSyncing] = useState(false)
  const refresh = useCallback(() => { getOutbox().then(setItems) }, [])
  useEffect(() => { refresh(); return onOutboxChange(refresh) }, [refresh])

  const sync = useCallback(async ({ quiet = false } = {}) => {
    if (!navigator.onLine) {
      if (!quiet) toast.error('No connection. Your records are saved on this phone.')
      return
    }
    setSyncing(true)
    try {
      const s = await syncNow()
      if (!quiet || s.sent || s.rejected) {
        if (s.rejected) toast.error(`${s.rejected} record(s) were rejected. See the home screen.`)
        else if (s.sent) toast.success(`${s.sent} record(s) uploaded.`)
        else if (!quiet) toast.success('Everything is already uploaded.')
      }
    } catch {
      if (!quiet) toast.error('Upload failed. Your records are still saved on this phone.')
    } finally {
      setSyncing(false)
    }
  }, [])

  // Upload whenever the phone comes back online, when a field screen opens,
  // and every minute while one is open, so nothing waits on a manual tap.
  useEffect(() => {
    const quietSync = () => { if (navigator.onLine) sync({ quiet: true }) }
    quietSync()
    window.addEventListener('online', quietSync)
    const timer = setInterval(quietSync, 60000)
    return () => { window.removeEventListener('online', quietSync); clearInterval(timer) }
  }, [sync])

  return {
    items,
    pending: items.filter(i => i.status === 'pending'),
    rejected: items.filter(i => i.status === 'rejected'),
    syncing,
    sync,
  }
}

export function FieldShell({ title, back = '/field', right, children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--base)', color: 'var(--text)' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      }}>
        {back && (
          <Link to={back} aria-label="Back" style={{ color: 'var(--text)', display: 'flex' }}>
            <ArrowLeft size={20} />
          </Link>
        )}
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, flex: 1 }}>{title}</div>
        {right}
      </header>
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '14px 14px 96px' }}>{children}</main>
    </div>
  )
}

export function GpsChip({ fix, error, limit }) {
  const ok = fix && fix.accuracy <= limit
  const color = !fix ? 'var(--muted)' : ok ? 'var(--green)' : 'var(--red)'
  const text = error && !fix ? error
    : !fix ? 'Waiting for GPS…'
    : `GPS ±${Math.round(fix.accuracy)} m${ok ? '' : ` (need ±${limit} m or better)`}`
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color }}>
      <Crosshair size={14} /> {text}
    </span>
  )
}

export function SyncChip({ outbox }) {
  const n = outbox.pending.length
  return (
    <button type="button" onClick={() => outbox.sync()} disabled={outbox.syncing}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999,
        border: '1px solid var(--border)', background: 'transparent', fontSize: 12, fontWeight: 600,
        color: n ? 'var(--text)' : 'var(--muted)',
      }}>
      {navigator.onLine ? <CloudUpload size={14} /> : <CloudOff size={14} />}
      {outbox.syncing ? 'Uploading…' : n ? `${n} to upload` : 'All uploaded'}
    </button>
  )
}

export const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--muted)', margin: '14px 0 6px' }

export function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>{label}</span>
      {children}
      {hint && <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{hint}</span>}
    </label>
  )
}

export const pretty = code => String(code).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())

/** Tap-to-select chips. `multi` toggles membership in an array value. */
export function Chips({ options, value, onChange, multi = false }) {
  const selected = v => (multi ? (value || []).includes(v) : value === v)
  const pick = v => {
    if (!multi) return onChange(value === v ? null : v)
    onChange(selected(v) ? value.filter(x => x !== v) : [...(value || []), v])
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(o => {
        const code = o.code ?? o
        const on = selected(code)
        return (
          <button key={code} type="button" onClick={() => pick(code)} aria-pressed={on}
            style={{
              padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: `1px solid ${on ? 'var(--green)' : 'var(--border)'}`,
              background: on ? 'var(--green-dim)' : 'transparent', color: 'var(--text)',
            }}>
            {o.label ?? pretty(code)}
          </button>
        )
      })}
    </div>
  )
}

export function BigButton({ children, disabled, onClick, tone = 'primary', type = 'button' }) {
  const bg = tone === 'primary' ? 'var(--green)' : tone === 'danger' ? 'var(--red)' : 'transparent'
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{
        width: '100%', padding: '15px 16px', borderRadius: 14, fontSize: 15, fontWeight: 700,
        border: tone === 'ghost' ? '1px solid var(--border)' : 'none',
        background: bg, color: tone === 'ghost' ? 'var(--text)' : '#fff',
        opacity: disabled ? 0.45 : 1,
      }}>
      {children}
    </button>
  )
}

export const numberOrNull = v => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v))
