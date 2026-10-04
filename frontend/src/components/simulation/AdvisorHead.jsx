import React, { useEffect, useMemo, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

/* Illustrated mentor head. Skin and hair are fixed illustration colours (the
   same person in both themes); clothing and glasses follow the theme tokens. */
export function AdvisorFace({ talking = false, size = 62 }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="sim-advisor-head" aria-hidden="true">
      <circle cx="50" cy="50" r="49" style={{ fill: 'var(--blue-dim)', stroke: 'var(--border-h)' }} strokeWidth="1" />
      <g style={{ animation: 'simFloat 4s ease-in-out infinite' }}>
        {/* shoulders + shirt */}
        <path d="M14 100 C16 80 30 72 50 72 C70 72 84 80 86 100 Z" style={{ fill: 'var(--teal-dark)' }} />
        <path d="M40 73 L50 86 L60 73 Z" style={{ fill: 'var(--base)' }} opacity="0.55" />
        <path d="M36 74 L44 84 L50 76 Z M64 74 L56 84 L50 76 Z" style={{ fill: 'var(--blue)' }} opacity="0.9" />
        {/* neck */}
        <path d="M42 62 L42 74 Q50 79 58 74 L58 62 Z" fill="#6E4229" />
        {/* ears */}
        <ellipse cx="27.5" cy="46" rx="4" ry="6" fill="#7A4A2E" />
        <ellipse cx="72.5" cy="46" rx="4" ry="6" fill="#7A4A2E" />
        {/* head */}
        <ellipse cx="50" cy="44" rx="22" ry="25" fill="#8B5734" />
        {/* hair (short, tight curls) */}
        <path d="M28 40 C27 24 38 16 50 16 C63 16 74 24 72 40 C69 33 63 28 50 28 C38 28 31 33 28 40 Z" fill="#1C120C" />
        <path d="M30 34 C33 26 40 22 46 21" stroke="#2C1E15" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
        {/* brows */}
        <path d="M36 36 Q41 33.5 46 35.5" stroke="#1C120C" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M54 35.5 Q59 33.5 64 36" stroke="#1C120C" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        {/* eyes (blink) */}
        <g className="sim-adv-eyes">
          <ellipse cx="41" cy="43" rx="2.6" ry="3" fill="#1C120C" />
          <ellipse cx="59" cy="43" rx="2.6" ry="3" fill="#1C120C" />
          <circle cx="42" cy="42" r="0.8" fill="#fff" />
          <circle cx="60" cy="42" r="0.8" fill="#fff" />
        </g>
        {/* glasses */}
        <g fill="none" style={{ stroke: 'var(--gold)' }} strokeWidth="1.6">
          <rect x="34" y="38" width="14" height="10" rx="4" />
          <rect x="52" y="38" width="14" height="10" rx="4" />
          <path d="M48 42.5 L52 42.5" />
        </g>
        {/* nose */}
        <path d="M50 46 Q48 52 50.5 54 Q52.5 54.5 53 53" stroke="#5E361F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* beard line */}
        <path d="M33 52 C35 63 42 68.5 50 68.5 C58 68.5 65 63 67 52 C63 60 57 63 50 63 C43 63 37 60 33 52 Z" fill="#1C120C" opacity="0.85" />
        {/* mouth */}
        {talking
          ? <ellipse className="sim-adv-mouth" cx="50" cy="58.5" rx="4.6" ry="2.6" fill="#3A1D12" />
          : <path d="M44.5 57.5 Q50 61.5 55.5 57.5" stroke="#3A1D12" strokeWidth="2" fill="none" strokeLinecap="round" />}
      </g>
    </svg>
  )
}

/* Typewriter for the advisor's tips. Reduced motion shows text at once. */
function useTypewriter(lines, key) {
  const full = useMemo(() => lines.join('\n'), [lines])
  const [n, setN] = useState(0)
  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setN(full.length); return }
    setN(0)
    let i = 0
    const id = setInterval(() => {
      i += 2
      setN(Math.min(i, full.length))
      if (i >= full.length) clearInterval(id)
    }, 24)
    return () => clearInterval(id)
  }, [full, key])
  const shown = full.slice(0, n).split('\n')
  return [shown, n < full.length]
}

/**
 * Advisor head + speech bubble.
 *  tips   [{kind, text}] — rule-based now, AI-written later
 *  name   advisor display name
 */
export default function AdvisorHead({ tips = [], name, intro, compact = false, collapsed = false, onToggle,
  audioOn, onToggleAudio, muteLabel, unmuteLabel }) {
  const lines = tips.length ? tips.map(t => t.text) : [intro]
  const [shown, typing] = useTypewriter(lines, tips.map(t => t.kind).join('|'))
  return (
    <div className="sim-advisor" onClick={onToggle} role={onToggle ? 'button' : undefined}
      aria-expanded={onToggle ? !collapsed : undefined} tabIndex={onToggle ? 0 : undefined}
      onKeyDown={onToggle ? (e => (e.key === 'Enter' || e.key === ' ') && onToggle()) : undefined}>
      <AdvisorFace talking={typing} size={compact ? 44 : 62} />
      <div className="sim-bubble" aria-live="polite">
        <div className="sim-bubble-name">
          <span>{name}</span>
          {onToggleAudio && (
            <button type="button" className="sim-audio-btn"
              onClick={(e) => { e.stopPropagation(); onToggleAudio() }}
              aria-pressed={!!audioOn} aria-label={audioOn ? muteLabel : unmuteLabel}
              title={audioOn ? muteLabel : unmuteLabel}>
              {audioOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          )}
        </div>
        {shown.map((line, i) => (
          <p key={i}>{line}{typing && i === shown.length - 1 && <span className="sim-caret" />}</p>
        ))}
      </div>
    </div>
  )
}
