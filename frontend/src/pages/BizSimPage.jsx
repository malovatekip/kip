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
import { C, BIZ_COLOURS } from '../components/bizsim/theme'
import StorySetup from '../components/bizsim/StorySetup'
import EventCard from '../components/bizsim/EventCard'
import DayCanvas from '../components/bizsim/DayCanvas'
import GameAudio from '../components/bizsim/GameAudio'
import { useT } from '../context/TranslationContext'

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

// ── Decision Panel ────────────────────────────────────────────────────────────
function DecisionPanel({ session, biz, onSubmit, loading }) {
  const { t } = useT()
  const cogs      = biz?.cogs_per_unit || 100
  const maxBuy    = Math.floor((session?.cash || 0) / cogs)
  const [stock,       setStock]       = useState(Math.min(5, maxBuy))
  const [price,       setPrice]       = useState(biz?.suggestedPrice || cogs * 1.5)
  const [mkt,         setMkt]         = useState(0)
  const [save,        setSave]        = useState(0)
  const [negOpen,     setNegOpen]     = useState(false)
  const [negHistory,  setNegHistory]  = useState([])  // {sender, text}[]
  const [negMsg,      setNegMsg]      = useState('')
  const [negLoading,  setNegLoad]     = useState(false)
  const [dealLocked,  setDealLocked]  = useState(null)  // negotiated price or null
  const [custOpen,    setCustOpen]    = useState(false)
  const [custType,    setCustType]    = useState('regular')
  const [custHistory, setCustHistory] = useState([])
  const [custMsg,     setCustMsg]     = useState('')
  const [custLoading, setCustLoad]    = useState(false)
  const [custOutcome, setCustOutcome] = useState(null)

  const margin      = price > 0 ? ((price - (dealLocked || cogs)) / price * 100) : 0
  const priceColour = price < (dealLocked || cogs) ? C.red : price < (dealLocked || cogs) * 1.2 ? C.orange : price < (dealLocked || cogs) * 1.8 ? C.green : C.gold
  const effectiveCogs = dealLocked || cogs

  const handleNegotiate = async () => {
    if (!negMsg.trim()) return
    const myMsg = negMsg.trim()
    setNegMsg('')
    setNegHistory(h => [...h, { sender: 'player', text: myMsg }])
    setNegLoad(true)
    try {
      const { data } = await api.post('/bizsim/negotiate', { message: myMsg })
      setNegHistory(h => [...h, { sender: 'supplier', text: data.reply }])
      if (data.deal_confirmed && data.negotiated_cogs) {
        setDealLocked(data.negotiated_cogs)
        toast.success(t('bizsim.deal_locked_toast', { price: data.negotiated_cogs, savings: data.savings_per_unit }))
      }
    } catch { toast.error(t('bizsim.negotiation_failed')) }
    finally { setNegLoad(false) }
  }

  const handleCustomerChat = async () => {
    if (!custMsg.trim()) return
    const myMsg = custMsg.trim()
    setCustMsg('')
    setCustHistory(h => [...h, { sender: 'player', text: myMsg }])
    setCustLoad(true)
    try {
      const { data } = await api.post('/bizsim/customer-chat', { message: myMsg, customer_type: custType })
      setCustHistory(h => [...h, { sender: 'customer', text: data.reply, name: data.customer_name }])
      if (data.outcome === 'sale') {
        setCustOutcome({ type: 'sale', price: data.agreed_price, name: data.customer_name })
        toast.success(t('bizsim.customer_agreed_toast', { name: data.customer_name, price: data.agreed_price }))
      } else if (data.outcome === 'walked') {
        setCustOutcome({ type: 'walked', reason: data.walked_reason, name: data.customer_name })
      }
    } catch { toast.error(t('bizsim.customer_chat_failed')) }
    finally { setCustLoad(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Phase badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ padding: '3px 12px', borderRadius: 20, background: `${C.blue}20`, border: `1px solid ${C.blue}40`, fontSize: 11, fontFamily: 'Syne', fontWeight: 700, color: C.blue }}>
          {t('bizsim.phase')} {session?.phase} · {t('bizsim.day_of')} {session?.day}
        </div>
        {session?.phase >= 2 && (
          <div style={{ fontSize: 11, color: C.muted }}>
            {t('bizsim.fixed_cost_today')}: {fmt(biz?.fixed_cost_ph2 || 0)}
          </div>
        )}
      </div>

      {/* Stock slider */}
      <GlowCard colour={C.teal} style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontFamily: 'Syne', fontWeight: 700, color: C.muted }}>{t('bizsim.buy_stock').toUpperCase()}</span>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, color: C.teal }}>
            {stock} {t('bizsim.units_suffix')} · {fmt(stock * effectiveCogs)}
            {dealLocked && <span style={{ color: C.green, fontSize: 11, marginLeft: 6 }}>({t('bizsim.deal_price_suffix')})</span>}
          </span>
        </div>
        <input type="range" min={0} max={Math.min(30, maxBuy)} value={stock}
          onChange={e => setStock(+e.target.value)} style={{ width: '100%', accentColor: C.teal }} />
        <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>
          {t('bizsim.cash_label')}: {fmt(session?.cash || 0)} · {t('bizsim.max_label')}: {maxBuy} {t('bizsim.units_suffix')}
          {dealLocked && <span style={{ color: C.green }}> · {t('bizsim.negotiated_was', { negotiated: fmt(dealLocked), original: fmt(cogs) })}</span>}
        </div>
      </GlowCard>

      {/* Price setter */}
      <GlowCard colour={priceColour} style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontFamily: 'Syne', fontWeight: 700, color: C.muted }}>{t('bizsim.selling_price').toUpperCase()}</span>
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
            {price < effectiveCogs ? t('bizsim.price_below_cost')
             : price < effectiveCogs * 1.15 ? t('bizsim.price_thin_margin')
             : price < effectiveCogs * 1.5 ? t('bizsim.price_healthy_margin')
             : price < effectiveCogs * 2.2 ? t('bizsim.price_premium_margin')
             : t('bizsim.price_overpriced')}
          </span>
          <span style={{ fontSize: 11, color: C.muted }}>
            {t('bizsim.margin_label')}: <span style={{ color: priceColour, fontWeight: 700 }}>{pct(margin)}</span>
          </span>
        </div>
      </GlowCard>

      {/* Marketing */}
      <GlowCard colour={C.purple} style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontFamily: 'Syne', fontWeight: 700, color: C.muted, marginBottom: 10 }}>
          {t('bizsim.marketing').toUpperCase()}
        </div>
        <div className="bizsim-mkt-buttons">
          {[
            { v: 0,   l: t('bizsim.marketing_none'), sub: t('bizsim.marketing_word_of_mouth') },
            { v: 50,  l: 'K50',    sub: t('bizsim.marketing_customers_pct', { pct: 20 }) },
            { v: 150, l: 'K150',   sub: t('bizsim.marketing_customers_pct', { pct: 40 }) },
            { v: 300, l: 'K300',   sub: t('bizsim.marketing_customers_pct', { pct: 65 }) },
          ].map(({ v, l, sub }) => (
            <button key={v} onClick={() => setMkt(v)} style={{
              padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
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
          <span style={{ fontSize: 12, fontFamily: 'Syne', fontWeight: 700, color: C.muted }}>{t('bizsim.save_from_revenue').toUpperCase()}</span>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, color: C.blue }}>{fmt(save)}</span>
        </div>
        <input type="range" min={0} max={500} step={25} value={save}
          onChange={e => setSave(+e.target.value)} style={{ width: '100%', accentColor: C.blue }} />
        <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>
          {t('bizsim.save_tip')}
        </div>
      </GlowCard>

      {/* Supplier negotiation */}
      <div>
        <button onClick={() => { setNegOpen(o => !o); setCustOpen(false) }} style={{
          width: '100%', padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
          background: dealLocked ? `${C.green}15` : '#0F2040',
          border: `1px solid ${dealLocked ? C.green : C.gold}40`,
          color: dealLocked ? C.green : C.gold,
          fontFamily: 'Syne', fontWeight: 700, fontSize: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <MessageSquare size={14} />
          {dealLocked ? t('bizsim.deal_locked_unit', { price: dealLocked }) : t('bizsim.negotiate_supplier')}
        </button>
        {negOpen && (
          <div style={{ marginTop: 8, padding: '12px 14px', background: '#0F2040', borderRadius: 12, border: `1px solid ${C.gold}20` }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
              {t('bizsim.standard_price')}: {fmt(cogs)}/unit · {t('bizsim.negotiate_hint')}
            </div>
            {/* Conversation history */}
            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {negHistory.map((m, i) => (
                <div key={i} style={{
                  padding: '8px 10px', borderRadius: 9, fontSize: 12, lineHeight: 1.55,
                  background: m.sender === 'player' ? `${C.blue}18` : `${C.gold}12`,
                  border: `1px solid ${m.sender === 'player' ? C.blue : C.gold}25`,
                  alignSelf: m.sender === 'player' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}>
                  <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 10, color: m.sender === 'player' ? C.blue : C.gold, marginRight: 6 }}>
                    {m.sender === 'player' ? t('chat.you') : t('bizsim.supplier_label')}
                  </span>
                  <span style={{ color: C.white }}>{m.text}</span>
                </div>
              ))}
              {negLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.muted }}>
                  <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> {t('bizsim.supplier_thinking')}
                </div>
              )}
            </div>
            {dealLocked ? (
              <div style={{ padding: '8px 12px', background: `${C.green}15`, borderRadius: 9, border: `1px solid ${C.green}30`, fontSize: 12, color: C.green, fontFamily: 'Syne', fontWeight: 700 }}>
                {t('bizsim.deal_agreed', { price: dealLocked })}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={negMsg} onChange={e => setNegMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNegotiate()}
                  placeholder={t('bizsim.negotiate_placeholder')}
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 9, background: C.card, border: `1px solid ${C.border}`, color: C.white, fontSize: 12, outline: 'none' }} />
                <button onClick={handleNegotiate} disabled={negLoading} style={{
                  padding: '9px 14px', borderRadius: 9, cursor: 'pointer',
                  background: C.gold, border: 'none', color: C.navy,
                  fontFamily: 'Syne', fontWeight: 700, fontSize: 12,
                }}>
                  {negLoading ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : t('chat.send')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Customer conversations */}
      <div>
        <button onClick={() => { setCustOpen(o => !o); setNegOpen(false) }} style={{
          width: '100%', padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
          background: '#0F2040', border: `1px solid ${C.teal}30`,
          color: C.teal, fontFamily: 'Syne', fontWeight: 700, fontSize: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Users size={14} /> {t('bizsim.talk_customer')}
        </button>
        {custOpen && (
          <div style={{ marginTop: 8, padding: '12px 14px', background: '#0A1E2E', borderRadius: 12, border: `1px solid ${C.teal}20` }}>
            {/* Customer type selector */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {[
                { v: 'regular',     l: t('bizsim.customer_regular'),     c: C.teal   },
                { v: 'market_mama', l: t('bizsim.customer_market_mama'), c: C.orange },
                { v: 'student',     l: t('bizsim.customer_student'),     c: C.purple },
                { v: 'salaried',    l: t('bizsim.customer_worker'),      c: C.blue   },
              ].map(({ v, l, c }) => (
                <button key={v} onClick={() => { setCustType(v); setCustHistory([]); setCustOutcome(null) }} style={{
                  padding: '5px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 11,
                  background: custType === v ? `${c}20` : 'transparent',
                  border: `1px solid ${custType === v ? c : C.border}`,
                  color: custType === v ? c : C.muted,
                  fontFamily: 'Syne', fontWeight: custType === v ? 700 : 400,
                }}>{l}</button>
              ))}
            </div>
            {/* Conversation */}
            <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {custHistory.length === 0 && (
                <div style={{ fontSize: 11, color: C.muted, fontStyle: 'italic' }}>
                  {t('bizsim.customer_walk_in_hint')}
                </div>
              )}
              {custHistory.map((m, i) => (
                <div key={i} style={{
                  padding: '8px 10px', borderRadius: 9, fontSize: 12, lineHeight: 1.55,
                  background: m.sender === 'player' ? `${C.blue}18` : `${C.teal}12`,
                  border: `1px solid ${m.sender === 'player' ? C.blue : C.teal}25`,
                  alignSelf: m.sender === 'player' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}>
                  <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 10, color: m.sender === 'player' ? C.blue : C.teal, marginRight: 6 }}>
                    {m.sender === 'player' ? t('chat.you') : m.name || t('bizsim.customer_label')}
                  </span>
                  <span style={{ color: C.white }}>{m.text}</span>
                </div>
              ))}
              {custLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.muted }}>
                  <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> {t('bizsim.customer_responding')}
                </div>
              )}
            </div>
            {/* Outcome badge */}
            {custOutcome && (
              <div style={{
                padding: '8px 12px', borderRadius: 9, marginBottom: 8, fontSize: 12,
                background: custOutcome.type === 'sale' ? `${C.green}15` : `${C.red}12`,
                border: `1px solid ${custOutcome.type === 'sale' ? C.green : C.red}30`,
                color: custOutcome.type === 'sale' ? C.green : C.red,
                fontFamily: 'Syne', fontWeight: 700,
              }}>
                {custOutcome.type === 'sale'
                  ? t('bizsim.customer_bought', { name: custOutcome.name, price: custOutcome.price })
                  : t('bizsim.customer_walked_away', { name: custOutcome.name, reason: custOutcome.reason })
                }
              </div>
            )}
            {!custOutcome && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={custMsg} onChange={e => setCustMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCustomerChat()}
                  placeholder={t('bizsim.customer_placeholder')}
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 9, background: C.card, border: `1px solid ${C.border}`, color: C.white, fontSize: 12, outline: 'none' }} />
                <button onClick={handleCustomerChat} disabled={custLoading} style={{
                  padding: '9px 14px', borderRadius: 9, cursor: 'pointer',
                  background: C.teal, border: 'none', color: C.navy,
                  fontFamily: 'Syne', fontWeight: 700, fontSize: 12,
                }}>
                  {custLoading ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : t('chat.send')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Run day button */}
      <button onClick={() => { GameAudio.init(); onSubmit({ stock_buy: stock, price, marketing: mkt, save_amount: save, negotiated_cogs: dealLocked || undefined }) }}
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
          ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> {t('bizsim.running')}</>
          : <>{t('bizsim.open_business')} — {t('bizsim.day_of')} {session?.day} <ChevronRight size={18} /></>
        }
      </button>
    </div>
  )
}

// ── Day Result ────────────────────────────────────────────────────────────────
function DayResult({ result, session, onContinue }) {
  const { t } = useT()
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
              {t('bizsim.day_of')} {result.day} — {isProfit ? t('bizsim.profitable') : t('bizsim.loss_day')}
            </div>
            {result.event && (
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                {result.event.icon || '⚡'} {t('bizsim.event_affected_today', { label: result.event.label })}
              </div>
            )}
          </div>
        </div>

        {/* Key numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { l: t('bizsim.revenue'),  v: fmt(result.revenue),       c: C.green },
            { l: t('bizsim.expenses'), v: fmt(result.total_expenses), c: C.red   },
            { l: t('bizsim.profit'),   v: fmt(result.profit),         c: accentCol },
            { l: t('bizsim.customers_short'),v: result.units_sold,           c: C.teal  },
            { l: t('bizsim.margin_label'),   v: pct(result.gross_margin_pct),c: accentCol },
            { l: t('bizsim.saved'),    v: fmt(result.saved),            c: C.blue  },
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
            {t('bizsim.price_below_cost_warning', { price: fmt(result.price), cost: fmt(result.cogs) })}
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
            {t('bizsim.performance_14day')}
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
          {t('bizsim.why_customers', { units: result.units_sold })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { l: t('bizsim.factor_price'),       v: result.demand_factors?.price_factor,       max: 2.0, col: C.teal   },
            { l: t('bizsim.factor_marketing'),    v: result.demand_factors?.marketing_factor,   max: 2.0, col: C.purple },
            { l: t('bizsim.factor_market'),      v: result.demand_factors?.market_factor,      max: 2.0, col: C.blue   },
            { l: t('bizsim.factor_competitor'),v: result.demand_factors?.competitor_factor,  max: 1.5, col: C.gold   },
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
        {t('common.continue')} <ChevronRight size={18} />
      </button>
    </div>
  )
}

// ── Coaching screen ───────────────────────────────────────────────────────────
function CoachingScreen({ coaching, weekNum, onContinue }) {
  const { t } = useT()
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
            {t('bizsim.weekly_coaching')}
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>{t('bizsim.week')} {weekNum} · {t('bizsim.ai_personalised_review')}</div>
        </div>
      </div>
      <div style={{ padding: '14px 16px', background: '#0A1628', borderRadius: 12, marginBottom: 16 }}>
        {coaching
          ? <p style={{ fontSize: 14, color: C.white, lineHeight: 1.8, margin: 0 }}>{coaching}</p>
          : <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted, fontSize: 14 }}>
              <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite', color: C.teal }} />
              {t('bizsim.coaching_loading')}
            </div>
        }
      </div>
      {coaching && (
        <button onClick={onContinue} style={{
          width: '100%', padding: '13px', borderRadius: 12, cursor: 'pointer',
          background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`,
          border: 'none', color: '#fff', fontFamily: 'Syne', fontWeight: 800, fontSize: 15,
        }}>
          {t('bizsim.start_week', { week: weekNum + 1 })}
        </button>
      )}
    </GlowCard>
  )
}

// ── Phase unlock ──────────────────────────────────────────────────────────────
function PhaseUnlockScreen({ phase, onContinue }) {
  const { t } = useT()
  const phases = {
    2: { title: t('bizsim.phase2_unlocked_title'), sub: t('bizsim.phase2_unlocked_sub'), desc: t('bizsim.phase2_unlocked_desc'), colour: C.blue, emoji: '🏪' },
    3: { title: t('bizsim.phase3_unlocked_title'), sub: t('bizsim.phase3_unlocked_sub'), desc: t('bizsim.phase3_unlocked_desc'), colour: C.gold, emoji: '🏢' },
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
        {t('bizsim.lets_go')}
      </button>
    </div>
  )
}

// ── Failure screen ────────────────────────────────────────────────────────────
function FailureScreen({ session, onRestart }) {
  const { t } = useT()
  const days = (session?.day || 1) - 1
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
      <div style={{ fontSize: 56, marginBottom: 14 }}>💸</div>
      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, color: C.red, marginBottom: 8 }}>{t('bizsim.business_failed')}</div>
      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: C.white, marginBottom: 12 }}>
        {t('bizsim.ran_out_of_cash', { name: session?.biz_name, day: days })}
      </div>
      <div style={{ padding: '14px 20px', background: `${C.red}10`, border: `1px solid ${C.red}25`, borderRadius: 14, marginBottom: 20, maxWidth: 420, margin: '0 auto 20px' }}>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, margin: 0 }}>
          {t('bizsim.failure_lesson_prefix')} <strong style={{ color: C.white }}>{t('bizsim.failure_lesson_bold')}</strong>. {t('bizsim.failure_lesson_suffix')}
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 360, margin: '0 auto 20px' }}>
        <StatTile label={t('bizsim.days_survived')} value={days}             colour={C.red}  />
        <StatTile label={t('bizsim.peak_cash')}     value={fmt(session?.total_revenue || 0)} colour={C.gold} />
      </div>
      <button onClick={onRestart} style={{
        padding: '14px 32px', borderRadius: 14, cursor: 'pointer',
        background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`,
        border: 'none', color: '#fff', fontFamily: 'Syne', fontWeight: 800, fontSize: 15,
        boxShadow: `0 8px 32px ${C.blue}30`,
      }}>
        {t('bizsim.try_again_full')}
      </button>
    </div>
  )
}

// ── AI Lender Widget ──────────────────────────────────────────────────────────
function LoanWidget({ session, onLoanResult }) {
  const { t } = useT()
  const [open,     setOpen]     = useState(false)
  const [provider, setProvider] = useState('CEEC')
  const [amount,   setAmount]   = useState(1000)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)

  const PROVIDERS = {
    CEEC:   { rate: 5,  max: 50000,  label: 'CEEC',   sub: t('bizsim.provider_ceec_sub', { rate: 5 }),  c: C.green  },
    DBZ:    { rate: 12, max: 200000, label: 'DBZ',    sub: t('bizsim.provider_dbz_sub', { rate: 12 }),     c: C.blue   },
    ZANACO: { rate: 26, max: 100000, label: 'ZANACO', sub: t('bizsim.provider_zanaco_sub', { rate: 26 }),      c: C.gold   },
    kaloba: { rate: 60, max: 5000,   label: 'Kaloba', sub: t('bizsim.provider_kaloba_sub', { rate: 60 }),      c: C.red    },
  }

  if (session?.loan_balance > 0) {
    const handleRepay = async (amt) => {
      setLoading(true)
      try {
        const { data } = await api.post('/bizsim/loan/repay', { amount: amt })
        toast.success(data.message)
        onLoanResult?.()
      } catch (err) {
        toast.error(err.response?.data?.detail || t('bizsim.repayment_failed'))
      } finally { setLoading(false) }
    }
    const dailyInterest = session.loan_balance * (session.loan_interest_rate / 100) / 30
    const canRepayFull  = session.cash >= session.loan_balance
    const canRepayHalf  = session.cash >= session.loan_balance / 2

    return (
      <GlowCard colour={C.red} style={{ padding: '12px 14px' }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: C.muted, marginBottom: 8, letterSpacing: '0.08em' }}>
          {t('bizsim.active_loan_header')}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: C.white }}>{t('bizsim.outstanding_balance')}</span>
          <span style={{ color: C.red, fontFamily: 'Syne', fontWeight: 800 }}>{fmt(session.loan_balance)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginTop: 4 }}>
          <span>{t('bizsim.interest_rate_label')}</span>
          <span>{session.loan_interest_rate}% {t('bizsim.pa_suffix')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginTop: 4, marginBottom: 10 }}>
          <span>{t('bizsim.daily_interest_cost')}</span>
          <span>{fmt(dailyInterest)}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => handleRepay(session.loan_balance / 2)} disabled={loading || !canRepayHalf} style={{
            flex: 1, padding: '8px', borderRadius: 8, cursor: canRepayHalf ? 'pointer' : 'not-allowed',
            background: 'transparent', border: `1px solid ${C.border}`,
            color: canRepayHalf ? C.white : C.muted, fontSize: 11, fontFamily: 'Syne', fontWeight: 600,
            opacity: canRepayHalf ? 1 : 0.5,
          }}>
            {t('bizsim.repay_50')}
          </button>
          <button onClick={() => handleRepay(session.loan_balance)} disabled={loading || !canRepayFull} style={{
            flex: 1, padding: '8px', borderRadius: 8, cursor: canRepayFull ? 'pointer' : 'not-allowed',
            background: canRepayFull ? C.green : 'transparent', border: `1px solid ${canRepayFull ? C.green : C.border}`,
            color: canRepayFull ? C.navy : C.muted, fontSize: 11, fontFamily: 'Syne', fontWeight: 700,
            opacity: canRepayFull ? 1 : 0.5,
          }}>
            {t('bizsim.repay_full')}
          </button>
        </div>
        {!canRepayHalf && (
          <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
            {t('bizsim.not_enough_cash_repay')}
          </div>
        )}
      </GlowCard>
    )
  }

  if (session?.phase < 2) return null

  const handleApply = async () => {
    setLoading(true)
    setResult(null)
    try {
      const { data } = await api.post('/bizsim/loan/apply', { amount, provider })
      setResult(data)
      if (data.approved) {
        toast.success(t('bizsim.loan_approved_toast', { provider }))
        onLoanResult?.()
      } else {
        toast.error(t('bizsim.loan_declined_toast', { provider }))
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || t('bizsim.loan_application_failed'))
    } finally { setLoading(false) }
  }

  return (
    <div>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
        background: '#0F2040', border: `1px solid ${C.blue}30`,
        color: C.blue, fontFamily: 'Syne', fontWeight: 700, fontSize: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <DollarSign size={14} /> {t('bizsim.apply_loan')}
      </button>
      {open && (
        <GlowCard colour={C.blue} style={{ padding: '14px 16px', marginTop: 8 }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: C.muted, marginBottom: 10, letterSpacing: '0.08em' }}>
            {t('bizsim.choose_lender_header')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
            {Object.entries(PROVIDERS).map(([key, p]) => (
              <button key={key} onClick={() => setProvider(key)} style={{
                padding: '8px 10px', borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                background: provider === key ? `${p.c}18` : '#0A1628',
                border: `1px solid ${provider === key ? p.c : C.border}`,
              }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 12, color: provider === key ? p.c : C.white }}>{p.label}</div>
                <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{p.sub}</div>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontFamily: 'Syne', fontWeight: 700, color: C.muted }}>{t('bizsim.loan_amount_header')}</span>
            <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, color: PROVIDERS[provider].c }}>{fmt(amount)}</span>
          </div>
          <input type="range" min={500} max={Math.min(PROVIDERS[provider].max, 20000)} step={500}
            value={amount} onChange={e => setAmount(+e.target.value)}
            style={{ width: '100%', accentColor: PROVIDERS[provider].c, marginBottom: 10 }} />

          {result && (
            <div style={{
              padding: '10px 12px', borderRadius: 9, marginBottom: 10, fontSize: 12, lineHeight: 1.6,
              background: result.approved ? `${C.green}12` : `${C.red}12`,
              border: `1px solid ${result.approved ? C.green : C.red}30`,
              color: C.white,
            }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, color: result.approved ? C.green : C.red, marginBottom: 4 }}>
                {result.approved ? t('bizsim.loan_approved_result', { amount: fmt(result.amount), rate: result.rate }) : t('bizsim.loan_declined_result')}
              </div>
              {result.officer_msg}
            </div>
          )}

          <button onClick={handleApply} disabled={loading} style={{
            width: '100%', padding: '10px', borderRadius: 9, cursor: 'pointer',
            background: PROVIDERS[provider].c, border: 'none', color: C.navy,
            fontFamily: 'Syne', fontWeight: 800, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : t('bizsim.apply_to', { lender: PROVIDERS[provider].label })}
          </button>
        </GlowCard>
      )}
    </div>
  )
}


export default function BizSimPage() {
  const { t } = useT()
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
  const [pendingEvents,   setPendingEvents]   = useState([])
  const [eventIndex,      setEventIndex]      = useState(0)
  const [dayCanvasResult, setDayCanvasResult] = useState(null)

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

  const refreshSession = async () => {
    try {
      const { data } = await api.get('/bizsim/session')
      setSession(data.session)
    } catch {}
  }


  const handleStart = async (bizType, bizName) => {
    const { data } = await api.post('/bizsim/start', { biz_type: bizType, biz_name: bizName })
    setSession(data.session)
    const bizTypes = (await api.get('/bizsim/business-types')).data.businesses
    setBizMeta(bizTypes.find(b => b.id === bizType))
    toast.success(t('bizsim.biz_open_toast', { name: bizName }))
    setScreen('game')
    loadExtras()
  }

  const advanceToNextDay = async () => {
    try {
      const { data } = await api.get('/bizsim/event/today')
      if (data.events?.length) {
        setPendingEvents(data.events)
        setEventIndex(0)
        setScreen('event_card')
      } else {
        setScreen('game')
      }
    } catch {
      setScreen('game')
    }
  }

  const handleRunDay = async (decision) => {
    setRunning(true)
    try {
      const { data } = await api.post('/bizsim/day/run', decision)

      // Refresh session
      const { data: sd } = await api.get('/bizsim/session')
      setSession(sd.session)

      setDayCanvasResult({ ...data, __sessionDay: sd.session?.day })
      setScreen('day_canvas')
    } catch (err) {
      toast.error(err.response?.data?.detail || t('bizsim.day_simulation_failed'))
    } finally {
      setRunning(false)
    }
  }

  const handleDayCanvasComplete = () => {
    const data = dayCanvasResult
    if (!data) { setScreen('game'); return }
    setDayResult(data.day_result)

    if (data.bankrupt) {
      setScreen('failure')
      return
    }

    if (data.newly_completed_missions?.length) {
      data.newly_completed_missions.forEach(mid => {
        const m = missions.find(m => m.id === mid)
        if (m) toast.success(t('bizsim.mission_complete_toast', { name: m.name, reward: m.reward }))
      })
    }

    if (data.coaching) {
      setCoaching(data.coaching)
      setWeekNum(Math.floor((data.__sessionDay - 1) / 7))
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
        input[type=range] { -webkit-appearance: none; height: 6px; background: #1E3A5F; border-radius: 3px; outline: none; width: 100%; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; cursor: pointer; border: 2px solid #0A1628; }

        /* ── Mobile layout ──────────────────────────────────────────────
           Below 860px (phones and small tablets) the Play tab's two-up
           grid (decisions | stats+chart) collapses to a single stacked
           column instead of squeezing both into unusably narrow halves. */
        .bizsim-game-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        @media (min-width: 860px) {
          .bizsim-game-grid {
            display: grid;
            grid-template-columns: minmax(0,1.1fr) minmax(0,0.9fr);
            align-items: start;
          }
        }
        .bizsim-topbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .bizsim-topbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }
        .bizsim-mkt-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .bizsim-mkt-buttons > button { flex: 1 1 76px; min-width: 76px; }
        @media (max-width: 480px) {
          .bizsim-topbar { justify-content: flex-start; }
          .bizsim-topbar-info { min-width: 0; }
        }
      `}</style>

      {screen === 'loading' && (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={32} style={{ animation: 'spin 0.8s linear infinite', color: C.teal }} />
        </div>
      )}

      {screen === 'setup' && <StorySetup onStart={handleStart} />}

      {['game','event_card','day_canvas','result','coaching','phase_unlock'].includes(screen) && session && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 12px' }}>

          {/* Top bar — wraps onto multiple lines on narrow screens instead
              of squeezing the biz name, health pills, and restart button
              into an overflowing single row. */}
          <div className="bizsim-topbar" style={{
            padding: '14px 0', borderBottom: `1px solid ${C.border}`, marginBottom: 16,
          }}>
            <div className="bizsim-topbar-info" style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>{bizMeta?.emoji}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: C.white,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60vw',
                }}>
                  {session.biz_name}
                </div>
                <div style={{ fontSize: 11, color: accentCol, fontFamily: 'Syne', fontWeight: 600 }}>
                  {bizMeta?.location} · {t('bizsim.phase')} {session.phase}
                </div>
              </div>
            </div>

            {/* Health pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { l: t('bizsim.cash_label'),    v: fmt(session.cash),         c: session.cash < 500 ? C.red : C.green  },
                { l: t('bizsim.profit'),  v: fmt(session.total_profit), c: session.total_profit >= 0 ? C.green : C.red },
                { l: t('bizsim.day_of'),     v: session.day,                c: C.blue  },
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

            <div className="bizsim-topbar-actions">
              <button onClick={handleRestart} style={{
                padding: '6px 12px', borderRadius: 9, cursor: 'pointer',
                background: 'transparent', border: `1px solid ${C.border}`,
                color: C.muted, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
                whiteSpace: 'nowrap',
              }}>
                <RefreshCw size={12} /> {t('bizsim.restart')}
              </button>
            </div>
          </div>

          {/* Tabs — horizontally scrollable so 4 tabs never overflow/clip
              on narrow phones instead of getting crushed by flex:1. */}
          <div style={{
            display: 'flex', gap: 4, marginBottom: 16, background: C.card, borderRadius: 12, padding: 4,
            overflowX: 'auto',
          }}>
            {[
              { k: 'game',        l: t('bizsim.tab_play'),        icon: Zap       },
              { k: 'stats',       l: t('bizsim.tab_statements'),  icon: BarChart2 },
              { k: 'leaderboard', l: t('bizsim.leaderboard'), icon: Trophy    },
              { k: 'missions',    l: t('bizsim.missions'), icon: Target    },
            ].map(({ k, l, icon: Icon }) => (
              <button key={k} onClick={() => setTab(k)} style={{
                flex: '1 1 82px', minWidth: 82, padding: '9px 8px', borderRadius: 9, cursor: 'pointer',
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
            <div className="bizsim-game-grid">

              {/* Left: decisions or results */}
              <div style={{ animation: 'slideUp 0.3s ease' }}>
                {screen === 'game' && (
                  <DecisionPanel session={session} biz={bizMeta} onSubmit={handleRunDay} loading={running} />
                )}
                {screen === 'event_card' && pendingEvents[eventIndex] && (
                  <EventCard
                    event={pendingEvents[eventIndex]}
                    onChoose={async (choiceId) => {
                      const { data } = await api.post('/bizsim/event/choose', {
                        event_id: pendingEvents[eventIndex].id, choice_id: choiceId,
                      })
                      await refreshSession()
                      return data.consequence
                    }}
                    onContinue={() => {
                      if (eventIndex + 1 < pendingEvents.length) setEventIndex(i => i + 1)
                      else setScreen('game')
                    }}
                  />
                )}
                {screen === 'day_canvas' && dayCanvasResult && (
                  <DayCanvas
                    dayResult={dayCanvasResult.day_result}
                    rivalName={session?.rival_name}
                    onComplete={handleDayCanvasComplete}
                  />
                )}
                {screen === 'result' && (
                  <DayResult result={dayResult} session={session} onContinue={advanceToNextDay} />
                )}
                {screen === 'coaching' && (
                  <CoachingScreen coaching={coaching} weekNum={weekNum} onContinue={() => { loadExtras(); advanceToNextDay() }} />
                )}
                {screen === 'phase_unlock' && (
                  <PhaseUnlockScreen phase={unlockPhase} onContinue={advanceToNextDay} />
                )}
              </div>

              {/* Right: live metrics + chart */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <StatTile label={t('bizsim.total_revenue')}  value={fmt(session.total_revenue)} colour={C.green} icon={TrendingUp} />
                  <StatTile label={t('bizsim.net_profit')}     value={fmt(session.total_profit)}  colour={session.total_profit >= 0 ? C.gold : C.red} icon={DollarSign} />
                  <StatTile label={t('bizsim.cash_on_hand')}   value={fmt(session.cash)}          colour={session.cash < 500 ? C.red : C.teal} icon={ShoppingCart} />
                  <StatTile label={t('bizsim.customers_short')}      value={session.total_customers}    colour={C.purple} icon={Users} />
                </div>

                {/* AI Lender */}
                <LoanWidget session={session} onLoanResult={refreshSession} />

                {/* Cash flow chart */}
                {chartData.length > 2 && (
                  <GlowCard colour={accentCol} style={{ padding: '14px 14px' }}>
                    <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: C.muted, marginBottom: 10, letterSpacing: '0.08em' }}>
                      {t('bizsim.cash_trend_header')}
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
                      {t('bizsim.competitor_label')}
                    </div>
                    {session.competitors.map(c => (
                      <div key={c.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '7px 0', borderBottom: `1px solid ${C.border}`,
                        fontSize: 12,
                      }}>
                        <div>
                          <div style={{ color: C.white, fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>{c.personality} {t('bizsim.strategy_suffix')}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: C.orange, fontFamily: 'Syne', fontWeight: 700 }}>{fmt(c.price)}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>{c.customers || 0} {t('bizsim.customers_suffix')}</div>
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
                  {t('bizsim.profit_loss')}
                </div>
                {[
                  { l: t('bizsim.revenue'),      v: statements.profit_loss?.revenue,      c: C.green, bold: false },
                  { l: t('bizsim.cost_of_sales'),v: -statements.profit_loss?.cogs,        c: C.red,   bold: false },
                  { l: t('bizsim.gross_profit'), v: statements.profit_loss?.gross_profit, c: C.teal,  bold: true  },
                  { l: t('bizsim.margin_label'),       v: null, sub: pct(statements.profit_loss?.gross_margin) },
                  { l: t('bizsim.marketing'),    v: -statements.profit_loss?.marketing,   c: C.muted, bold: false },
                  { l: t('bizsim.fixed_costs'),  v: -statements.profit_loss?.fixed_costs, c: C.muted, bold: false },
                  { l: t('bizsim.interest_label'),     v: -statements.profit_loss?.interest,    c: C.red,   bold: false },
                  { l: t('bizsim.net_profit'),   v: statements.profit_loss?.net_profit,   c: statements.profit_loss?.net_profit >= 0 ? C.gold : C.red, bold: true },
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
                  {t('bizsim.balance_sheet')}
                </div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: C.muted, marginBottom: 8, letterSpacing: '0.06em' }}>{t('bizsim.assets_header').toUpperCase()}</div>
                {[
                  { l: t('bizsim.cash_label'),        v: statements.balance_sheet?.balances?.cash        || 0, c: C.green },
                  { l: t('bizsim.inventory_label'),   v: statements.balance_sheet?.balances?.inventory   || 0, c: C.teal  },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: `1px solid ${C.border}15` }}>
                    <span style={{ color: C.muted }}>{l}</span>
                    <span style={{ color: c, fontFamily: 'Syne', fontWeight: 600 }}>{fmt(v)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 5px', fontSize: 13, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ color: C.white, fontWeight: 700 }}>{t('bizsim.total_assets')}</span>
                  <span style={{ color: C.blue, fontFamily: 'Syne', fontWeight: 800 }}>{fmt(statements.balance_sheet?.total_assets)}</span>
                </div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 11, color: C.muted, margin: '10px 0 8px', letterSpacing: '0.06em' }}>{t('bizsim.liabilities_equity_header').toUpperCase()}</div>
                {[
                  { l: t('bizsim.loans_label'),   v: statements.balance_sheet?.balances?.loan_payable || 0, c: C.red    },
                  { l: t('bizsim.equity_label'),  v: statements.balance_sheet?.total_equity           || 0, c: C.purple },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12, borderBottom: `1px solid ${C.border}15` }}>
                    <span style={{ color: C.muted }}>{l}</span>
                    <span style={{ color: c, fontFamily: 'Syne', fontWeight: 600 }}>{fmt(v)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 9, background: statements.balance_sheet?.balanced ? `${C.green}15` : `${C.red}15`, border: `1px solid ${statements.balance_sheet?.balanced ? C.green : C.red}30`, fontSize: 11, color: statements.balance_sheet?.balanced ? C.green : C.red, fontFamily: 'Syne', fontWeight: 700 }}>
                  {statements.balance_sheet?.balanced ? t('bizsim.balance_sheet_balanced') : t('bizsim.balance_sheet_imbalance')}
                </div>
              </GlowCard>

              {/* Cash flow chart */}
              {statements.cash_flow_chart?.length > 2 && (
                <GlowCard colour={C.teal} style={{ padding: '18px 20px', gridColumn: '1 / -1' }}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 14, color: C.teal, marginBottom: 14 }}>
                    {t('bizsim.cash_flow_over_time')}
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={statements.cash_flow_chart}>
                      <XAxis dataKey="day" tick={{ fontSize: 9, fill: C.muted }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: C.muted }} axisLine={false} tickLine={false} width={50} tickFormatter={v => `K${v}`} />
                      <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }} />
                      <ReferenceLine y={0} stroke={C.border} />
                      <Bar dataKey="profit" fill={C.blue} radius={[3,3,0,0]} name={t('bizsim.daily_profit')} />
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
                {t('bizsim.live_leaderboard')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {leaderboard.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: C.muted, fontSize: 14 }}>
                    {t('bizsim.no_players')}
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
                      <div style={{ fontSize: 10, color: C.muted }}>{p.owner} · {t('bizsim.day_of')} {p.day} · {t('bizsim.phase')} {p.phase}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 15, color: p.net_profit >= 0 ? C.green : C.red }}>
                        {fmt(p.net_profit)}
                      </div>
                      <div style={{ fontSize: 10, color: C.muted }}>{t('bizsim.net_profit_lower')}</div>
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
                      <div style={{ fontSize: 10, color: m.colour, fontFamily: 'Syne', fontWeight: 600 }}>{t('bizsim.mission_reward')}: +{fmt(m.reward)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{m.desc}</div>
                  {m.completed && (
                    <div style={{ marginTop: 8, fontSize: 11, color: C.green, fontFamily: 'Syne', fontWeight: 700 }}>
                      {t('bizsim.mission_reward_claimed')}
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
