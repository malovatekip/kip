import React, { useEffect, useState } from 'react'

const EXIT_MS = 320

/**
 * Cycles through `words`, sliding the current one out and the next one in —
 * used for page-header taglines that enumerate a short list of things
 * (e.g. "Government forms" / "AI letters" / "Business plans" / ...)
 * instead of dumping the whole comma-separated list on screen at once.
 *
 * Renders inline, so it drops straight into a sentence: `Prefix <RotatingWords words={[...]} /> suffix`.
 */
export default function RotatingWords({ words = [], interval = 2200, className = '', style = {} }) {
  const [idx, setIdx]         = useState(0)
  const [prevIdx, setPrevIdx] = useState(null)

  useEffect(() => {
    if (words.length <= 1) return
    const reduceMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const tick = setInterval(() => {
      setIdx(current => {
        if (!reduceMotion) {
          setPrevIdx(current)
          setTimeout(() => setPrevIdx(null), EXIT_MS)
        }
        return (current + 1) % words.length
      })
    }, interval)
    return () => clearInterval(tick)
  }, [words, interval])

  if (words.length === 0) return null

  return (
    <span className={`kip-rotating-words ${className}`} style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', ...style }}>
      {/* Screen readers get the full list once, instead of whatever word happens to be visible mid-animation. */}
      <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        {words.join(', ')}
      </span>

      <span aria-hidden="true" style={{ position: 'relative' }}>
        {/* Invisible sizer: reserves width for the current word so the rest of the sentence doesn't jump. */}
        <span style={{ visibility: 'hidden', whiteSpace: 'nowrap' }}>{words[idx]}</span>

        <span key={`cur-${idx}`} className="kip-rw-enter" style={{ position: 'absolute', left: 0, top: 0, display: 'inline-block', whiteSpace: 'nowrap' }}>
          {words[idx]}
        </span>
        {prevIdx !== null && (
          <span key={`prev-${prevIdx}`} className="kip-rw-exit" style={{ position: 'absolute', left: 0, top: 0, display: 'inline-block', whiteSpace: 'nowrap' }}>
            {words[prevIdx]}
          </span>
        )}
      </span>
    </span>
  )
}
