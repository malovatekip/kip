import React from 'react'
import { WifiOff, Wifi, RefreshCw, Clock } from 'lucide-react'
import { useOffline } from '../hooks/useOffline'

export default function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, lastSynced, syncManually } = useOffline()

  // Online and nothing pending — hide banner entirely
  if (isOnline && pendingCount === 0) return null

  const fmtTime = iso => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleTimeString('en-ZM', { hour: '2-digit', minute: '2-digit' })
  }

  // ── Offline banner ──────────────────────────────────────────────────────────
  if (!isOnline) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10, padding: '8px 16px', flexShrink: 0, flexWrap: 'wrap',
        background: 'rgba(224,38,62,0.12)',
        borderBottom: '1px solid rgba(224,38,62,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WifiOff size={14} style={{ color: 'var(--red)', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
            You are offline
          </span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            · Browsing cached data. Daily logs will queue and sync when you're back online.
          </span>
        </div>
        {pendingCount > 0 && (
          <span style={{
            fontSize: 11, fontFamily: 'Syne', fontWeight: 700,
            padding: '3px 10px', borderRadius: 20,
            background: 'rgba(224,38,62,0.2)', color: 'var(--red)',
            border: '1px solid rgba(224,38,62,0.4)',
          }}>
            {pendingCount} log{pendingCount !== 1 ? 's' : ''} queued
          </span>
        )}
      </div>
    )
  }

  // ── Online but pending items to sync ────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, padding: '7px 16px', flexShrink: 0, flexWrap: 'wrap',
      background: 'rgba(232,151,62,0.08)',
      borderBottom: '1px solid rgba(232,151,62,0.25)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Clock size={13} style={{ color: 'var(--gold)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--text)' }}>
          <strong style={{ color: 'var(--gold)' }}>{pendingCount} log{pendingCount !== 1 ? 's' : ''}</strong>
          {' '}saved offline — ready to sync
          {lastSynced && <span style={{ color: 'var(--faint)' }}> · Last synced {fmtTime(lastSynced)}</span>}
        </span>
      </div>
      <button
        onClick={syncManually}
        disabled={isSyncing}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 20, cursor: 'pointer',
          background: 'rgba(232,151,62,0.15)', border: '1px solid rgba(232,151,62,0.4)',
          fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: 'var(--gold)',
        }}>
        <RefreshCw size={11} style={{ animation: isSyncing ? 'spinSlow 0.8s linear infinite' : 'none' }} />
        {isSyncing ? 'Syncing…' : 'Sync Now'}
      </button>
    </div>
  )
}
