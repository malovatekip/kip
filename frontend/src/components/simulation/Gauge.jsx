import React, { useEffect, useId, useRef, useState } from 'react'

/* Spring-eased value with an optional analog "tremor" while the engine runs,
   so the needle keeps moving like a real meter instead of jumping. */
export function useLiveValue(target, live = false) {
  const [shown, setShown] = useState(target)
  const cur = useRef(target)
  const tgt = useRef(target)
  const liveRef = useRef(live)
  tgt.current = target
  liveRef.current = live

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(64, now - last) / 16.67
      last = now
      const k = reduced ? 1 : 1 - Math.pow(1 - 0.075, dt)
      cur.current += (tgt.current - cur.current) * k
      let v = cur.current
      if (liveRef.current && !reduced) {
        const s = now / 1000
        v += Math.sin(s * 7.3) * 0.035 + Math.sin(s * 12.9) * 0.02
      }
      setShown(v)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return [shown, cur]
}

const CX = 100, CY = 100, R = 78

function polar(v, r = R) {
  const a = Math.PI - (Math.max(0, Math.min(10, v)) / 10) * Math.PI
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)]
}

/**
 * Analog viability meter (0-10).
 *  value    target score — the needle springs toward it
 *  live     adds analog tremor while a week is playing
 *  marker   optional reference score (e.g. the baseline) drawn as a notch
 *  mini     compact variant for the mobile HUD (no numerals)
 */
export default function Gauge({ value = 0, live = false, marker = null, mini = false, label, caption }) {
  const gid = useId().replace(/:/g, '')
  const [shown, settled] = useLiveValue(value, live)
  const angle = -90 + Math.max(0, Math.min(10, shown)) * 18
  const ticks = Array.from({ length: 21 }, (_, i) => i / 2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {label && !mini && <div className="sim-eyebrow" style={{ marginBottom: 2 }}>{label}</div>}
      <svg viewBox={mini ? '14 18 172 92' : '0 4 200 118'} role="img"
        aria-label={`${label || 'Viability'} ${settled.current.toFixed(2)} out of 10`}
        style={{ width: '100%', maxWidth: mini ? 120 : 210 }}>
        <defs>
          <linearGradient id={`arc-${gid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: 'var(--red)' }} />
            <stop offset="45%" style={{ stopColor: 'var(--gold)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--green)' }} />
          </linearGradient>
          <filter id={`glow-${gid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* track + coloured arc */}
        <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none"
          style={{ stroke: 'var(--border-h)' }} strokeWidth="16" strokeLinecap="round" />
        <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none"
          stroke={`url(#arc-${gid})`} strokeWidth="12" strokeLinecap="round" opacity="0.95" />

        {/* ticks */}
        {ticks.map(t => {
          const major = Number.isInteger(t)
          const [x1, y1] = polar(t, R - 12)
          const [x2, y2] = polar(t, R - (major ? 21 : 16))
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2}
            style={{ stroke: 'var(--muted)' }} strokeWidth={major ? 1.6 : 0.9} opacity={major ? 0.85 : 0.5} />
        })}
        {!mini && [0, 2, 4, 6, 8, 10].map(t => {
          const [x, y] = polar(t, R - 32)
          return <text key={t} x={x} y={y + 3.5} textAnchor="middle"
            style={{ fill: 'var(--muted)', fontSize: 9, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>{t}</text>
        })}

        {/* reference notch (baseline) */}
        {marker != null && (() => {
          const [x1, y1] = polar(marker, R + 9)
          const [x2, y2] = polar(marker, R - 4)
          return <line x1={x1} y1={y1} x2={x2} y2={y2} style={{ stroke: 'var(--text)' }} strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
        })()}

        {/* needle */}
        <g transform={`rotate(${angle} ${CX} ${CY})`} filter={live ? `url(#glow-${gid})` : undefined}>
          <polygon points={`${CX - 4},${CY} ${CX},${CY - R + 8} ${CX + 4},${CY}`} style={{ fill: 'var(--text)' }} />
        </g>
        <circle cx={CX} cy={CY} r="9" style={{ fill: 'var(--base)', stroke: 'var(--blue)' }} strokeWidth="3" />
        <circle cx={CX} cy={CY} r="3" style={{ fill: 'var(--blue)' }} />
      </svg>
      {!mini && (
        <div style={{ textAlign: 'center', marginTop: -2 }}>
          <div className="sim-num" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, lineHeight: 1.1 }}>
            {settled.current.toFixed(2)}<span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700 }}> /10</span>
          </div>
          {caption && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{caption}</div>}
        </div>
      )}
    </div>
  )
}
