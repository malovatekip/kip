/**
 * useCounter — Animated number counter
 * =====================================
 * Animates a number from 0 to the target value when the element
 * enters the viewport. Used on stat tiles to make dashboards feel alive.
 *
 * Usage:
 *   const count = useCounter(46.1)
 *   <span>{count}%</span>
 *
 *   // With formatting:
 *   const count = useCounter(1200000, { duration: 1800, prefix: 'K' })
 *   <span>{prefix}{count.toLocaleString()}</span>
 *
 *   // Integer only:
 *   const count = useCounter(253, { decimals: 0 })
 */

import { useState, useEffect, useRef } from 'react'

export function useCounter(target, {
  duration  = 1400,
  decimals  = 0,
  delay     = 0,
  easing    = 'easeOutExpo',
  startOnMount = false,
} = {}) {
  const [value,     setValue]     = useState(0)
  const [triggered, setTriggered] = useState(startOnMount)
  const ref          = useRef(null)
  const frameRef     = useRef(null)
  const startTimeRef = useRef(null)

  // Easing functions
  const easings = {
    easeOutExpo:  t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    easeOutQuad:  t => 1 - (1 - t) * (1 - t),
    easeOutCubic: t => 1 - Math.pow(1 - t, 3),
    linear:       t => t,
  }
  const easeFn = easings[easing] || easings.easeOutExpo

  // IntersectionObserver — trigger when visible
  useEffect(() => {
    if (startOnMount) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setTriggered(true) },
      { threshold: 0.3 }
    )
    const el = ref.current
    if (el) observer.observe(el)
    return () => { if (el) observer.unobserve(el) }
  }, [startOnMount])

  // Animation loop
  useEffect(() => {
    if (!triggered) return

    const startDelay = setTimeout(() => {
      startTimeRef.current = null

      const animate = (timestamp) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp
        const elapsed  = timestamp - startTimeRef.current
        const progress = Math.min(elapsed / duration, 1)
        const eased    = easeFn(progress)
        const current  = parseFloat((target * eased).toFixed(decimals))

        setValue(current)

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate)
        } else {
          setValue(target) // Snap to exact value at end
        }
      }
      frameRef.current = requestAnimationFrame(animate)
    }, delay)

    return () => {
      clearTimeout(startDelay)
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [triggered, target, duration, decimals, delay, easeFn])

  return { value, ref, triggered }
}


/**
 * AnimatedStat — Ready-to-use counter component
 *
 * Usage:
 *   <AnimatedStat value={46.1} suffix="%" label="Financially Literate" color="var(--blue-500)" />
 *   <AnimatedStat value={1200000} prefix="K" label="SMEs in Zambia" decimals={0} color="var(--gold-500)" />
 */
export function AnimatedStat({ value, prefix = '', suffix = '', label, color, size = 'lg', decimals = 1 }) {
  const { value: count, ref } = useCounter(value, { decimals })

  const sizes = {
    sm: { number: 'var(--text-xl)',  label: 'var(--text-xs)' },
    md: { number: 'var(--text-2xl)', label: 'var(--text-sm)' },
    lg: { number: 'var(--text-3xl)', label: 'var(--text-sm)' },
    xl: { number: 'var(--text-4xl)', label: 'var(--text-base)'},
  }
  const sz = sizes[size] || sizes.lg

  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize:   sz.number,
        fontWeight: 'var(--weight-extrabold)',
        color:      color || 'var(--text-primary)',
        letterSpacing: '-0.02em',
        lineHeight: 1,
        marginBottom: 'var(--space-1)',
      }}>
        {prefix}{decimals > 0 ? count.toFixed(decimals) : Math.round(count).toLocaleString()}{suffix}
      </div>
      {label && (
        <div style={{
          fontSize: sz.label,
          color: 'var(--text-muted)',
          fontWeight: 'var(--weight-semibold)',
          letterSpacing: '0.04em',
        }}>
          {label}
        </div>
      )}
    </div>
  )
}
