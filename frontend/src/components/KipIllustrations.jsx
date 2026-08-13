/**
 * KIP Illustrations — Geometric SVG
 * ===================================
 * A consistent set of abstract geometric illustrations built in the
 * KIP colour palette (Blue/Gold/Copper). They use the same 4 colours
 * so every illustration belongs to the same visual family.
 *
 * Design principle: shapes, lines, and gradients — no clip art, no cartoon
 * characters, no stock imagery. This is what gives the professional,
 * distinctively African-tech feel without being generic.
 *
 * Usage:
 *   import { FinancialLiteracyIllustration, BizSimIllustration } from './KipIllustrations'
 *   <FinancialLiteracyIllustration width={200} />
 */

import React from 'react'

const C = {
  blue:    '#1A6CF0',
  blueL:   '#4B8DE3',
  blueD:   '#0F47A8',
  gold:    '#C8763A',
  goldL:   '#EDAA5F',
  copper:  '#A0522D',
  copperL: '#BB6B42',
  white:   '#FFFFFF',
  offwhite:'#F7F8FC',
  navy:    '#0C1421',
  border:  'rgba(12,20,33,0.12)',
  muted:   '#6B7690',
}

// ── Financial Literacy ─────────────────────────────────────────────────────
export function FinancialLiteracyIllustration({ width = 240, height = 180 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fl-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor={C.blue}   stopOpacity="0.08" />
          <stop offset="100%" stopColor={C.gold}  stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="fl-bar1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.blueL} />
          <stop offset="100%" stopColor={C.blueD} />
        </linearGradient>
        <linearGradient id="fl-bar2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.goldL} />
          <stop offset="100%" stopColor={C.gold} />
        </linearGradient>
        <linearGradient id="fl-bar3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.copperL} />
          <stop offset="100%" stopColor={C.copper} />
        </linearGradient>
      </defs>

      {/* Background card */}
      <rect x="10" y="10" width="220" height="160" rx="16" fill="url(#fl-bg)" />

      {/* Grid lines */}
      {[40, 70, 100, 130].map((y, i) => (
        <line key={i} x1="40" y1={y} x2="200" y2={y} stroke={C.blue} strokeOpacity="0.08" strokeWidth="1" />
      ))}

      {/* Bar chart bars */}
      <rect x="55"  y="80" width="28" height="60" rx="6" fill="url(#fl-bar1)" />
      <rect x="100" y="55" width="28" height="85" rx="6" fill="url(#fl-bar2)" />
      <rect x="145" y="68" width="28" height="72" rx="6" fill="url(#fl-bar3)" />

      {/* Trend line */}
      <polyline
        points="69,78 114,52 159,66"
        stroke={C.white}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      {/* Trend dots */}
      <circle cx="69"  cy="78" r="4" fill={C.white} />
      <circle cx="114" cy="52" r="4" fill={C.white} />
      <circle cx="159" cy="66" r="4" fill={C.white} />

      {/* K symbol — currency */}
      <text x="195" y="45" fontFamily="sans-serif" fontSize="24" fontWeight="bold" fill={C.gold} opacity="0.6">K</text>

      {/* Bottom baseline */}
      <line x1="40" y1="140" x2="200" y2="140" stroke={C.navy} strokeOpacity="0.12" strokeWidth="1.5" />

      {/* Decorative circle */}
      <circle cx="25" cy="25" r="14" fill={C.blue} opacity="0.12" />
      <circle cx="215" cy="155" r="10" fill={C.gold} opacity="0.15" />
    </svg>
  )
}

// ── Financial Health ───────────────────────────────────────────────────────
export function FinancialHealthIllustration({ width = 240, height = 180 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fh-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={C.gold} />
          <stop offset="100%" stopColor={C.copper} />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect x="10" y="10" width="220" height="160" rx="16" fill={C.gold} fillOpacity="0.05" />

      {/* Outer ring */}
      <circle cx="120" cy="95" r="60" stroke={C.gold} strokeWidth="2" strokeOpacity="0.15" fill="none" />

      {/* Progress arc — 39.1% health = about 141 degrees */}
      <circle
        cx="120" cy="95" r="52"
        stroke="url(#fh-ring)"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="131 195"
        strokeDashoffset="49"
        transform="rotate(-90 120 95)"
      />

      {/* Inner circle */}
      <circle cx="120" cy="95" r="38" fill={C.white} fillOpacity="0.7" />

      {/* Percentage text */}
      <text x="120" y="93" textAnchor="middle" fontFamily="sans-serif" fontSize="20" fontWeight="800" fill={C.navy}>39.1</text>
      <text x="120" y="108" textAnchor="middle" fontFamily="sans-serif" fontSize="10" fill={C.copper}>% healthy</text>

      {/* Three pillars */}
      {[
        { x: 30,  label: 'Daily',  h: 35, color: C.gold },
        { x: 50,  label: 'Risk',   h: 25, color: C.copper },
        { x: 70,  label: 'Future', h: 40, color: C.blue },
      ].map((b, i) => (
        <g key={i} transform={`translate(${185 + (i-1)*0}, 0)`}>
          <rect x={-10} y={140 - b.h} width="12" height={b.h} rx="3" fill={b.color} opacity="0.75" />
        </g>
      ))}

      {/* Pillars group */}
      <rect x="175" y="105" width="10" height="35" rx="3" fill={C.gold}   opacity="0.75" />
      <rect x="190" y="115" width="10" height="25" rx="3" fill={C.copper} opacity="0.75" />
      <rect x="205" y="100" width="10" height="40" rx="3" fill={C.blue}   opacity="0.75" />
      <line x1="172" y1="140" x2="218" y2="140" stroke={C.navy} strokeOpacity="0.12" strokeWidth="1" />

      {/* Stars / sparkles */}
      <circle cx="26" cy="30" r="3" fill={C.gold} opacity="0.6" />
      <circle cx="214" cy="25" r="4" fill={C.blue} opacity="0.5" />
    </svg>
  )
}

// ── Starting a Business ────────────────────────────────────────────────────
export function BusinessIllustration({ width = 240, height = 180 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="biz-roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.blue} />
          <stop offset="100%" stopColor={C.blueD} />
        </linearGradient>
        <linearGradient id="biz-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.white} stopOpacity="0.9" />
          <stop offset="100%" stopColor={C.offwhite} stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect x="10" y="10" width="220" height="160" rx="16" fill={C.blue} fillOpacity="0.05" />

      {/* Shop building */}
      <rect x="65" y="90" width="110" height="65" rx="4" fill="url(#biz-wall)" stroke={C.blue} strokeWidth="1.5" strokeOpacity="0.2" />
      {/* Roof */}
      <polygon points="55,90 120,52 185,90" fill="url(#biz-roof)" opacity="0.9" />

      {/* Shop window */}
      <rect x="82" y="103" width="32" height="26" rx="4" fill={C.blue} fillOpacity="0.15" stroke={C.blue} strokeWidth="1.5" strokeOpacity="0.3" />
      <line x1="98" y1="103" x2="98" y2="129" stroke={C.blue} strokeOpacity="0.2" strokeWidth="1" />
      <line x1="82" y1="116" x2="114" y2="116" stroke={C.blue} strokeOpacity="0.2" strokeWidth="1" />

      {/* Door */}
      <rect x="130" y="112" width="28" height="43" rx="4" fill={C.gold} fillOpacity="0.25" stroke={C.gold} strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="155" cy="134" r="2.5" fill={C.gold} opacity="0.8" />

      {/* Flag / sign */}
      <line x1="120" y1="52" x2="120" y2="30" stroke={C.copper} strokeWidth="2" />
      <rect x="120" y="24" width="28" height="14" rx="3" fill={C.copper} opacity="0.8" />
      <text x="134" y="34" textAnchor="middle" fontFamily="sans-serif" fontSize="7" fontWeight="bold" fill={C.white}>KIP</text>

      {/* Rising chart — right side */}
      <polyline
        points="195,140 200,120 205,128 210,105 215,112 220,88"
        stroke={C.gold}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.8"
      />
      <circle cx="220" cy="88" r="3.5" fill={C.gold} />

      {/* Ground */}
      <line x1="30" y1="155" x2="210" y2="155" stroke={C.navy} strokeOpacity="0.08" strokeWidth="1.5" />

      {/* Coins */}
      <circle cx="40" cy="148" r="6" fill={C.gold}   opacity="0.5" />
      <circle cx="33" cy="152" r="5" fill={C.copper} opacity="0.4" />
    </svg>
  )
}

// ── BizSim / Business Simulator ────────────────────────────────────────────
export function BizSimIllustration({ width = 240, height = 180 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sim-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.navy} />
          <stop offset="100%" stopColor={C.blueD} />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect x="10" y="10" width="220" height="160" rx="16" fill={C.blue} fillOpacity="0.06" />

      {/* Laptop/tablet screen */}
      <rect x="55" y="30" width="130" height="85" rx="8" fill="url(#sim-screen)" />
      <rect x="62" y="37" width="116" height="71" rx="5" fill={C.blueD} fillOpacity="0.5" />

      {/* Screen content — mini bar chart */}
      <rect x="72"  y="82" width="12" height="19" rx="2" fill={C.gold}    opacity="0.9" />
      <rect x="90"  y="70" width="12" height="31" rx="2" fill={C.goldL}   opacity="0.9" />
      <rect x="108" y="60" width="12" height="41" rx="2" fill={C.blue}    opacity="0.9" />
      <rect x="126" y="74" width="12" height="27" rx="2" fill={C.copper}  opacity="0.9" />
      <rect x="144" y="55" width="12" height="46" rx="2" fill={C.blueL}   opacity="0.9" />

      {/* Screen glow dot */}
      <circle cx="68" cy="42" r="3" fill={C.gold} opacity="0.8" />
      <circle cx="78" cy="42" r="3" fill={C.copperL} opacity="0.7" />
      <circle cx="88" cy="42" r="3" fill={C.blueL} opacity="0.7" />

      {/* Laptop base */}
      <rect x="45" y="115" width="150" height="8" rx="4" fill={C.navy} fillOpacity="0.15" />
      <rect x="90" y="123" width="60"  height="4" rx="2" fill={C.navy} fillOpacity="0.10" />

      {/* KZM badge */}
      <rect x="152" y="28" width="36" height="18" rx="9" fill={C.gold} opacity="0.9" />
      <text x="170" y="40" textAnchor="middle" fontFamily="sans-serif" fontSize="8" fontWeight="bold" fill={C.white}>K250</text>

      {/* Coins/cash floating */}
      <circle cx="34"  cy="60"  r="7" fill={C.gold}   opacity="0.45" />
      <circle cx="207" cy="70"  r="6" fill={C.copper} opacity="0.40" />
      <circle cx="30"  cy="130" r="5" fill={C.blue}   opacity="0.35" />

      {/* Arrows — growth */}
      <path d="M 32 100 L 44 88 L 44 95 L 52 95" stroke={C.green} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
  )
}

// ── Dashboard Hero ─────────────────────────────────────────────────────────
export function DashboardHeroIllustration({ width = 320, height = 200 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dh-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={C.blue}   stopOpacity="0.08" />
          <stop offset="100%" stopColor={C.gold}   stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="dh-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={C.blue} />
          <stop offset="100%" stopColor={C.goldL} />
        </linearGradient>
      </defs>

      {/* Card 1 */}
      <rect x="10" y="20" width="88" height="58" rx="12" fill="url(#dh-card)" stroke={C.border} strokeWidth="1" />
      <text x="26" y="45" fontFamily="sans-serif" fontSize="11" fill={C.muted}>Revenue</text>
      <text x="26" y="62" fontFamily="sans-serif" fontSize="16" fontWeight="800" fill={C.blue}>K4,200</text>

      {/* Card 2 */}
      <rect x="108" y="20" width="88" height="58" rx="12" fill="url(#dh-card)" stroke={C.border} strokeWidth="1" />
      <text x="124" y="45" fontFamily="sans-serif" fontSize="11" fill={C.muted}>Profit</text>
      <text x="124" y="62" fontFamily="sans-serif" fontSize="16" fontWeight="800" fill={C.gold}>K1,850</text>

      {/* Card 3 */}
      <rect x="206" y="20" width="104" height="58" rx="12" fill="url(#dh-card)" stroke={C.border} strokeWidth="1" />
      <text x="222" y="45" fontFamily="sans-serif" fontSize="11" fill={C.muted}>KIP Score</text>
      <text x="222" y="62" fontFamily="sans-serif" fontSize="16" fontWeight="800" fill={C.copper}>74 / 100</text>

      {/* Area chart */}
      <rect x="10" y="90" width="300" height="100" rx="12" fill="url(#dh-card)" stroke={C.border} strokeWidth="1" />
      <polyline
        points="30,155 65,135 100,145 135,118 170,128 205,105 240,115 275,92 300,100"
        stroke="url(#dh-line)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Area fill */}
      <path
        d="M 30,155 65,135 100,145 135,118 170,128 205,105 240,115 275,92 300,100 L 300,180 L 30,180 Z"
        fill="url(#dh-line)"
        opacity="0.06"
      />
      {/* Latest dot */}
      <circle cx="300" cy="100" r="4" fill={C.gold} />
      <circle cx="300" cy="100" r="8" fill={C.gold} fillOpacity="0.2" />
    </svg>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────
export function EmptyStateIllustration({ width = 200, height = 160 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer circle */}
      <circle cx="100" cy="80" r="60" fill={C.blue} fillOpacity="0.05" />
      <circle cx="100" cy="80" r="44" fill={C.blue} fillOpacity="0.06" stroke={C.blue} strokeWidth="1.5" strokeOpacity="0.15" strokeDasharray="4 4" />

      {/* Document icon — abstract */}
      <rect x="78" y="52" width="44" height="56" rx="6" fill={C.white} stroke={C.blue} strokeWidth="1.5" strokeOpacity="0.3" />
      <rect x="86" y="64" width="28" height="3" rx="1.5" fill={C.blue}  fillOpacity="0.3" />
      <rect x="86" y="72" width="22" height="3" rx="1.5" fill={C.gold}  fillOpacity="0.4" />
      <rect x="86" y="80" width="25" height="3" rx="1.5" fill={C.blue}  fillOpacity="0.2" />
      <rect x="86" y="88" width="18" height="3" rx="1.5" fill={C.copper}fillOpacity="0.3" />

      {/* Plus icon */}
      <circle cx="122" cy="53" r="12" fill={C.gold} />
      <line x1="122" y1="47" x2="122" y2="59" stroke={C.white} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="116" y1="53" x2="128" y2="53" stroke={C.white} strokeWidth="2.5" strokeLinecap="round" />

      {/* Sparkles */}
      <circle cx="35"  cy="35"  r="4" fill={C.gold}   opacity="0.5" />
      <circle cx="165" cy="45"  r="3" fill={C.blue}   opacity="0.5" />
      <circle cx="40"  cy="130" r="3" fill={C.copper} opacity="0.4" />
      <circle cx="160" cy="125" r="5" fill={C.gold}   opacity="0.35" />
    </svg>
  )
}
