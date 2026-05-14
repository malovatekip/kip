import React, { useEffect, useRef } from 'react'

/**
 * Floating particle canvas background.
 * Renders ~70 glowing dots that drift slowly and connect with
 * faint lines when nearby — a classic "network" particle effect
 * tuned to KIP's navy/blue brand palette.
 */
export default function ParticleBackground({ className = '' }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W, H, particles

    const COLORS   = ['#42A5F5', '#1565C0', '#90CAF9', '#00BCD4', '#1976D2']
    const COUNT    = 72
    const MAX_DIST = 140
    const SPEED    = 0.35

    function resize() {
      W = canvas.width  = canvas.offsetWidth
      H = canvas.height = canvas.offsetHeight
    }

    function rand(min, max) { return Math.random() * (max - min) + min }

    function makeParticle() {
      return {
        x:    rand(0, W),
        y:    rand(0, H),
        vx:   rand(-SPEED, SPEED),
        vy:   rand(-SPEED, SPEED),
        r:    rand(1.2, 2.8),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: rand(0.3, 0.8),
      }
    }

    function init() {
      resize()
      particles = Array.from({ length: COUNT }, makeParticle)
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)

      // Update positions
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        // Wrap around edges
        if (p.x < -5)  p.x = W + 5
        if (p.x > W+5) p.x = -5
        if (p.y < -5)  p.y = H + 5
        if (p.y > H+5) p.y = -5
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const dist = Math.sqrt(dx*dx + dy*dy)
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.18
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(66,165,245,${alpha})`
            ctx.lineWidth = 0.7
            ctx.stroke()
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        // Glow
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4)
        g.addColorStop(0, p.color + 'CC')
        g.addColorStop(1, p.color + '00')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.alpha
        ctx.fill()
        ctx.globalAlpha = 1
      }

      animRef.current = requestAnimationFrame(draw)
    }

    init()
    draw()

    const ro = new ResizeObserver(() => { resize(); particles = Array.from({ length: COUNT }, makeParticle) })
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  )
}
