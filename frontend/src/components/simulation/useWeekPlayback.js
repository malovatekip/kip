import { useCallback, useEffect, useRef, useState } from 'react'

const WEEK_MS = 6500          // one simulated week on screen
const REDUCED_MS = 1200
const TICK_MS = 50            // page-level updates at ~20fps; gauge + scene animate on their own rAF

/**
 * Plays one week's result over a few seconds so charts, scene, progress bar
 * and the live meter move together. `progress` runs 0 -> 1.
 */
export default function useWeekPlayback() {
  const [state, setState] = useState({ playing: false, progress: 0 })
  const raf = useRef(0)

  const start = useCallback((onDone) => {
    cancelAnimationFrame(raf.current)
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const duration = reduced ? REDUCED_MS : WEEK_MS
    const t0 = performance.now()
    let lastEmit = 0
    setState({ playing: true, progress: 0 })
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration)
      if (p >= 1) {
        setState({ playing: false, progress: 1 })
        onDone?.()
        return
      }
      if (now - lastEmit >= TICK_MS) {
        lastEmit = now
        setState({ playing: true, progress: p })
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return { ...state, start }
}
