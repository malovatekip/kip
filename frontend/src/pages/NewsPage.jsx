import React, { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, Minus, Bell, BellOff,
  ExternalLink, RefreshCw, Zap, DollarSign, ChevronDown, X,
  BookOpen, ChevronUp, Building2, Wheat, Flame, Pickaxe,
  ShoppingBag, BarChart2, Globe, AlertTriangle, Clock,
  ArrowUpRight, Lightbulb, Users, Briefcase,
} from 'lucide-react'
import Layout from '../components/Layout'
import api from '../lib/api'

// ─── CATEGORY META ─────────────────────────────────────────────────────────
const CATEGORY_META = {
  monetary_policy: { label: 'Monetary Policy', icon: Building2,  color: '#2B7FFF' },
  exchange_rate:   { label: 'Exchange Rate',    icon: TrendingUp,  color: '#F6AD55' },
  inflation:       { label: 'Inflation',         icon: TrendingUp,  color: '#EF4444' },
  fuel_energy:     { label: 'Fuel & Energy',     icon: Flame,       color: '#F97316' },
  mining:          { label: 'Mining',             icon: Pickaxe,     color: '#8B5CF6' },
  agriculture:     { label: 'Agriculture',        icon: Wheat,       color: '#10B981' },
  sme_business:    { label: 'SME & Business',     icon: Briefcase,   color: '#00D4B1' },
  trade_commerce:  { label: 'Trade & Commerce',   icon: ShoppingBag, color: '#EC4899' },
  fiscal_policy:   { label: 'Fiscal Policy',      icon: BarChart2,   color: '#6366F1' },
  food_security:   { label: 'Food Security',       icon: Wheat,       color: '#22C55E' },
}

// ─── BRIEFING CARD HEADER ───────────────────────────────────────────────────
// Prefers the real photo scraped from the briefing's source page (backend
// image_url). Falls back to the category-colored icon tile when the source
// had no image or it fails to load — never a random stock photo. (Keyless
// stock-photo services were tried before and returned unrelated images,
// which is worse than no image for a briefing about specific Zambian news.)
function BriefingImage({ imageUrl, category, title }) {
  const meta  = CATEGORY_META[category] || CATEGORY_META.fiscal_policy
  const Icon  = meta.icon
  const color = meta.color
  const [imgOk, setImgOk] = useState(true)

  if (imageUrl && imgOk) {
    return (
      <img
        src={imageUrl}
        alt={title}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setImgOk(false)}
        style={{
          width: '100%', height: 200, objectFit: 'cover',
          borderRadius: '12px 12px 0 0', display: 'block',
          borderBottom: `1px solid ${color}30`,
        }}
      />
    )
  }

  return (
    <div title={title} style={{
      width: '100%', height: 200, borderRadius: '12px 12px 0 0',
      background: `linear-gradient(135deg, ${color}22, ${color}08)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      border: `1px solid ${color}30`,
      gap: 8,
    }}>
      <Icon size={40} style={{ color, opacity: 0.6 }} />
      <span style={{ fontSize: 11, color, fontFamily: 'Syne', fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {meta.label}
      </span>
    </div>
  )
}

// ─── BRIEFING CARD ─────────────────────────────────────────────────────────
function BriefingCard({ briefing }) {
  const [expanded, setExpanded] = useState(false)
  const meta   = CATEGORY_META[briefing.category] || CATEGORY_META.fiscal_policy
  const color  = meta.color
  const isHigh = briefing.importance === 'HIGH'

  // Split explanation into paragraphs
  const paragraphs = (briefing.explanation || '').split('\n\n').filter(Boolean)

  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${isHigh ? color + '45' : 'var(--border)'}`,
      background: 'var(--card)',
      overflow: 'hidden',
      transition: 'all 0.25s ease',
      boxShadow: isHigh ? `0 4px 24px ${color}15` : 'none',
    }}>

      {/* Image */}
      <BriefingImage
        imageUrl={briefing.image_url}
        category={briefing.category}
        title={briefing.title}
      />

      {/* Card body */}
      <div style={{ padding: '16px 18px' }}>

        {/* Top row — source + importance + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 10, fontFamily: 'Syne', fontWeight: 700,
            color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {briefing.source}
          </span>
          {isHigh && (
            <span style={{
              fontSize: 9, fontFamily: 'Syne', fontWeight: 800,
              padding: '2px 8px', borderRadius: 20,
              background: 'rgba(239,68,68,0.12)', color: '#EF4444',
              border: '1px solid rgba(239,68,68,0.3)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Important
            </span>
          )}
          {briefing.date_published && (
            <span style={{ fontSize: 10, color: 'var(--faint)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={9} /> {briefing.date_published}
            </span>
          )}
        </div>

        {/* Emoji + Title */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 22, lineHeight: 1.2, flexShrink: 0 }}>{briefing.emoji}</span>
          <h3 style={{
            fontFamily: 'Syne', fontWeight: 800, fontSize: 15,
            color: 'var(--text)', lineHeight: 1.3, margin: 0,
          }}>
            {briefing.title}
          </h3>
        </div>

        {/* Plain headline */}
        <p style={{
          fontSize: 13, color: 'var(--muted)', lineHeight: 1.65,
          margin: '0 0 14px',
        }}>
          {briefing.headline_plain}
        </p>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%',
            padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
            background: expanded ? `${color}12` : 'var(--input-bg)',
            border: `1px solid ${expanded ? color + '40' : 'var(--border)'}`,
            fontFamily: 'Syne', fontWeight: 700, fontSize: 12,
            color: expanded ? color : 'var(--muted)',
            transition: 'all 0.2s ease',
          }}
        >
          <BookOpen size={13} />
          {expanded ? 'Close explanation' : 'Read KIP\'s explanation'}
          <span style={{ marginLeft: 'auto' }}>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </span>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="animate-slide-up" style={{ marginTop: 14 }}>

            {/* Full explanation */}
            <div style={{
              padding: '14px 16px', borderRadius: 12, marginBottom: 14,
              background: 'var(--input-bg)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                What Happened — Plain English
              </div>
              {paragraphs.map((para, i) => (
                <p key={i} style={{
                  fontSize: 13.5, color: 'var(--text)', lineHeight: 1.78,
                  margin: i < paragraphs.length - 1 ? '0 0 12px' : 0,
                }}>
                  {para}
                </p>
              ))}
            </div>

            {/* Impact on ordinary Zambians */}
            {briefing.impact_ordinary && (
              <div style={{
                display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 12, marginBottom: 10,
                background: 'var(--input-bg)', border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <Users size={15} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 10, fontFamily: 'Syne', fontWeight: 700, color: '#EF4444', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    How This Affects Ordinary Zambians
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, margin: 0 }}>
                    {briefing.impact_ordinary}
                  </p>
                </div>
              </div>
            )}

            {/* Impact on small businesses */}
            {briefing.impact_business && (
              <div style={{
                display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 12, marginBottom: 10,
                background: 'var(--input-bg)', border: '1px solid rgba(43,127,255,0.2)',
              }}>
                <Briefcase size={15} style={{ color: 'var(--blue-bright)', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 10, fontFamily: 'Syne', fontWeight: 700, color: 'var(--blue-bright)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Impact on Small Businesses
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, margin: 0 }}>
                    {briefing.impact_business}
                  </p>
                </div>
              </div>
            )}

            {/* KIP's take */}
            {briefing.kip_take && (
              <div style={{
                display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 12, marginBottom: 14,
                background: 'linear-gradient(135deg, rgba(0,240,200,0.08), rgba(43,127,255,0.05))',
                border: '1px solid rgba(0,240,200,0.25)',
              }}>
                <Lightbulb size={15} style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 10, fontFamily: 'Syne', fontWeight: 700, color: 'var(--teal)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    KIP's Advice
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
                    {briefing.kip_take}
                  </p>
                </div>
              </div>
            )}

            {/* Source link */}
            {briefing.source_url && (
              <a
                href={briefing.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 9, textDecoration: 'none',
                  background: `${color}12`, border: `1px solid ${color}30`,
                  fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color,
                }}
              >
                <ArrowUpRight size={12} />
                Read original — {briefing.source}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── EMPTY STATE ────────────────────────────────────────────────────────────
function BriefingsEmpty() {
  return (
    <div style={{ textAlign: 'center', padding: '52px 24px' }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(43,127,255,0.2), rgba(0,240,200,0.1))',
        border: '1px solid rgba(43,127,255,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 18px',
      }}>
        <Globe size={28} style={{ color: 'var(--blue-bright)', opacity: 0.6 }} />
      </div>
      <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 17, color: 'var(--text)', marginBottom: 8 }}>
        No briefings yet
      </h3>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, maxWidth: 360, margin: '0 auto 20px' }}>
        KIP researches the latest stories from BoZ, State House, and government ministries on a schedule. Check back soon.
      </p>
    </div>
  )
}

// ─── KIP EXPLAINS TAB ──────────────────────────────────────────────────────
function KipExplainsTab() {
  const [briefings,    setBriefings]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [status,       setStatus]       = useState(null)
  const [filterCat,    setFilterCat]    = useState('all')

  const loadBriefings = useCallback(async () => {
    try {
      const { data } = await api.get('/news/briefings')
      setBriefings(data.briefings || [])
      setStatus({
        generated_at: data.generated_at,
        date:         data.generated_date,
        count:        data.count,
      })
    } catch {
      setBriefings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBriefings()
  }, [loadBriefings])

  // Distinct categories present in the current briefings
  const availableCategories = ['all', ...new Set(briefings.map(b => b.category))]

  const filtered = filterCat === 'all'
    ? briefings
    : briefings.filter(b => b.category === filterCat)

  // Time since last generation
  const timeAgoStr = (iso) => {
    if (!iso) return null
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60)   return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div>

      {/* ── Header bar ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: 'linear-gradient(135deg, var(--blue), var(--teal))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Zap size={15} color="#fff" />
            </div>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: 'var(--text)', margin: 0 }}>
              KIP Explains
            </h2>
            <span style={{
              fontSize: 9, fontFamily: 'Syne', fontWeight: 800,
              padding: '2px 8px', borderRadius: 20,
              background: 'var(--teal-dim)', color: 'var(--teal)',
              border: '1px solid rgba(0,240,200,0.3)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              AI
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
            KIP reads BoZ, State House, and government ministries — then explains what the news means for ordinary Zambians, in plain language.
          </p>
          {status?.generated_at && (
            <p style={{ fontSize: 11, color: 'var(--faint)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={10} />
              Last updated: {timeAgoStr(status.generated_at)} · {status.count} stories
            </p>
          )}
        </div>
      </div>

      {/* Sources banner */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        padding: '10px 14px', borderRadius: 10, marginBottom: 18,
        background: 'var(--input-bg)', border: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 10, fontFamily: 'Syne', fontWeight: 700, color: 'var(--faint)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
          Sources:
        </span>
        {['Bank of Zambia', 'State House', 'Min. of Finance', 'Min. of Mines', 'Min. of Agriculture', 'SMED', 'Zamstats', 'ERB', 'Min. of Commerce'].map(src => (
          <span key={src} style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 20,
            background: 'var(--blue-dim)', color: 'var(--blue-bright)',
            border: '1px solid rgba(43,127,255,0.2)',
            fontFamily: 'Syne', fontWeight: 600,
          }}>
            {src}
          </span>
        ))}
      </div>

      {/* Category filter chips */}
      {briefings.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          {availableCategories.map(cat => {
            const meta   = CATEGORY_META[cat]
            const active = filterCat === cat
            return (
              <button key={cat} onClick={() => setFilterCat(cat)} style={{
                padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                fontFamily: 'Syne', fontWeight: 700, fontSize: 11,
                background: active ? (meta ? `${meta.color}20` : 'var(--blue-dim)') : 'var(--input-bg)',
                border: `1px solid ${active ? (meta ? meta.color + '50' : 'rgba(43,127,255,0.4)') : 'var(--border)'}`,
                color: active ? (meta ? meta.color : 'var(--blue-bright)') : 'var(--muted)',
                transition: 'all 0.15s ease',
              }}>
                {cat === 'all' ? '🌍 All Topics' : `${meta?.label || cat}`}
              </button>
            )
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div className="shimmer-load" style={{ height: 200, borderRadius: 0 }} />
              <div style={{ padding: 18 }}>
                <div className="shimmer-load" style={{ height: 14, borderRadius: 6, marginBottom: 8, width: '60%' }} />
                <div className="shimmer-load" style={{ height: 20, borderRadius: 6, marginBottom: 10 }} />
                <div className="shimmer-load" style={{ height: 13, borderRadius: 6, marginBottom: 5 }} />
                <div className="shimmer-load" style={{ height: 13, borderRadius: 6, width: '80%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <BriefingsEmpty />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filtered.map(briefing => (
            <BriefingCard key={briefing.id} briefing={briefing} />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      {briefings.length > 0 && (
        <p style={{ fontSize: 11, color: 'var(--faint)', textAlign: 'center', marginTop: 24, lineHeight: 1.6 }}>
          KIP's explanations are educational summaries — not financial or investment advice.
          Always verify with the original source before making business decisions.
        </p>
      )}
    </div>
  )
}

// ─── EXISTING NEWS PAGE HELPERS (unchanged) ─────────────────────────────────

// Colors intentionally echo CATEGORY_META above so both tabs read as one system.
const CATEGORIES = [
  { key:'all',             label:'All News',       color: null },
  { key:'general_economy', label:'Economy',        color: '#2B7FFF' },
  { key:'banking_finance', label:'Finance',        color: '#6366F1' },
  { key:'exchange_rate',   label:'Exchange Rate',  color: '#F6AD55' },
  { key:'mining_copper',   label:'Mining',         color: '#8B5CF6' },
  { key:'agriculture',     label:'Agriculture',    color: '#10B981' },
  { key:'fuel_energy',     label:'Fuel & Energy',  color: '#F97316' },
  { key:'sme_business',    label:'SME & Business', color: '#00D4B1' },
  { key:'taxation_fiscal', label:'Tax & Fiscal',   color: '#EC4899' },
]
const CAT_BY_KEY = Object.fromEntries(CATEGORIES.map(c => [c.key, c]))

function timeAgo(iso) {
  if (!iso) return ''
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'Just now'
  if (d < 3600) return `${Math.floor(d/60)}m ago`
  if (d < 86400) return `${Math.floor(d/3600)}h ago`
  return `${Math.floor(d/86400)}d ago`
}

function RateTicker({ rates }) {
  if (!rates || !Object.keys(rates).length) return null
  const items = [
    rates.usd_zmw && { label:'USD/ZMW', value:rates.usd_zmw.value?.toFixed(2), dir:rates.usd_zmw.direction },
    rates.petrol  && { label:'Petrol',  value:`K${rates.petrol.value?.toFixed(2)}/L`, dir:rates.petrol.direction },
    rates.diesel  && { label:'Diesel',  value:`K${rates.diesel.value?.toFixed(2)}/L`, dir:rates.diesel.direction },
  ].filter(Boolean)
  return (
    <div className="kip-card" style={{ padding: 16, marginBottom: 20, borderColor: 'rgba(0,240,200,0.3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span className="live-dot" />
        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Live Rates
        </span>
        {rates.usd_zmw?.fetched_at && (
          <span style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 'auto' }}>
            Updated {timeAgo(rates.usd_zmw.fetched_at)}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {items.map(({ label, value, dir }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 12, minWidth: 120,
            background: 'var(--input-bg)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '10px 14px',
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{value}</div>
            </div>
            {dir==='up'     && <TrendingUp   size={16} style={{ color: 'var(--red)', marginLeft: 'auto' }} />}
            {dir==='down'   && <TrendingDown size={16} style={{ color: 'var(--green-bright)', marginLeft: 'auto' }} />}
            {dir==='stable' && <Minus        size={16} style={{ color: 'var(--faint)', marginLeft: 'auto' }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function AlertCard({ alert, onDismiss }) {
  return (
    <div className="animate-slide-up" style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      padding: 14, borderRadius: 16, marginBottom: 10,
      background: 'linear-gradient(135deg, var(--gold-dim), var(--input-bg))',
      border: '1px solid rgba(232,151,62,0.35)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'var(--gold-dim)', border: '1px solid rgba(232,151,62,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={15} style={{ color: 'var(--gold-bright)' }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>
            {alert.headline}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 6 }}>
            {alert.kip_message}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {alert.business_name && (
              <span style={{
                fontSize: 10, fontFamily: 'Syne', fontWeight: 600,
                padding: '2px 9px', borderRadius: 20,
                background: 'var(--blue-dim)', color: 'var(--blue-bright)',
                border: '1px solid rgba(43,127,255,0.3)',
              }}>
                {alert.business_name}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--faint)' }}>{timeAgo(alert.created_at)}</span>
          </div>
        </div>
      </div>
      <button
        onClick={() => onDismiss(alert.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--faint)', flexShrink: 0 }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--faint)' }}
      >
        <X size={15} />
      </button>
    </div>
  )
}

function ArticleCard({ article }) {
  const cat   = CAT_BY_KEY[article.category]
  const color = cat?.color || 'var(--blue-bright)'
  // Hide the thumbnail slot entirely if the image fails to load (dead link,
  // hotlink-blocked source, etc.) so the card falls back to text-only.
  const [imgOk, setImgOk] = useState(true)
  const showImage = article.image_url && imgOk

  return (
    <a href={article.url} target="_blank" rel="noopener noreferrer"
       className="kip-card animate-slide-up" style={{ display: 'flex', gap: 14, padding: 16, textDecoration: 'none' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{article.source_name}</span>
            <span style={{
              fontSize: 10, fontFamily: 'Syne', fontWeight: 700,
              padding: '2px 9px', borderRadius: 20,
              background: `${color}18`, color, border: `1px solid ${color}35`,
            }}>
              {cat?.label || article.category}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--faint)' }}>{timeAgo(article.published_at || article.fetched_at)}</span>
            <ExternalLink size={13} style={{ color: 'var(--faint)' }} />
          </div>
        </div>
        <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--text)', lineHeight: 1.4, margin: '0 0 6px' }}>
          {article.headline}
        </h3>
        {article.summary && (
          <p style={{
            fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, margin: 0,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {article.summary}
          </p>
        )}
      </div>
      {showImage && (
        <img
          src={article.image_url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgOk(false)}
          style={{
            width: 108, minHeight: 82, alignSelf: 'stretch', maxHeight: 130,
            objectFit: 'cover', borderRadius: 12, flexShrink: 0,
            border: '1px solid var(--border)',
          }}
        />
      )}
    </a>
  )
}

// ─── MAIN NEWS PAGE ─────────────────────────────────────────────────────────

const LIMIT = 15

// Main tabs — existing feed + new KIP Explains
const MAIN_TABS = [
  { key: 'feed',     label: 'News Feed'    },
  { key: 'explains', label: 'KIP Explains' },
]

export default function NewsPage() {
  const [mainTab,    setMainTab]    = useState('feed')
  const [rates,      setRates]      = useState({})
  const [articles,   setArticles]   = useState([])
  const [alerts,     setAlerts]     = useState([])
  const [category,   setCategory]   = useState('all')
  const [total,      setTotal]      = useState(0)
  const [offset,     setOffset]     = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [loadMore,   setLoadMore]   = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadRates   = useCallback(() => { api.get('/news/rates').then(r => setRates(r.data)).catch(()=>{}) }, [])
  const loadAlerts  = useCallback(() => { api.get('/news/alerts').then(r => setAlerts(r.data||[])).catch(()=>{}) }, [])
  const loadArticles= useCallback((cat, off, append=false) => {
    const p = `?limit=${LIMIT}&offset=${off}${cat!=='all'?`&category=${cat}`:''}`
    if (!append) setLoading(true); else setLoadMore(true)
    api.get(`/news/articles${p}`).then(r => {
      setTotal(r.data.total||0)
      setArticles(prev => append ? [...prev,...(r.data.articles||[])] : (r.data.articles||[]))
    }).catch(()=>{}).finally(() => { setLoading(false); setLoadMore(false) })
  }, [])

  useEffect(() => {
    loadRates(); loadAlerts(); loadArticles('all',0)
    const iv = setInterval(loadRates, 900000)
    return () => clearInterval(iv)
  }, [])

  const handleCat   = cat => { setCategory(cat); setOffset(0); loadArticles(cat,0) }
  const handleMore  = () => { const n=offset+LIMIT; setOffset(n); loadArticles(category,n,true) }
  const handleRefreshFeed = async () => {
    setRefreshing(true)
    try {
      await api.post('/news/articles/refresh')
      await api.post('/news/rates/refresh')
      loadRates(); loadAlerts(); loadArticles(category,0)
    } catch{}
    setRefreshing(false)
  }
  const dismissAlert = async id => {
    try { await api.patch(`/news/alerts/${id}/read`); setAlerts(prev=>prev.filter(a=>a.id!==id)) } catch{}
  }

  const unread = alerts.filter(a => !a.is_read)

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 relative">

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--blue), var(--teal))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--glow-blue)',
            }}>
              <Globe size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, color: 'var(--text)', margin: 0 }}>
                Economic News
              </h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '2px 0 0' }}>
                Live rates, Zambian news, and KIP's plain-English explanations
              </p>
            </div>
          </div>
          {mainTab === 'feed' && (
            <button onClick={handleRefreshFeed} disabled={refreshing} className="kip-btn kip-btn-ghost" style={{ fontSize: 13, padding: '9px 18px' }}>
              <RefreshCw size={14} style={{ animation: refreshing ? 'spinSlow 0.8s linear infinite' : 'none' }} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </div>

        {/* ── MAIN TAB SWITCHER ── */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border)',
          marginBottom: 24, gap: 0,
        }}>
          {MAIN_TABS.map(tab => {
            const active = mainTab === tab.key
            return (
              <button key={tab.key} onClick={() => setMainTab(tab.key)} style={{
                padding: '10px 22px', fontFamily: 'Syne', fontWeight: 700, fontSize: 14,
                color: active ? 'var(--blue-bright)' : 'var(--muted)',
                borderBottom: `2px solid ${active ? 'var(--blue-bright)' : 'transparent'}`,
                background: 'none', border: 'none',
                borderBottomWidth: 2, borderBottomStyle: 'solid',
                borderBottomColor: active ? 'var(--blue-bright)' : 'transparent',
                cursor: 'pointer', marginBottom: -1, flexShrink: 0,
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', gap: 7,
              }}>
                {tab.key === 'explains' && (
                  <span style={{
                    fontSize: 9, fontFamily: 'Syne', fontWeight: 800,
                    padding: '1px 6px', borderRadius: 20,
                    background: active ? 'var(--teal-dim)' : 'var(--input-bg)',
                    color: active ? 'var(--teal)' : 'var(--faint)',
                    border: `1px solid ${active ? 'rgba(0,240,200,0.3)' : 'var(--border)'}`,
                  }}>
                    AI
                  </span>
                )}
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* ── KIP EXPLAINS TAB ── */}
        {mainTab === 'explains' && <KipExplainsTab />}

        {/* ── NEWS FEED TAB ── */}
        {mainTab === 'feed' && (
          <>
            <RateTicker rates={rates} />

            {unread.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bell size={15} style={{ color: 'var(--gold-bright)' }} />
                    <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>KIP Alerts</span>
                    <span style={{
                      fontSize: 11, fontWeight: 800, fontFamily: 'Syne',
                      background: 'var(--gold)', color: '#fff',
                      padding: '1px 8px', borderRadius: 20,
                    }}>
                      {unread.length}
                    </span>
                  </div>
                  <button
                    onClick={async()=>{ try{await api.patch('/news/alerts/read-all');setAlerts([])}catch{} }}
                    style={{ fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)' }}
                  >
                    <BellOff size={13} /> Dismiss all
                  </button>
                </div>
                {unread.slice(0,3).map(a => <AlertCard key={a.id} alert={a} onDismiss={dismissAlert} />)}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              {CATEGORIES.map(c => {
                const active = category === c.key
                const color  = c.color || 'var(--blue-bright)'
                return (
                  <button key={c.key} onClick={() => handleCat(c.key)} style={{
                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                    fontFamily: 'Syne', fontWeight: 700, fontSize: 11.5,
                    background: active ? `${color}20` : 'var(--input-bg)',
                    border: `1px solid ${active ? color + '50' : 'var(--border)'}`,
                    color: active ? color : 'var(--muted)',
                    transition: 'all 0.15s ease',
                  }}>
                    {c.label}
                  </button>
                )
              })}
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[0,1,2,3].map(i => <div key={i} className="shimmer-load" style={{ height: 96, borderRadius: 16 }} />)}
              </div>
            ) : articles.length === 0 ? (
              <div className="kip-card" style={{ textAlign: 'center', padding: '48px 24px', borderStyle: 'dashed' }}>
                <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text)', margin: '0 0 6px' }}>No articles yet</p>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Refresh to populate the feed</p>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: 'var(--faint)', marginBottom: 14 }}>{total} articles</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {articles.map(a => <ArticleCard key={a.id} article={a} />)}
                </div>
                {articles.length < total && (
                  <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <button onClick={handleMore} disabled={loadMore} className="kip-btn kip-btn-ghost" style={{ fontSize: 13, padding: '10px 22px' }}>
                      {loadMore
                        ? <RefreshCw size={14} style={{ animation: 'spinSlow 0.8s linear infinite' }} />
                        : <ChevronDown size={14} />}
                      {loadMore ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

      </div>
    </Layout>
  )
}
