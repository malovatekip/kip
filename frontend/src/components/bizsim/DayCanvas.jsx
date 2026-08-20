import React, { useEffect, useRef, useMemo } from 'react'
import { C } from './theme'
import GameAudio from './GameAudio'
import { useT } from '../../context/TranslationContext'

// Fixed internal coordinate system (Part 5: 375x260px mobile-first canvas)
const W = 375
const H = 260
const SHOP_X = 10, SHOP_Y = 70, SHOP_W = 140, SHOP_H = 130
const DOOR_X = SHOP_X + SHOP_W / 2
const GROUND_Y = SHOP_Y + SHOP_H
const RIVAL_X = W - 60, RIVAL_Y = 90, RIVAL_W = 50, RIVAL_H = 60

const PHASE_DOOR_END   = 500
const PHASE_FLOW_END   = 2500
const PHASE_TOTAL      = 3500

function buildPlan(dayResult) {
  const f = dayResult?.demand_factors || {}
  const unitsSold        = dayResult?.units_sold || 0
  const priceFactor      = f.price_factor ?? 1
  const marketingFactor  = f.marketing_factor ?? 1
  const competitorFactor = f.competitor_factor ?? 1

  const buyCount  = Math.min(Math.max(unitsSold, 0), 14)
  const walkCount = priceFactor < 0.7 ? 3 : 0
  const forkCount = competitorFactor < 0.8 ? 3 : 0
  const topCount  = marketingFactor > 1.3 ? 4 : 0

  const dots = []
  const flowWindow = PHASE_FLOW_END - PHASE_DOOR_END - 400 // leave tail room for travel
  let i = 0
  const spacing = buyCount > 0 ? flowWindow / (buyCount + 1) : 0
  for (let n = 0; n < buyCount; n++) {
    dots.push({ type: 'buy', spawn: PHASE_DOOR_END + spacing * (n + 1), edge: 'right', lane: n % 3 })
  }
  for (let n = 0; n < walkCount; n++) {
    dots.push({ type: 'walk', spawn: PHASE_DOOR_END + 200 + n * 260, edge: 'right', lane: n % 3 })
  }
  for (let n = 0; n < forkCount; n++) {
    dots.push({ type: 'fork', spawn: PHASE_DOOR_END + 150 + n * 220, edge: 'right', lane: n % 3 })
  }
  for (let n = 0; n < topCount; n++) {
    dots.push({ type: 'top', spawn: PHASE_DOOR_END + 100 + n * 180, edge: 'top', lane: n })
  }
  return dots
}

function laneY(lane) { return GROUND_Y - 14 - (lane % 3) * 16 }

export default function DayCanvas({ dayResult, rivalName, onComplete }) {
  const { t } = useT()
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const startRef  = useRef(null)
  const dotsPlan  = useMemo(() => buildPlan(dayResult), [dayResult])
  const shopLabel = t('bizsim.your_shop_canvas')
  const rivalFallbackLabel = t('bizsim.rival_fallback')

  const eventText = `${dayResult?.event?.label || ''} ${dayResult?.event?.id || ''} ${dayResult?.adjustments?.event?.label || ''}`.toLowerCase()
  const isLoadShedding = /shed|power outage|blackout/.test(eventText)
  const isRain = /rain/.test(eventText)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function resize() {
      const cssW = canvas.offsetWidth || W
      const scale = cssW / W
      canvas.width  = W * scale * (window.devicePixelRatio || 1)
      canvas.height = H * scale * (window.devicePixelRatio || 1)
      canvas.style.height = `${H * scale}px`
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(scale * (window.devicePixelRatio || 1), scale * (window.devicePixelRatio || 1))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // ── Scheduled one-shot audio cues (not per-frame) ─────────────────────
    GameAudio.init()
    GameAudio.dayStart()
    const timers = []
    dotsPlan.filter(d => d.type === 'buy').slice(0, 10).forEach((d, i) => {
      timers.push(setTimeout(() => GameAudio.saleKaChing(dayResult?.price || 50), d.spawn + 260 + i * 4))
    })
    if (dotsPlan.some(d => d.type === 'walk')) {
      timers.push(setTimeout(() => GameAudio.customerWalkAway(), PHASE_DOOR_END + 700))
    }
    timers.push(setTimeout(() => {
      if ((dayResult?.profit ?? 0) >= 0) GameAudio.dayProfitable()
      else GameAudio.dayLoss()
    }, PHASE_FLOW_END + 100))

    const finishTimer = setTimeout(() => { onComplete && onComplete() }, PHASE_TOTAL)

    function drawDoors(elapsed) {
      const openT = Math.min(1, elapsed / PHASE_DOOR_END)
      const closeT = elapsed > PHASE_FLOW_END ? Math.min(1, (elapsed - PHASE_FLOW_END) / 500) : 0
      const openness = Math.max(openT - closeT, closeT > 0 ? 1 - closeT : openT)
      const angle = (isLoadShedding ? 0.6 : 1) * openness * (Math.PI / 2.4)

      // shop body
      ctx.fillStyle = '#16233F'
      ctx.fillRect(SHOP_X, SHOP_Y, SHOP_W, SHOP_H)
      ctx.strokeStyle = C.border
      ctx.lineWidth = 1.5
      ctx.strokeRect(SHOP_X, SHOP_Y, SHOP_W, SHOP_H)
      // roof
      ctx.beginPath()
      ctx.moveTo(SHOP_X - 6, SHOP_Y)
      ctx.lineTo(SHOP_X + SHOP_W / 2, SHOP_Y - 22)
      ctx.lineTo(SHOP_X + SHOP_W + 6, SHOP_Y)
      ctx.closePath()
      ctx.fillStyle = C.teal + '30'
      ctx.fill()
      ctx.strokeStyle = C.teal
      ctx.stroke()

      // doors (two panels rotating open from the centre)
      const doorH = SHOP_H - 30
      const doorW = SHOP_W / 2 - 6
      ;[-1, 1].forEach(side => {
        ctx.save()
        ctx.translate(DOOR_X + side * 2, SHOP_Y + SHOP_H - 6)
        ctx.rotate(side * angle)
        ctx.fillStyle = '#0A1628'
        ctx.fillRect(side > 0 ? 0 : -doorW, -doorH, doorW, doorH)
        ctx.restore()
      })

      // shop label
      ctx.fillStyle = C.white
      ctx.font = '700 10px Syne, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(shopLabel, SHOP_X + SHOP_W / 2, SHOP_Y + 16)
    }

    function drawRivalShop() {
      const hasForks = dotsPlan.some(d => d.type === 'fork')
      if (!hasForks) return
      ctx.fillStyle = `${C.red}15`
      ctx.fillRect(RIVAL_X, RIVAL_Y, RIVAL_W, RIVAL_H)
      ctx.strokeStyle = `${C.red}80`
      ctx.setLineDash([3, 3])
      ctx.strokeRect(RIVAL_X, RIVAL_Y, RIVAL_W, RIVAL_H)
      ctx.setLineDash([])
      ctx.fillStyle = C.red
      ctx.font = '700 8px Syne, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText((rivalName || rivalFallbackLabel).toUpperCase().slice(0, 12), RIVAL_X + RIVAL_W / 2, RIVAL_Y + RIVAL_H / 2)
    }

    function drawGround() {
      ctx.strokeStyle = C.border
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, GROUND_Y)
      ctx.lineTo(W, GROUND_Y)
      ctx.stroke()
    }

    function drawRain(elapsed) {
      if (!isRain) return
      ctx.strokeStyle = 'rgba(150,190,255,0.4)'
      ctx.lineWidth = 1
      for (let i = 0; i < 26; i++) {
        const seed = i * 97
        const x = (seed * 3 + elapsed * 0.25) % W
        const y = ((seed * 5 + elapsed * 0.6) % H)
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - 3, y + 10)
        ctx.stroke()
      }
    }

    function dotPos(d, elapsed) {
      const t = Math.max(0, elapsed - d.spawn)
      const travel = 1200
      const p = Math.min(1, t / travel)
      if (d.type === 'top') {
        const x = 200 + d.lane * 30
        const y0 = -10, y1 = laneY(d.lane)
        return { x, y: y0 + (y1 - y0) * p, arrived: p >= 1, p }
      }
      const x0 = W + 10, y = laneY(d.lane)
      if (d.type === 'buy') {
        const x1 = DOOR_X
        return { x: x0 + (x1 - x0) * p, y, arrived: p >= 1, p }
      }
      if (d.type === 'walk') {
        // approach halfway, then reverse back off-screen
        const mid = 0.5
        if (p < mid) {
          const pp = p / mid
          return { x: x0 + ((x0 + W * 0.35) - x0) * pp, y, arrived: false, p, reversing: false }
        }
        const pp = (p - mid) / (1 - mid)
        const turnX = x0 + W * 0.35 - x0
        return { x: (x0 + turnX) + (x0 - (x0 + turnX)) * pp, y, arrived: p >= 1, p, reversing: true }
      }
      if (d.type === 'fork') {
        const x1 = RIVAL_X + RIVAL_W / 2, y1 = RIVAL_Y + RIVAL_H
        return { x: x0 + (x1 - x0) * p, y: y + (y1 - y) * p, arrived: p >= 1, p }
      }
      return { x: x0, y, arrived: false, p }
    }

    function drawDot(d, elapsed) {
      const pos = dotPos(d, elapsed)
      if (elapsed < d.spawn) return
      if (pos.p >= 1 && d.type !== 'walk') return // consumed at arrival (drawn as floating text instead)

      const colour = d.type === 'walk' ? C.red : d.type === 'fork' ? C.orange : d.type === 'top' ? C.purple : C.green
      ctx.save()
      ctx.shadowColor = colour
      ctx.shadowBlur = 6
      ctx.fillStyle = colour
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      if (isRain && (d.type === 'buy' || d.type === 'top')) {
        ctx.font = '9px sans-serif'
        ctx.fillText('☔', pos.x, pos.y - 8)
      }
      if (d.type === 'buy' && pos.p > 0.85) {
        ctx.font = '10px sans-serif'
        ctx.fillText('🙂', pos.x, pos.y - 8)
      }
      if (d.type === 'walk' && pos.reversing) {
        ctx.font = '10px sans-serif'
        ctx.fillText('😕', pos.x, pos.y - 8)
      }
    }

    function drawFloatingBuys(elapsed) {
      ctx.textAlign = 'center'
      dotsPlan.filter(d => d.type === 'buy' || d.type === 'top').forEach(d => {
        const arriveAt = d.spawn + 1200
        if (elapsed < arriveAt || elapsed > arriveAt + 700) return
        const t = (elapsed - arriveAt) / 700
        ctx.globalAlpha = 1 - t
        ctx.fillStyle = C.green
        ctx.font = '700 11px Syne, sans-serif'
        ctx.fillText(`+K${Math.round(dayResult?.price || 0)}`, DOOR_X, SHOP_Y - 4 - t * 20)
        ctx.globalAlpha = 1
      })
    }

    function drawRegisterAndTotal(elapsed) {
      if (elapsed < PHASE_FLOW_END) return
      const t = Math.min(1, (elapsed - PHASE_FLOW_END) / 1000)
      // register drawer
      ctx.fillStyle = C.gold
      const drawerW = 30 * Math.sin(Math.min(1, t * 2) * Math.PI)
      ctx.fillRect(SHOP_X + SHOP_W / 2 - drawerW / 2, SHOP_Y + SHOP_H - 44, drawerW, 8)

      const profitable = (dayResult?.profit ?? 0) >= 0
      ctx.textAlign = 'center'
      ctx.globalAlpha = Math.min(1, t * 1.6)
      ctx.fillStyle = profitable ? C.green : C.red
      ctx.font = '800 22px Syne, sans-serif'
      const rise = t * 30
      ctx.fillText(`${profitable ? '+' : ''}K${Math.round(dayResult?.revenue || 0)}`, W / 2 + 40, H - 30 - rise)
      ctx.globalAlpha = 1
    }

    function drawFlicker(elapsed) {
      if (!isLoadShedding) return
      const flicker = Math.floor(elapsed / 150) % 3 === 0
      ctx.fillStyle = flicker ? 'rgba(5,10,20,0.55)' : 'rgba(5,10,20,0.3)'
      ctx.fillRect(0, 0, W, H)
    }

    function frame(now) {
      if (startRef.current == null) startRef.current = now
      const elapsed = now - startRef.current

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = '#0A1628'
      ctx.fillRect(0, 0, W, H)

      drawGround()
      drawRivalShop()
      dotsPlan.forEach(d => drawDot(d, elapsed))
      drawDoors(elapsed)
      drawFloatingBuys(elapsed)
      drawRain(elapsed)
      drawRegisterAndTotal(elapsed)
      drawFlicker(elapsed)

      if (elapsed < PHASE_TOTAL) {
        animRef.current = requestAnimationFrame(frame)
      }
    }
    animRef.current = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(animRef.current)
      clearTimeout(finishTimer)
      timers.forEach(clearTimeout)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dotsPlan, shopLabel, rivalFallbackLabel])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>
      <div style={{
        borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.border}`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.3)`,
      }}>
        <canvas ref={canvasRef} style={{ width: '100%', display: 'block' }} />
      </div>
      <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: C.muted, fontFamily: 'Syne', fontWeight: 600 }}>
        {t('bizsim.day_unfolding', { day: dayResult?.day })}
      </div>
    </div>
  )
}
