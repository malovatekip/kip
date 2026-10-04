import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Zap, CloudRain, Biohazard, Flame, TriangleAlert } from 'lucide-react'
import { sceneFor, shockEffect } from './sceneConfigs'

const W = 800, H = 340, HALF_W = 66, HALF_H = 31
/* Phones get a portrait version of the same scene: (x, y) is transposed so the
   business reads top-to-bottom at a legible size instead of shrinking to fit. */
const PORTRAIT = { w: 446, h: 500, sx: 1.16, sy: 0.62, ox: 23.6, oy: 10 }
const toPortrait = (n) => ({ ...n, x: n.y * PORTRAIT.sx + PORTRAIT.ox, y: n.x * PORTRAIT.sy + PORTRAIT.oy })

function useNarrow(query = '(max-width: 767px)') {
  const [m, setM] = useState(() => !!window.matchMedia?.(query).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const h = (e) => setM(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [query])
  return m
}
const MAX_DOTS = 6
const KIND_COLOR = {
  goods: 'var(--teal)', money: 'var(--gold)', people: 'var(--violet)',
  labor: 'var(--green)', info: 'var(--blue-mid)',
}

/* Point on the edge of a node card along the line toward another point. */
function edge(from, to, pad = 4) {
  const dx = to.x - from.x, dy = to.y - from.y
  const sx = dx ? (HALF_W + pad) / Math.abs(dx) : Infinity
  const sy = dy ? (HALF_H + pad) / Math.abs(dy) : Infinity
  const s = Math.min(sx, sy)
  return { x: from.x + dx * s, y: from.y + dy * s }
}

function linkPath(a, b, bend) {
  const s = edge(a, b), e = edge(b, a)
  const mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2
  const len = Math.hypot(e.x - s.x, e.y - s.y) || 1
  const cx = mx + (-(e.y - s.y) / len) * bend
  const cy = my + ((e.x - s.x) / len) * bend
  return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`
}

/* ── Animated backdrops, one per motif ─────────────────────────────── */
function Ambient({ motif, steamAt }) {
  const line = { stroke: 'var(--border-h)', fill: 'none' }
  switch (motif) {
    case 'field':
      return (
        <g className="sim-ambient">
          <g style={{ transformOrigin: '60px 50px', animation: 'simSpin 40s linear infinite' }}>
            {Array.from({ length: 12 }, (_, i) => (
              <line key={i} x1="60" y1="50" x2={60 + 34 * Math.cos(i * Math.PI / 6)} y2={50 + 34 * Math.sin(i * Math.PI / 6)}
                style={{ stroke: 'var(--gold)' }} strokeWidth="1.2" opacity="0.4" />
            ))}
          </g>
          <circle cx="60" cy="50" r="16" style={{ fill: 'var(--gold-dim)', stroke: 'var(--gold)' }} strokeWidth="1" opacity="0.8" />
          {Array.from({ length: 6 }, (_, i) => (
            <path key={i} d={`M 0 ${300 + i * 9} Q 400 ${282 + i * 9} 800 ${300 + i * 9}`} style={line} strokeWidth="1" opacity={0.25 + i * 0.08} />
          ))}
        </g>
      )
    case 'steam': {
      const [sx, sy] = steamAt || [300, 120]
      return (
        <g className="sim-ambient">
          {[-14, 0, 14].map((dx, i) => (
            <path key={i} d={`M ${sx + dx} ${sy} q 6 -10 0 -20 q -6 -10 0 -20`} style={{ stroke: 'var(--muted)', fill: 'none' }}
              strokeWidth="2" strokeLinecap="round"
              opacity="0.6">
              <animate attributeName="opacity" values="0;0.7;0" dur={`${2.2 + i * 0.4}s`} begin={`${i * 0.5}s`} repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="translate" values="0 6; 0 -14" dur={`${2.2 + i * 0.4}s`} begin={`${i * 0.5}s`} repeatCount="indefinite" />
            </path>
          ))}
          {Array.from({ length: 9 }, (_, i) => <circle key={i} cx={40 + i * 92} cy="326" r="2" style={{ fill: 'var(--border-h)' }} />)}
        </g>
      )
    }
    case 'shelves':
      return (
        <g className="sim-ambient">
          {[118, 222].map(y => (
            <g key={y}>
              <line x1="560" y1={y} x2="800" y2={y} style={line} strokeWidth="1.5" />
              {Array.from({ length: 9 }, (_, i) => (
                <rect key={i} x={566 + i * 26} y={y - 12 - (i % 3) * 3} width="18" height={12 + (i % 3) * 3} rx="2"
                  style={{ fill: 'var(--blue-dim)', stroke: 'var(--border-h)' }} />
              ))}
            </g>
          ))}
        </g>
      )
    case 'gears': {
      const gear = (cx, cy, r, dur, rev) => (
        <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: `simSpin ${dur}s linear infinite ${rev ? 'reverse' : ''}` }}>
          <circle cx={cx} cy={cy} r={r} style={line} strokeWidth="2" />
          <circle cx={cx} cy={cy} r={r * 0.35} style={line} strokeWidth="2" />
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} x={cx - 3} y={cy - r - 6} width="6" height="8" style={{ fill: 'var(--border-h)' }}
              transform={`rotate(${i * 36} ${cx} ${cy})`} />
          ))}
        </g>
      )
      return <g className="sim-ambient">{gear(400, 300, 26, 14)}{gear(447, 312, 16, 9, true)}{gear(150, 30, 18, 12)}</g>
    }
    case 'pulse':
      return (
        <g className="sim-ambient">
          <path d="M 0 318 L 150 318 L 168 296 L 186 336 L 204 300 L 222 318 L 420 318 L 438 290 L 456 338 L 474 304 L 492 318 L 800 318"
            style={{ stroke: 'var(--red)', fill: 'none' }} strokeWidth="1.8" strokeDasharray="10 8" opacity="0.7">
            <animate attributeName="stroke-dashoffset" from="0" to="-180" dur="3s" repeatCount="indefinite" />
          </path>
        </g>
      )
    case 'ticker':
      return (
        <g className="sim-ambient">
          {Array.from({ length: 14 }, (_, i) => {
            const h = 14 + ((i * 37) % 40)
            return (
              <rect key={i} x={20 + i * 56} y={334 - h} width="22" height={h} rx="3" style={{ fill: 'var(--gold-dim)', stroke: 'var(--border-h)' }}>
                <animate attributeName="height" values={`${h};${h + 14};${h}`} dur={`${2 + (i % 4) * 0.5}s`} repeatCount="indefinite" />
                <animate attributeName="y" values={`${334 - h};${320 - h};${334 - h}`} dur={`${2 + (i % 4) * 0.5}s`} repeatCount="indefinite" />
              </rect>
            )
          })}
        </g>
      )
    case 'road':
      return (
        <g className="sim-ambient">
          <rect x="0" y="300" width="800" height="34" style={{ fill: 'var(--sim-track, rgba(127,127,127,.08))' }} />
          <line x1="0" y1="317" x2="800" y2="317" style={{ stroke: 'var(--gold)' }} strokeWidth="2.5" strokeDasharray="22 16" opacity="0.6">
            <animate attributeName="stroke-dashoffset" from="0" to="-76" dur="1.6s" repeatCount="indefinite" />
          </line>
        </g>
      )
    case 'conveyor':
      return (
        <g className="sim-ambient">
          <rect x="190" y="306" width="440" height="18" rx="9" style={line} strokeWidth="1.5" />
          <line x1="198" y1="315" x2="622" y2="315" style={{ stroke: 'var(--border-h)' }} strokeWidth="8" strokeDasharray="4 10">
            <animate attributeName="stroke-dashoffset" from="0" to="-28" dur="0.8s" repeatCount="indefinite" />
          </line>
          {[0, 1, 2].map(i => (
            <rect key={i} x="200" y="290" width="16" height="14" rx="2" style={{ fill: 'var(--teal-dim)', stroke: 'var(--teal)' }}>
              <animate attributeName="x" from="200" to="600" dur="4.5s" begin={`${i * 1.5}s`} repeatCount="indefinite" />
            </rect>
          ))}
        </g>
      )
    case 'waves':
      return (
        <g className="sim-ambient">
          {[300, 316].map((y, i) => (
            <path key={y} d={`M -120 ${y} q 30 -10 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0`}
              style={{ stroke: 'var(--violet)', fill: 'none' }} strokeWidth="1.6" opacity={0.5 - i * 0.15}>
              <animateTransform attributeName="transform" type="translate" from="0 0" to="120 0" dur={`${4 + i * 2}s`} repeatCount="indefinite" />
            </path>
          ))}
        </g>
      )
    case 'crane':
      return (
        <g className="sim-ambient">
          <line x1="388" y1="334" x2="388" y2="36" style={line} strokeWidth="2" />
          <line x1="360" y1="40" x2="470" y2="40" style={line} strokeWidth="2" />
          <line x1="388" y1="60" x2="360" y2="40" style={line} strokeWidth="1.2" />
          <g style={{ transformOrigin: '448px 40px', animation: 'simCraneSwing 4s ease-in-out infinite' }}>
            <line x1="448" y1="40" x2="448" y2="80" style={line} strokeWidth="1.2" />
            <rect x="440" y="80" width="16" height="10" rx="2" style={{ fill: 'var(--gold-dim)', stroke: 'var(--gold)' }} />
          </g>
        </g>
      )
    case 'chalk':
      return (
        <g className="sim-ambient">
          <rect x="560" y="140" width="210" height="52" rx="6" style={line} strokeWidth="1.2" />
          {[0, 1, 2].map(i => (
            <line key={i} x1="574" y1={154 + i * 13} x2={574 + 150 - i * 40} y2={154 + i * 13}
              style={{ stroke: 'var(--muted)' }} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="160" strokeDashoffset="160">
              <animate attributeName="stroke-dashoffset" values="160;0;0;160" keyTimes="0;0.4;0.85;1" dur="5s" begin={`${i * 0.6}s`} repeatCount="indefinite" />
            </line>
          ))}
        </g>
      )
    case 'grid':
    default:
      return (
        <g className="sim-ambient">
          {Array.from({ length: 17 }, (_, i) => <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2={H} style={line} strokeWidth="0.6" opacity="0.5" />)}
          {Array.from({ length: 8 }, (_, i) => <line key={`h${i}`} x1="0" y1={i * 50} x2={W} y2={i * 50} style={line} strokeWidth="0.6" opacity="0.5" />)}
          <rect x="0" y="0" width={W} height="2" style={{ fill: 'var(--blue)' }} opacity="0.5">
            <animate attributeName="y" from="0" to={H} dur="5s" repeatCount="indefinite" />
          </rect>
        </g>
      )
  }
}

/* ── Shock overlay ─────────────────────────────────────────────────── */
function ShockOverlay({ effect, W, H }) {
  if (effect === 'rain') {
    return (
      <g pointerEvents="none">
        {Array.from({ length: 46 }, (_, i) => (
          <line key={i} x1={(i * 53) % W} y1="-30" x2={(i * 53) % W - 6} y2="-10" style={{ stroke: 'var(--blue-mid)' }} strokeWidth="1.6" opacity="0.7">
            <animateTransform attributeName="transform" type="translate" from="0 0" to={`-40 ${H + 60}`} dur={`${0.7 + (i % 5) * 0.12}s`} begin={`${(i % 7) * 0.1}s`} repeatCount="indefinite" />
          </line>
        ))}
      </g>
    )
  }
  if (effect === 'bolt') {
    return <rect x="0" y="0" width={W} height={H} style={{ fill: 'var(--text)', animation: 'simFlash 2.2s ease-in-out infinite' }} pointerEvents="none" />
  }
  const color = effect === 'heat' ? 'var(--gold)' : 'var(--red)'
  return (
    <rect x="3" y="3" width={W - 6} height={H - 6} rx="12" fill="none" style={{ stroke: color, animation: 'simBreath 1.2s ease-in-out infinite' }}
      strokeWidth="6" pointerEvents="none" />
  )
}

const SHOCK_ICON = { rain: CloudRain, bolt: Zap, hazard: Biohazard, heat: Flame, alert: TriangleAlert }

/**
 * Live business-structure animation.
 *  category    idea category slug -> scene
 *  values      { metric: formatted string } shown on each node
 *  intensity   { goods, people, money, labor, info } 0..1 flow strength
 *  alerts      { goods, people, money, labor } bottleneck flags (red links)
 *  playing     week is running (particles at full flow)
 *  shock       { name, hit, active, lostLabel } overlay while active
 */
export default function BusinessFlowScene({ category, values = {}, intensity = {}, alerts = {}, playing = false,
  loading = false, loadingLabel, dayLabel, shock, ariaLabel }) {
  const portrait = useNarrow()
  const VW = portrait ? PORTRAIT.w : W, VH = portrait ? PORTRAIT.h : H
  const scene = useMemo(() => {
    const s = sceneFor(category)
    return portrait ? { ...s, nodes: s.nodes.map(toPortrait) } : s
  }, [category, portrait])
  const byId = useMemo(() => Object.fromEntries(scene.nodes.map(n => [n.id, n])), [scene])
  const paths = useMemo(() => scene.links.map(l => linkPath(byId[l.from], byId[l.to], l.bend)), [scene, byId])

  const pathRefs = useRef([])
  const dotRefs = useRef([])
  const live = useRef({ intensity, playing })
  live.current = { intensity, playing }

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const phases = scene.links.map(() => Array.from({ length: MAX_DOTS }, (_, j) => j / MAX_DOTS))
    const lens = scene.links.map((_, i) => pathRefs.current[i]?.getTotalLength?.() || 1)
    let raf, last = performance.now()
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const { intensity: inten, playing: play } = live.current
      scene.links.forEach((link, i) => {
        const path = pathRefs.current[i]
        const dots = dotRefs.current[i] || []
        if (!path) return
        const k = Math.max(0, Math.min(1, inten?.[link.kind] ?? 0))
        const level = play ? k : Math.min(0.18, k * 0.3 + 0.08)
        const count = Math.max(1, Math.round(1 + level * (MAX_DOTS - 1)))
        const speed = 0.06 + level * 0.42
        for (let j = 0; j < MAX_DOTS; j++) {
          const dot = dots[j]
          if (!dot) continue
          if (j >= count) { dot.setAttribute('opacity', '0'); continue }
          phases[i][j] = (phases[i][j] + speed * dt) % 1
          const t = phases[i][j]
          const p = path.getPointAtLength(t * lens[i])
          dot.setAttribute('cx', p.x.toFixed(1))
          dot.setAttribute('cy', p.y.toFixed(1))
          const fade = Math.min(1, t / 0.12, (1 - t) / 0.12)
          dot.setAttribute('opacity', (0.95 * fade).toFixed(2))
        }
      })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [scene])

  const effect = shock?.active ? shockEffect(shock.name) : null
  const ShockIcon = effect ? SHOCK_ICON[effect] : null
  const alertKinds = new Set(Object.entries(alerts).filter(([, v]) => v).map(([k]) => k))
  const nodeAlert = (n) => (n.metric === 'demand' && alertKinds.has('people')) || (n.metric === 'staff' && alertKinds.has('labor'))
    || (n.metric === 'revenue' && alertKinds.has('money')) || (n.metric === 'stock' && alertKinds.has('goods'))
  const nodeHot = (n) => playing && ['served', 'demand', 'revenue'].includes(n.metric)

  return (
    <div className="sim-scene-stage">
      <svg viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={ariaLabel}>
        <defs>
          <filter id="sim-dot-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g transform={portrait ? `matrix(0 ${PORTRAIT.sy} ${PORTRAIT.sx} 0 ${PORTRAIT.ox} ${PORTRAIT.oy})` : undefined}>
          <Ambient motif={scene.motif} steamAt={scene.steamAt} />
        </g>

        {/* links */}
        {scene.links.map((l, i) => (
          <path key={`${l.from}-${l.to}`} ref={el => (pathRefs.current[i] = el)} d={paths[i]}
            className={`sim-link${alertKinds.has(l.kind) && playing ? ' is-alert' : ''}`}
            style={{ stroke: KIND_COLOR[l.kind] }} />
        ))}

        {/* particles */}
        <g filter="url(#sim-dot-glow)">
          {scene.links.map((l, i) => Array.from({ length: MAX_DOTS }, (_, j) => (
            <circle key={`${i}-${j}`} r={l.kind === 'money' ? 3.6 : 3.1} opacity="0"
              ref={el => { (dotRefs.current[i] ||= [])[j] = el }}
              style={{ fill: alertKinds.has(l.kind) && playing ? 'var(--red)' : KIND_COLOR[l.kind] }} />
          )))}
        </g>

        {/* nodes */}
        {scene.nodes.map(n => {
          const x = n.x - HALF_W, y = n.y - HALF_H
          const Icon = n.Icon
          return (
            <g key={n.id}>
              <rect x={x} y={y} width={HALF_W * 2} height={HALF_H * 2} rx="13"
                className={`sim-node-card${nodeAlert(n) && playing ? ' is-alert' : nodeHot(n) ? ' is-hot' : ''}`} />
              <Icon x={x + 10} y={y + 9} width={18} height={18} strokeWidth={2} style={{ color: scene.accent }} />
              <text x={x + 34} y={y + 23} className="sim-node-label">{n.label}</text>
              <text x={x + 12} y={y + 47} className="sim-node-value">{values[n.metric] ?? '—'}</text>
            </g>
          )
        })}

        {effect && <ShockOverlay effect={effect} W={VW} H={VH} />}
      </svg>

      {dayLabel && <div className="sim-scene-day">{dayLabel}</div>}
      {shock?.active && ShockIcon && (
        <div className="sim-chip is-red" style={{ position: 'absolute', left: 12, top: 10 }}>
          <ShockIcon size={12} /> {shock.lostLabel || shock.name}
        </div>
      )}
      {loading && (
        <div className="sim-scene-loading"><Loader2 size={18} className="sim-spin" /> {loadingLabel}</div>
      )}
    </div>
  )
}
