import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, X, Crown } from 'lucide-react'
import api from '../lib/api'

export default function TrialBanner() {
  const [trial,    setTrial]    = useState(null)
  const [dismissed,setDismissed]= useState(() => {
    // Only dismiss for today
    const d = localStorage.getItem('kip_trial_dismissed')
    return d === new Date().toDateString()
  })

  useEffect(() => {
    api.get('/stripe/status')
      .then(r => {
        if (r.data?.trial?.on_trial) setTrial(r.data.trial)
      })
      .catch(() => {})
  }, [])

  const dismiss = () => {
    localStorage.setItem('kip_trial_dismissed', new Date().toDateString())
    setDismissed(true)
  }

  if (!trial || dismissed) return null

  const days     = trial.days_left
  const urgent   = days <= 5
  const color    = urgent ? 'var(--gold)' : 'var(--teal)'
  const bgColor  = urgent ? 'rgba(232,151,62,0.08)' : 'rgba(0,240,200,0.06)'
  const border   = urgent ? 'rgba(232,151,62,0.3)' : 'rgba(0,240,200,0.25)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, padding: '9px 16px', flexShrink: 0,
      background: bgColor, borderBottom: `1px solid ${border}`,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Crown size={14} style={{ color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>
          {urgent ? (
            <><strong style={{ color }}>Only {days} day{days !== 1 ? 's' : ''} left</strong> on your free Premium trial.</>
          ) : (
            <><strong style={{ color }}>{days} days</strong> left on your free Premium trial.</>
          )}
        </span>
        <Link to="/billing" style={{
          fontSize: 11, fontFamily: 'Syne', fontWeight: 700,
          color, textDecoration: 'none',
          padding: '3px 10px', borderRadius: 20,
          background: `${color}18`, border: `1px solid ${color}40`,
          flexShrink: 0,
        }}>
          <Zap size={10} style={{ marginRight: 4 }} />
          Upgrade — K49/mo
        </Link>
      </div>
      <button onClick={dismiss} style={{
        background: 'none', border: 'none',
        color: 'var(--faint)', cursor: 'pointer',
        padding: 2, flexShrink: 0,
      }}>
        <X size={14} />
      </button>
    </div>
  )
}
