import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Zap, Trophy, Target, AlertTriangle,
  ChevronRight, DollarSign, Users, ShoppingCart, BarChart2,
  ArrowLeft, RefreshCw, Lock, CheckCircle, Star, Flame,
  Building2, MessageSquare, Award, Info, Loader2,
} from 'lucide-react'
import api from '../lib/api'
import toast from 'react-hot-toast'

// ── Colour palette ────────────────────────────────────────────────────────────
const C = {
  navy:    '#0A1628',
  card:    '#111E35',
  border:  '#1E3A5F',
  blue:    '#2B7FFF',
  teal:    '#00D4B1',
  gold:    '#F6AD55',
  green:   '#1AE06E',
  red:     '#EF4444',
  purple:  '#8B5CF6',
  orange:  '#F59E0B',
  pink:    '#EC4899',
  white:   '#F1F5F9',
  muted:   '#64748B',
}

const BIZ_COLOURS = {
  grocery:   '#1D9E75',
  poultry:   '#F59E0B',
  restaurant:'#EF4444',
  transport: '#3B82F6',
  phone:     '#8B5CF6',
  food_stall:'#10B981',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt  = n => `K${(n || 0).toLocaleString('en-ZM', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtD = n => `K${(n || 0).toFixed(2)}`
const pct  = n => `${(n || 0).toFixed(1)}%`

function PulseRing({ colour, size = 40 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: colour + '20', animation: 'pulse 2s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 4, borderRadius: '50%',
        background: colour + '35',
      }} />
    </div>
  )
}

function GlowCard({ children, colour = C.blue, style = {} }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${colour}40`,
      borderRadius: 16,
      boxShadow: `0 4px 24px ${colour}20, 0 0 0 1px ${colour}15`,
      ...style,
    }}>
      {children}
    </div>
  )
}

function StatTile({ label, value, sub, colour = C.blue, icon: Icon, big }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${colour}30`,
      borderRadius: 14, padding: big ? '16px 18px' : '12px 14px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${colour}, ${colour}00)`,
      }} />
      {Icon && <Icon size={14} style={{ color: colour, marginBottom: 6 }} />}
      <div style={{ fontSize: big ? 26 : 20, fontFamily: 'Syne', fontWeight: 800, color: colour, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontFamily: 'Syne', fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: colour + 'AA', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function HealthBar({ value, max, colour, label }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: colour, fontFamily: 'Syne', fontWeight: 700 }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ height: 6, background: '#1E3A5F', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3,
          background: `linear-gradient(90deg, ${colour}, ${colour}cc)`,
          transition: 'width 0.6s ease', boxShadow: `0 0 8px ${colour}80`,
        }} />
      </div>
    </div>
  )
}

// ── Setup screen ──────────────────────────────────────────────────────────────
function SetupScreen({ onStart }) {
  const [businesses, setBusinesses] = useState([])
  const [selected,   setSelected]   = useState(null)
  const [bizName,    setBizName]     = useState('')
  const [starting,   setStarting]    = useState(false)

  useEffect(() => {
    api.get('/bizsim/business-types')
      .then(r => setBusinesses(r.data.businesses || []))
      .catch(() => {})
  }, [])

  const handleStart = async () => {
    if (!selected) { toast.error('Choose a business type.'); return }
    if (!bizName.trim()) { toast.error('Name your business.'); return }
    setStarting(true)
    try {
      await onStart(selected.id, bizName.trim())
    } finally {
      setStarting(false)
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
        <div style={{
          display: 'inline-block', fontSize: 11, fontFamily: 'Syne',
          fontWeight: 700, letterSpacing: '0.15em', color: C.teal,
          background: `${C.teal}15`, border: `1px solid ${C.teal}30`,
          padding: '4px 14px', borderRadius: 20, marginBottom: 14,
        }}>
          KIP BUSINESS SIMULATOR
        </div>
        <h1 style={{
          fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(22px,5vw,36px)',
          color: C.white, lineHeight: 1.15, marginBottom: 10,
        }}>
          Run a real Zambian business.<br />
          <span style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.teal})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Feel every decision.
          </span>
        </h1>
        <p style={{ fontSize: 14, color: C.muted, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
          Set prices, manage cash flow, negotiate with suppliers, and survive market shocks.
          Get live AI coaching from KIP. Real economics. Real consequences.
        </p>
      </div>

      {/* Business selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: C.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
          CHOOSE YOUR BUSINESS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {businesses.map(biz => (
            <button key={biz.id} onClick={() => setSelected(biz)} style={{
              padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
              textAlign: 'left', position: 'relative', overflow: 'hidden',
              background: selected?.id === biz.id ? `${biz.colour}20` : C.card,
              border: `1px solid ${selected?.id === biz.id ? biz.colour : C.border}`,
              transition: 'all 0.2s ease',
              boxShadow: selected?.id === biz.id ? `0 0 20px ${biz.colour}30` : 'none',
            }}>
              {selected?.id === biz.id && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: biz.colour }} />
              )}
              <div style={{ fontSize: 26, marginBottom: 6 }}>{biz.emoji}</div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: C.white, marginBottom: 2 }}>{biz.name}</div>
              <div style={{ fontSize: 10, color: biz.colour, fontFamily: 'Syne', fontWeight: 600, marginBottom: 6 }}>{biz.location}</div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{biz.description}</div>
              <div style={{ marginTop: 8, padding: '5px 8px', background: `${biz.colour}15`, borderRadius: 6, fontSize: 10, color: biz.colour, fontFamily: 'Syne', fontWeight: 700 }}>
                {biz.mechanic}
              </div>
              <div style={{ marginTop: 8, fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: C.white }}>
                {fmt(biz.capital)} <span style={{ fontSize: 10, fontWeight: 400, color: C.muted }}>starting capital</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Name input */}
      {selected && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: C.muted, letterSpacing: '0.1em', marginBottom: 10 }}>
            NAME YOUR BUSINESS
          </div>
          <input
            value={bizName} onChange={e => setBizName(e.target.value)}
            placeholder={`e.g. Chanda's ${selected.name}`}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12,
              background: C.card, border: `1px solid ${selected.colour}50`,
              color: C.white, fontSize: 15, fontFamily: 'Syne', fontWeight: 600,
              outline: 'none', boxSizing: 'border-box',
              boxShadow: `0 0 0 0px ${selected.colour}`,
              transition: 'box-shadow 0.2s',
            }}
            onFocus={e => e.target.style.boxShadow = `0 0 0 3px ${selected.colour}30`}
            onBlur={e => e.target.style.boxShadow = '0 0 0 0px transparent'}
          />
        </div>
      )}

      <button onClick={handleStart} disabled={!selected || !bizName.trim() || starting}
        style={{
          width: '100%', padding: '15px 0', borderRadius: 14, cursor: 'pointer',
          background: selected ? `linear-gradient(135deg, ${selected.colour}, ${selected.colour}cc)` : '#1E3A5F',
          border: 'none', color: '#fff', fontFamily: 'Syne', fontWeight: 800, fontSize: 16,
          boxShadow: selected ? `0 8px 32px ${selected.colour}40` : 'none',
          transition: 'all 0.3s ease', opacity: !selected || !bizName.trim() ? 0.6 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
        {starting
          ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Opening for business…</>
          : <>Open for Business <ChevronRight size={18} /></>
        }
      </button>
    </div>
  )
}

// ── Decision Panel ────────────────────────────────────────────────────────────
function DecisionPanel({ session, biz, onSubmit, loading }) {
  const cogs      = biz?.cogs_per_unit || 100
  const maxBuy    = Math.floor((session?.cash || 0) / cogs)
  const [stock,   setStock]   = useState(Math.min(5, maxBuy))
  const [price,   setPrice]   = useState(biz?.suggestedPrice || cogs * 1.5)
  const [mkt,     setMkt]     = useState(0)
  const [save,    setSave]    = useState(0)
  const [negOpen, setNegOpen] = useState(false)
  const [negMsg,  setNegMsg]  = useState('')
  const [negReply,setNegReply]= useState('')
  const [negLoading, setNegLoad] = useState(false)

  const margin      = price > 0 ? ((price - cogs) / price * 100) : 0
  const breakEven   = session?.fixed_cost_day ? Math.ceil((session.fixed_cost_day + session.employee_cost) / (price - cogs)) : 0
  const priceColour = price < cogs ? C.red : price < cogs * 1.2 ? C.orange : price < cogs * 1.8 ? C.green : C.gold

  const handleNegotiate = async () => {
    if (!negMsg.trim()) return
    setNegLoad(true)
    try {
      const { data } = await api.post('/bizsim/negotiate', { message: negMsg })
      setNegReply(data.reply)
    } catch { toast.error('Negotiation failed.') }
    finally { setNegLoad(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Phase badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ padding: '3px 12px', borderRadius: 20, background: `${C.blue}20`, border: `1px solid ${C.blue}40`, fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: C.blue }}>
          Phase {session?.phase} · Day {session?.day}
        </div>
        {session?.phase >= 2 && (
          <div style={{ fontSize: 11, color: C.muted }}>
            Fixed cost today: {fmt(biz?.fixed_cost_ph2 || 0)}
          </div>
        )}
      </div>

      {/* Stock slider */}
      <GlowCard colour={C.teal} style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontFamily: 'Syne', fontWeight: 700, color: C.muted }}>BUY STOCK</span>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, color: C.teal }}>
            {stock} units · {fmt(stock * cogs)}
          </span>
        </div>
        <input type="range" min={0} max={Math.min(30, maxBuy)} value={stock}
          onChange={e => setStock(+e.target.value)} style={{ width: '100%', accentColor: C.teal }} />
        <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>
          Cash: {fmt(session?.cash || 0)} · Max: {maxBuy} units
        </div>
      </GlowCard>

      {/* Price setter */}
      <GlowCard colour={priceColour} style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontFamily: 'Syne', fontWeight: 700, color: C.muted }}>SELLING PRICE</span>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: priceColour }}>
            {fmt(price)}
          </span>
        </div>
        <input type="range" min={Math.floor(cogs * 0.6)} max={Math.floor(cogs * 3)}
          step={Math.max(1, Math.floor(cogs * 0.05))}
          value={price} onChange={e => setPrice(+e.target.value)}
          style={{ width: '100%', accentColor: priceColour }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: priceColour, fontWeight: 600 }}>
            {price < cogs ? '⚠️ Below cost — instant loss on every unit!'
             : price < cogs * 1.15 ? '😐 Thin margin — busy but barely profitable'
             : price < cogs * 1.5 ? '✅ Healthy margin — good balance'
             : price < cogs * 2.2 ? '💰 Premium — fewer customers, bigger margin'
             : '🚫 Overpriced — customers will go to competitors'}
          </span>
          <span style={{ fontSize: 11, color: C.muted }}>
            Margin: <span style={{ color: priceColour, fontWeight: 700 }}>{pct(margin)}</span>
          </span>
        </div>
      </GlowCard>

      {/* Marketing */}
      <GlowCard colour={C.purple} style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontFamily: 'Syne', fontWeight: 700, color: C.muted, marginBottom: 10 }}>
          MARKETING SPEND
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { v: 0,   l: 'None',   sub: 'Word of mouth' },
            { v: 50,  l: 'K50',    sub: '+20% customers' },
            { v: 150, l: 'K150',   sub: '+40% customers' },
            { v: 300, l: 'K300',   sub: '+65% customers' },
          ].map(({ v, l, sub }) => (
            <button key={v} onClick={() => setMkt(v)} style={{
              flex: 1, padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
              background: mkt === v ? `${C.purple}25` : '#0F2040',
              border: `1px solid ${mkt === v ? C.purple : C.border}`,
              color: mkt === v ? C.purple : C.muted,
              fontFamily: 'Syne', fontWeight: mkt === v ? 700 : 400, fontSize: 12,
              transition: 'all 0.15s',
            }}>
              <div>{l}</div>
              <div style={{ fontSize: 9, marginTop: 2, opacity: 0.75 }}>{sub}</div>
            </button>
          ))}
        </div>
      </GlowCard>

      {/* Save */}
      <GlowCard colour={C.blue} style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontFamily: 'Syne', fontWeight: 700, color: C.muted }}>SAVE FROM REVENUE</span>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, color: C.blue }}>{fmt(save)}</span>
        </div>
        <input type="range" min={0} max={500} step={25} value={save}
          onChange={e => setSave(+e.target.value)} style={{ width: '100%', accentColor: C.blue }} />
        <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>
          Saving before spending is Pillar 1 of the FinScope financial health framework
        </div>
      </GlowCard>

      {/* Supplier negotiation */}
      <div>
        <button onClick={() => setNegOpen(o => !o)} style={{
          width: '100%', padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
          background: '#0F2040', border: `1px solid ${C.gold}30`,
          color: C.gold, fontFamily: 'Syne', fontWeight: 700, fontSize: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <MessageSquare size={14} /> Negotiate with supplier
        </button>
        {negOpen && (
          <div style={{ marginTop: 8, padding: '12px 14px', background: '#0F2040', borderRadius: 12, border: `1px solid ${C.gold}20` }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
              Standard price: {fmt(cogs)}/unit. Try to negotiate a better deal.
            </div>
            {negReply && (
              <div style={{ padding: '10px 12px', background: `${C.gold}10`, borderRadius: 9, border: `1px solid ${C.gold}25`, marginBottom: 8, fontSize: 12, color: C.white, lineHeight: 1.6 }}>
                <span style={{ color: C.gold, fontWeight: 700 }}>Supplier: </span>{negReply}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={negMsg} onChange={e => setNegMsg(e.target.value)}
                placeholder="I'll buy 20 units if you reduce to K90…"
                style={{ flex: 1, padding: '9px 12px', borderRadius: 9, background: C.card, border: `1px solid ${C.border}`, color: C.white, fontSize: 12, outline: 'none' }} />
              <button onClick={handleNegotiate} disabled={negLoading} style={{
                padding: '9px 14px', borderRadius: 9, cursor: 'pointer',
                background: C.gold, border: 'none', color: C.navy,
                fontFamily: 'Syne', fontWeight: 700, fontSize: 12,
              }}>
                {negLoading ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Run day button */}
      <button onClick={() => onSubmit({ stock_buy: stock, price, marketing: mkt, save_amount: save })}
        disabled={loading}
        style={{
          width: '100%', padding: '16px', borderRadius: 14, cursor: 'pointer',
          background: loading ? '#1E3A5F' : `linear-gradient(135deg, ${C.green}, ${C.teal})`,
          border: 'none', color: loading ? C.muted : C.navy,
          fontFamily: 'Syne', fontWeight: 800, fontSize: 16,
          boxShadow: loading ? 'none' : `0 8px 32px ${C.green}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          transition: 'all 0.2s ease',
        }}>
        {loading
          ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Running…</>
          : <>Open for Business — Day {session?.day} <ChevronRight size={18} /></>
        }
      </button>
    </div>
  )
}

// ── Day Result ────────────────────────────────────────────────────────────────
function DayResult({ result, session, onContinue }) {
  if (!result) return null
  const isProfit  = result.profit >= 0
  const accentCol = isProfit ? C.green : C.red
  const history   = session?.history || []

  const chartData = history.slice(-14).map(d => ({
    day: `D${d.day}`, revenue: d.revenue, profit: d.profit, cash: d.cash_after
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Result header */}
      <GlowCard colour={accentCol} style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: `${accentCol}20`, border: `2px solid ${accentCol}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>
            {isProfit ? '📈' : '📉'}
          </div>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: accentCol }}>
              Day {result.day} — {isProfit ? 'Profitable!' : 'Loss today'}
            </div>
            {result.event && (
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                {result.event.icon || '⚡'} {result.event.label} affected today
              </div>
            )}
          </div>
        </div>

        {/* Key numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { l: 'Revenue',  v: fmt(result.revenue),       c: C.green },
            { l: 'Expenses', v: fmt(result.total_expenses), c: C.red   },
            { l: 'Profit',   v: fmt(result.profit),         c: accentCol },
            { l: 'Customers',v: result.units_sold,           c: C.teal  },
            { l: 'Margin',   v: pct(result.gross_margin_pct),c: accentCol },
            { l: 'Saved',    v: fmt(result.saved),            c: C.blue  },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ background: '#0A1628', borderRadius: 10, padding: '9px 12px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: c }}>{v}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Warnings */}
        {result.profit < 0 && result.price < (result.cogs * 1.05) && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: `${C.red}15`, borderRadius: 9, border: `1px solid ${C.red}30`, fontSize: 12, color: C.red }}>
            ⚠️ Your price ({fmt(result.price)}) is below your cost ({fmt(result.cogs)}). You lose money on every unit sold.
          </div>
        )}
        {result.adjustments?.event && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: `${C.gold}10`, borderRadius: 9, border: `1px solid ${C.gold}25`, fontSize: 12, color: C.gold }}>
            {result.adjustments.event.icon} {result.adjustments.event.label}: {result.adjustments.event.impact}
          </div>
        )}
      </GlowCard>

      {/* Trend chart */}
      {chartData.length > 1 && (
        <GlowCard colour={C.blue} style={{ padding: '14px 16px' }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: C.muted, marginBottom: 10, letterSpacing: '0.08em' }}>
            14-DAY PERFORMANCE
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.green} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={C.green} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.blue} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: C.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: C.muted }} axisLine={false} tickLine={false} width={45} tickFormatter={v => `K${v}`} />
              <Tooltip
                contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: C.muted }}
              />
              <ReferenceLine y={0} stroke={C.border} strokeDasharray="3 3" />
              <Area type="monotone" dataKey="revenue" stroke={C.green} fill="url(#revGrad)" strokeWidth={2} dot={false} name="Revenue" />
              <Area type="monotone" dataKey="profit"  stroke={C.blue}  fill="url(#profGrad)" strokeWidth={2} dot={false} name="Profit" />
            </AreaChart>
          </ResponsiveContainer>
        </GlowCard>
      )}

      {/* Demand factors */}
      <GlowCard colour={C.purple} style={{ padding: '14px 16px' }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: C.muted, marginBottom: 10, letterSpacing: '0.08em' }}>
          WHY YOU GOT {result.units_sold} CUSTOMERS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { l: 'Price positioning',  v: result.demand_factors?.price_factor,       max: 2.0, col: C.teal   },
            { l: 'Marketing effect',   v: result.demand_factors?.marketing_factor,   max: 2.0, col: C.purple },
            { l: 'Market conditions',  v: result.demand_factors?.market_factor,      max: 2.0, col: C.blue   },
            { l: 'Competitor pressure',v: result.demand_factors?.competitor_factor,  max: 1.5, col: C.gold   },
          ].map(({ l, v, max, col }) => v !== undefined && (
            <div key={l}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 3 }}>
                <span>{l}</span>
                <span style={{ color: col, fontFamily: 'Syne', fontWeight: 700 }}>{v?.toFixed(2)}×</span>
              </div>
              <div style={{ height: 4, background: '#1E3A5F', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (v / max) * 100)}%`, background: col, borderRadius: 2, transition: 'width 0.6s', boxShadow: `0 0 6px ${col}60` }} />
              </div>
            </div>
          ))}
        </div>
      </GlowCard>

      <button onClick={onContinue} style={{
        width: '100%', padding: '14px', borderRadius: 14, cursor: 'pointer',
        background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`,
        border: 'none', color: '#fff',
        fontFamily: 'Syne', fontWeight: 800, fontSize: 15,
        boxShadow: `0 8px 32px ${C.blue}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        Continue <ChevronRight size={18} />
      </button>
    </div>
  )
}

// ── Coaching screen ───────────────────────────────────────────────────────────
function CoachingScreen({ coaching, weekNum, onContinue }) {
  return (
    <GlowCard colour={C.teal} style={{ padding: '24px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.blue}, ${C.teal})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: '#fff', flexShrink: 0,
        }}>K</div>
        <div>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: C.white }}>
            KIP Weekly Coaching
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>Week {weekNum} · AI-personalised review</div>
        </div>
      </div>
      <div style={{ padding: '14px 16px', background: '#0A1628', borderRadius: 12, marginBottom: 16 }}>
        {coaching
          ? <p style={{ fontSize: 14, color: C.white, lineHeight: 1.8, margin: 0 }}>{coaching}</p>
          : <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted, fontSize: 14 }}>
              <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite', color: C.teal }} />
              KIP is reviewing your week…
            </div>
        }
      </div>
      {coaching && (
        <button onClick={onContinue} style={{
          width: '100%', padding: '13px', borderRadius: 12, cursor: 'pointer',
          background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`,
          border: 'none', color: '#fff', fontFamily: 'Syne', fontWeight: 800, fontSize: 15,
        }}>
          Start Week {weekNum + 1} →
        </button>
      )}
    </GlowCard>
  )
}

// ── Phase unlock ──────────────────────────────────────────────────────────────
function PhaseUnlockScreen({ phase, onContinue }) {
  const phases = {
    2: { title: 'Phase 2 Unlocked!', sub: 'Welcome to the Retail Store', desc: 'Fixed costs now apply every day — rent, wages. You must calculate your break-even point. How many units do you need to sell just to keep the lights on?', colour: C.blue, emoji: '🏪' },
    3: { title: 'Phase 3 Unlocked!', sub: 'The Enterprise Phase', desc: 'You can now take loans and expand. But debt costs money. Learn about interest rates, return on investment, and the true cost of capital.', colour: C.gold, emoji: '🏢' },
  }
  const p = phases[phase] || phases[2]
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>{p.emoji}</div>
      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 26, color: p.colour, marginBottom: 6 }}>{p.title}</div>
      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: C.white, marginBottom: 14 }}>{p.sub}</div>
      <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, maxWidth: 420, margin: '0 auto 24px' }}>{p.desc}</div>
      <button onClick={onContinue} style={{
        padding: '14px 32px', borderRadius: 14, cursor: 'pointer',
        background: `linear-gradient(135deg, ${p.colour}, ${p.colour}cc)`,
        border: 'none', color: '#fff', fontFamily: 'Syne', fontWeight: 800, fontSize: 15,
        boxShadow: `0 8px 32px ${p.colour}40`,
      }}>
        Let's go! →
      </button>
    </div>
  )
}

// ── Failure screen ────────────────────────────────────────────────────────────
function FailureScreen({ session, onRestart }) {
  const days = (session?.day || 1) - 1
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
      <div style={{ fontSize: 56, marginBottom: 14 }}>💸</div>
      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, color: C.red, marginBottom: 8 }}>Business Failed</div>
      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: C.white, marginBottom: 12 }}>
        {session?.biz_name} ran out of cash on Day {days}
      </div>
      <div style={{ padding: '14px 20px', background: `${C.red}10`, border: `1px solid ${C.red}25`, borderRadius: 14, marginBottom: 20, maxWidth: 420, margin: '0 auto 20px' }}>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, margin: 0 }}>
          This is the most important lesson in business: <strong style={{ color: C.white }}>cash flow kills profitable businesses</strong>. Your assets may have had value, but when cash = K0, operations stop. Real Zambian businesses fail this way every day.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 360, margin: '0 auto 20px' }}>
        <StatTile label="Days survived" value={days}             colour={C.red}  />
        <StatTile label="Peak cash"     value={fmt(session?.total_revenue || 0)} colour={C.gold} />
      </div>
      <button onClick={onRestart} style={{
        padding: '14px 32px', borderRadius: 14, cursor: 'pointer',
        background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`,
        border: 'none', color: '#fff', fontFamily: 'Syne', fontWeight: 800, fontSize: 15,
        boxShadow: `0 8px 32px ${C.blue}30`,
      }}>
        Try Again — You'll Know Better Now
      </button>
    </div>
  )
}

// ── Main BizSimPage ───────────────────────────────────────────────────────────
export default function BizSimPage() {
  const [screen,      setScreen]      = useState('loading') // loading|setup|game|result|coaching|phase_unlock|failure|final
  const [session,     setSession]     = useState(null)
  const [bizMeta,     setBizMeta]     = useState(null)
  const [dayResult,   setDayResult]   = useState(null)
  const [coaching,    setCoaching]    = useState(null)
  const [weekNum,     setWeekNum]     = useState(null)
  const [unlockPhase, setUnlockPhase] = useState(null)
  const [running,     setRunning]     = useState(false)
  const [statements,  setStatements]  = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [missions,    setMissions]    = useState([])
  const [tab,         setTab]         = useState('game')  // game|stats|leaderboard

  const loadSession = useCallback(async () => {
    try {
      const { data } = await api.get('/bizsim/session')
      setSession(data.session)
      if (data.session) {
        const bt = data.session.biz_type
        const bizTypes = (await api.get('/bizsim/business-types')).data.businesses
        setBizMeta(bizTypes.find(b => b.id === bt))
        if (data.session.status === 'failed') {
          setScreen('failure')
        } else {
          setScreen('game')
          loadExtras()
        }
      } else {
        setScreen('setup')
      }
    } catch { setScreen('setup') }
  }, [])

  const loadExtras = async () => {
    try {
      const [stmt, lb, mis] = await Promise.all([
        api.get('/bizsim/statements'),
        api.get('/bizsim/leaderboard'),
        api.get('/bizsim/missions'),
      ])
      setStatements(stmt.data)
      setLeaderboard(lb.data.leaderboard || [])
      setMissions(mis.data.missions || [])
    } catch {}
  }

  useEffect(() => { loadSession() }, [])

  const handleStart = async (bizType, bizName) => {
    const { data } = await api.post('/bizsim/start', { biz_type: bizType, biz_name: bizName })
    setSession(data.session)
    const bizTypes = (await api.get('/bizsim/business-types')).data.businesses
    setBizMeta(bizTypes.find(b => b.id === bizType))
    toast.success(`${bizName} is open for business!`)
    setScreen('game')
    loadExtras()
  }

  const handleRunDay = async (decision) => {
    setRunning(true)
    try {
      const { data } = await api.post('/bizsim/day/run', decision)
      setDayResult(data.day_result)

      // Refresh session
      const { data: sd } = await api.get('/bizsim/session')
      setSession(sd.session)

      if (data.bankrupt) {
        setScreen('failure')
        return
      }

      if (data.newly_completed_missions?.length) {
        data.newly_completed_missions.forEach(mid => {
          const m = missions.find(m => m.id === mid)
          if (m) toast.success(`🏅 Mission complete: ${m.name}! +K${m.reward}`)
        })
      }

      if (data.coaching) {
        setCoaching(data.coaching)
        setWeekNum(Math.floor((sd.session?.day - 1) / 7))
        setScreen('coaching')
        return
      }

      if (data.phase_unlocked) {
        setUnlockPhase(data.phase_unlocked)
        setScreen('phase_unlock')
        return
      }

      setScreen('result')
      loadExtras()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Day simulation failed.')
    } finally {
      setRunning(false)
    }
  }

  const handleRestart = async () => {
    await api.post('/bizsim/restart')
    setSession(null)
    setDayResult(null)
    setCoaching(null)
    setScreen('setup')
  }

  const accentCol  = bizMeta ? BIZ_COLOURS[bizMeta.id] || C.blue : C.blue
  const history    = session?.history || []
  const chartData  = history.slice(-20).map(d => ({
    day: `D${d.day}`, revenue: d.revenue, profit: d.profit, cash: d.cash_after,
  }))

  return (
    <div style={{
      minHeight: '100vh', background: C.navy, color: C.white,
      fontFamily: 'Plus Jakarta Sans, sans-serif',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:0.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.08); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        input[type=range] { -webkit-appearance: none; height: 6px; background: #1E3A5F; border-radius: 3px; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; cursor: pointer; border: 2px solid #0A1628; }
      `}</style>

      {screen === 'loading' && (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={32} style={{ animation: 'spin 0.8s linear infinite', color: C.teal }} />
        </div>
      )}

      {screen === 'setup' && <SetupScreen onStart={handleStart} />}

      {['game','result','coaching','phase_unlock'].includes(screen) && session && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 12px' }}>

          {/* Top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 0', borderBottom: `1px solid ${C.border}`, marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 24 }}>{bizMeta?.emoji}</div>
              <div>
                <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: C.white }}>
                  {session.biz_name}
                </div>
                <div style={{ fontSize: 11, color: accentCol, fontFamily: 'Syne', fontWeight: 600 }}>
                  {bizMeta?.location} · Phase {session.phase}
                </div>
              </div>
            </div>

            {/* Health pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { l: 'Cash',    v: fmt(session.cash),         c: session.cash < 500 ? C.red : C.green  },
                { l: 'Profit',  v: fmt(session.total_profit), c: session.total_profit >= 0 ? C.green : C.red },
                { l: 'Day',     v: session.day,                c: C.blue  },
              ].map(({ l, v, c }) => (
                <div key={l} style={{
                  padding: '5px 12px', borderRadius: 20, background: `${c}15`,
                  border: `1px solid ${c}30`, fontSize: 12,
                }}>
                  <span style={{ color: C.muted }}>{l}: </span>
                  <span style={{ fontFamily: 'Syne', fontWeight: 800, color: c }}>{v}</span>
                </div>
              ))}
            </div>

            <button onClick={handleRestart} style={{
              padding: '6px 12px', borderRadius: 9, cursor: 'pointer',
              background: 'transparent', border: `1px solid ${C.border}`,
              color: C.muted, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <RefreshCw size={12} /> Restart
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: C.card, borderRadius: 12, padding: 4 }}>
            {[
              { k: 'game',        l: 'Play',        icon: Zap       },
              { k: 'stats',       l: 'Statements',  icon: BarChart2 },
              { k: 'leaderboard', l: 'Leaderboard', icon: Trophy    },
              { k: 'missions',    l: 'Missions',    icon: Target    },
            ].map(({ k, l, icon: Icon }) => (
              <button key={k} onClick={() => setTab(k)} style={{
                flex: 1, padding: '9px 8px', borderRadius: 9, cursor: 'pointer',
                background: tab === k ? accentCol : 'transparent',
                border: 'none', color: tab === k ? '#fff' : C.muted,
                fontFamily: 'Syne', fontWeight: 700, fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.15s',
              }}>
                <Icon size={13} />{l}
              </button>
            ))}
          </div>

          {/* ── PLAY TAB ── */}
          {tab === 'game' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,0.9fr)', gap: 16, alignItems: 'start' }}>

              {/* Left: decisions or results */}
              <div style={{ animation: 'slideUp 0.3s ease' }}>
                {screen === 'game' && (
                  <DecisionPanel session={session} biz={bizMeta} onSubmit={handleRunDay} loading={running} />
                )}
                {screen === 'result' && (
                  <DayResult result={dayResult} session={session} onContinue={() => setScreen('game')} />
                )}
                {screen === 'coaching' && (
                  <CoachingScreen coaching={coaching} weekNum={weekNum} onContinue={() => { setScreen('game'); loadExtras() }} />
                )}
                {screen === 'phase_unlock' && (
                  <PhaseUnlockScreen phase={unlockPhase} onContinue={() => setScreen('game')} />
                )}
              </div>

              {/* Right: live metrics + chart */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <StatTile label="Total Revenue"  value={fmt(session.total_revenue)} colour={C.green} icon={TrendingUp} />
                  <StatTile label="Net Profit"     value={fmt(session.total_profit)}  colour={session.total_profit >= 0 ? C.gold : C.red} icon={DollarSign} />
                  <StatTile label="Cash on Hand"   value={fmt(session.cash)}          colour={session.cash < 500 ? C.red : C.teal} icon={ShoppingCart} />
                  <StatTile label="Customers"      value={session.total_customers}    colour={C.purple} icon={Users} />
                </div>

                {/* Cash flow chart */}
                {chartData.length > 2 && (
                  <GlowCard colour={accentCol} style={{ padding: '14px 14px' }}>
                    <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: C.muted, marginBottom: 10, letterSpacing: '0.08em' }}>
                      CASH TREND
                    </div>
                    <ResponsiveContainer width="100%" height={90}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={accentCol} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={accentCol} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" tick={{ fontSize: 8, fill: C.muted }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 8, fill: C.muted }} axisLine={false} tickLine={false} width={40} tickFormatter={v => `K${v}`} />
                        <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 10 }} />
                        <ReferenceLine y={0} stroke={C.red} strokeDasharray="3 3" />
                        <Area type="monotone" dataKey="cash" stroke={accentCol} fill="url(#cashGrad)" strokeWidth={2} dot={false} name="Cash" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </GlowCard>
                )}

                {/* Competitors */}
                {session.competitors?.length > 0 && (
                  <GlowCard colour={C.orange} style={{ padding: '12px 14px' }}>
                    <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: C.muted, marginBottom: 8, letterSpacing: '0.08em' }}>
                      COMPETITORS
                    </div>
                    {session.competitors.map(c => (
                      <div key={c.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '7px 0', borderBottom: `1px solid ${C.border}`,
                        fontSize: 12,
                      }}>
                        <div>
                          <div style={{ color: C.white, fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>{c.personality} strategy</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: C.orange, fontFamily: 'Syne', fontWeight: 700 }}>{fmt(c.price)}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>{c.customers || 0} customers</div>
                        </div>
                      </div>
                    ))}
                  </GlowCard>
                )}
              </div>
            </div>
          )}

          {/* ── STATEMENTS TAB ── */}
          {tab === 'stats' && statements && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>

              {/* P&L */}
              <GlowCard colour={C.green} style={{ padding: '18px 20px' }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, color: C.green, marginBottom: 14 }}>
                  Profit & Loss
                </div>
                {[
                  { l: 'Revenue',      v: statements.profit_loss?.revenue,      c: C.green, bold: false },
                  { l: 'Cost of Sales',v: -statements.profit_loss?.cogs,        c: C.red,   bold: false },
                  { l: 'Gross Profit', v: statements.profit_loss?.gross_profit, c: C.teal,  bold: true  },
                  { l: `Margin`,       v: null, sub: pct(statements.profit_loss?.gross_margin) },
                  { l: 'Marketing',    v: -statements.profit_loss?.marketing,   c: C.muted, bold: false },
                  { l: 'Fixed Costs',  v: -statements.profit_loss?.fixed_costs, c: C.muted, bold: false },
                  { l: 'Interest',     v: -statements.profit_loss?.interest,    c: C.red,   bold: false },
                  { l: 'NET PROFIT',   v: statements.profit_loss?.net_profit,   c: statements.profit_loss?.net_profit >= 0 ? C.gold : C.red, bold: true },
                ].map(({ l, v, c, bold, sub }) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}15`, fontSize: bold ? 13 : 12 }}>
                    <span style={{ color: bold ? C.white : C.muted, fontWeight: bold ? 700 : 400 }}>{l}</span>
                    <span style={{ color: c, fontFamily: bold ? 'Syne' : 'inherit', fontWeight: bold ? 800 : 600 }}>
                      {sub || (v !== undefined ? fmt(v || 0) : '—')}
                    </span>
                  </div>
                ))}
              </GlowCard>

              {/* Balance sheet */}
              <GlowCard colour={C.blue} style={{ padding: '18px 20px' }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, color: C.blue, marginBottom: 14 }}>
                  Balance Sheet
                </div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: C.muted, marginBottom: 8, letterSpacing: '0.06em' }}>ASSETS</div>
                {[
                  { l: 'Cash',        v: statements.balance_sheet?.balances?.cash        || 0, c: C.green },
                  { l: 'Inventory',   v: statements.balance_sheet?.balances?.inventory   || 0, c: C.teal  },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: `1px solid ${C.border}15` }}>
                    <span style={{ color: C.muted }}>{l}</span>
                    <span style={{ color: c, fontFamily: 'Syne', fontWeight: 600 }}>{fmt(v)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 5px', fontSize: 13, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ color: C.white, fontWeight: 700 }}>Total Assets</span>
                  <span style={{ color: C.blue, fontFamily: 'Syne', fontWeight: 800 }}>{fmt(statements.balance_sheet?.total_assets)}</span>
                </div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: C.muted, margin: '10px 0 8px', letterSpacing: '0.06em' }}>LIABILITIES + EQUITY</div>
                {[
                  { l: 'Loans',   v: statements.balance_sheet?.balances?.loan_payable || 0, c: C.red    },
                  { l: 'Equity',  v: statements.balance_sheet?.total_equity           || 0, c: C.purple },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: `1px solid ${C.border}15` }}>
                    <span style={{ color: C.muted }}>{l}</span>
                    <span style={{ color: c, fontFamily: 'Syne', fontWeight: 600 }}>{fmt(v)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 9, background: statements.balance_sheet?.balanced ? `${C.green}15` : `${C.red}15`, border: `1px solid ${statements.balance_sheet?.balanced ? C.green : C.red}30`, fontSize: 11, color: statements.balance_sheet?.balanced ? C.green : C.red, fontFamily: 'Syne', fontWeight: 700 }}>
                  {statements.balance_sheet?.balanced ? '✓ Balance sheet balances' : '⚠️ Imbalance detected'}
                </div>
              </GlowCard>

              {/* Cash flow chart */}
              {statements.cash_flow_chart?.length > 2 && (
                <GlowCard colour={C.teal} style={{ padding: '18px 20px', gridColumn: '1 / -1' }}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, color: C.teal, marginBottom: 14 }}>
                    Cash Flow Over Time
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={statements.cash_flow_chart}>
                      <XAxis dataKey="day" tick={{ fontSize: 9, fill: C.muted }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: C.muted }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `K${v}`} />
                      <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }} />
                      <ReferenceLine y={0} stroke={C.border} />
                      <Bar dataKey="profit" fill={C.blue} radius={[3,3,0,0]} name="Daily Profit" />
                    </BarChart>
                  </ResponsiveContainer>
                </GlowCard>
              )}
            </div>
          )}

          {/* ── LEADERBOARD TAB ── */}
          {tab === 'leaderboard' && (
            <GlowCard colour={C.gold} style={{ padding: '20px' }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: C.gold, marginBottom: 16 }}>
                🏆 Live Leaderboard
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {leaderboard.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: C.muted, fontSize: 14 }}>
                    No players yet — you could be #1.
                  </div>
                )}
                {leaderboard.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 12,
                    background: i < 3 ? `${[C.gold, '#C0C0C0', '#CD7F32'][i]}10` : C.card,
                    border: `1px solid ${i < 3 ? [C.gold, '#C0C0C0', '#CD7F32'][i] : C.border}30`,
                  }}>
                    <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: i < 3 ? [C.gold, '#C0C0C0', '#CD7F32'][i] : C.muted, width: 28, flexShrink: 0 }}>
                      {i < 3 ? ['🥇','🥈','🥉'][i] : `#${p.rank}`}
                    </div>
                    <div style={{ fontSize: 18 }}>{p.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: C.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.business}
                      </div>
                      <div style={{ fontSize: 10, color: C.muted }}>{p.owner} · Day {p.day} · Phase {p.phase}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: p.net_profit >= 0 ? C.green : C.red }}>
                        {fmt(p.net_profit)}
                      </div>
                      <div style={{ fontSize: 10, color: C.muted }}>net profit</div>
                    </div>
                  </div>
                ))}
              </div>
            </GlowCard>
          )}

          {/* ── MISSIONS TAB ── */}
          {tab === 'missions' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
              {missions.map(m => (
                <GlowCard key={m.id} colour={m.completed ? C.green : m.colour} style={{ padding: '16px 18px', opacity: m.completed ? 1 : 0.85 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 26 }}>{m.completed ? '✅' : m.icon}</div>
                    <div>
                      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: C.white }}>{m.name}</div>
                      <div style={{ fontSize: 10, color: m.colour, fontFamily: 'Syne', fontWeight: 600 }}>Reward: +{fmt(m.reward)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{m.desc}</div>
                  {m.completed && (
                    <div style={{ marginTop: 8, fontSize: 11, color: C.green, fontFamily: 'Syne', fontWeight: 700 }}>
                      ✓ Complete — reward claimed!
                    </div>
                  )}
                </GlowCard>
              ))}
            </div>
          )}
        </div>
      )}

      {screen === 'failure' && session && (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px' }}>
          <FailureScreen session={session} onRestart={handleRestart} />
        </div>
      )}
    </div>
  )
}
