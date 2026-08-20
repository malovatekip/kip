import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Minus,
  DollarSign, Users, Calendar, Zap,
  ChevronDown, ClipboardList, MapPin,
  Plus, ArrowRight, BarChart2, Lightbulb
} from 'lucide-react'
import Layout from '../components/Layout'
import KipMarkdown from '../components/KipMarkdown'
import { EmptyStateIllustration } from '../components/KipIllustrations'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../context/TranslationContext'
import api from '../lib/api'

/* ── Tiny sparkline ──────────────────────────────────── */
function Sparkline({ data, color = '#2B7FFF', height = 48 }) {
  if (!data || data.length < 2) return null
  const w = 200, h = height
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * (h - 6) - 3
    return `${x},${y}`
  }).join(' ')
  const fillPts = `0,${h} ${pts} ${w},${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#sg-${color.replace('#','')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/* ── Bar chart ───────────────────────────────────────── */
function BarChart({ data, labels, color = '#2B7FFF' }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: '100%', borderRadius: '4px 4px 0 0',
            background: `linear-gradient(to top, ${color}, ${color}99)`,
            height: `${Math.max((v / max) * 68, v > 0 ? 4 : 0)}px`,
            transition: 'height 0.6s cubic-bezier(0.4,0,0.2,1)',
            minHeight: v > 0 ? 4 : 0,
          }} />
          {labels && (
            <span style={{ fontSize: 9, color: 'var(--faint)', fontFamily: 'Syne', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {labels[i]}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Stat card ───────────────────────────────────────── */
function StatCard({ label, value, sub, trend, color, icon: Icon, spark, children }) {
  const trendColor = trend > 0 ? 'var(--green)' : trend < 0 ? 'var(--red)' : 'var(--muted)'
  const TrendIcon  = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  return (
    <div className="kip-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={15} style={{ color }} />
          </div>
          <span style={{ fontSize: 12, fontFamily: 'Syne', fontWeight: 600, color: 'var(--muted)' }}>{label}</span>
        </div>
        {trend !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, fontFamily: 'Syne', color: trendColor }}>
            <TrendIcon size={12} />
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>}
      {spark && <div style={{ marginTop: 4 }}>{spark}</div>}
      {children}
    </div>
  )
}

/* ── Business selector ───────────────────────────────── */
function BusinessSelector({ plans, selected, onSelect }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!plans.length) return null

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
        background: 'var(--blue-dim)', border: '1px solid rgba(43,127,255,0.3)',
        fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--blue-bright)',
        transition: 'all 0.2s ease',
      }}>
        <BarChart2 size={16} />
        <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.business_name || t('dashboard.select_business')}
        </span>
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 6, zIndex: 100, minWidth: 240,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}>
          {plans.map(plan => (
            <button key={plan.id} onClick={() => { onSelect(plan); setOpen(false) }} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 9, cursor: 'pointer', border: 'none',
              background: selected?.id === plan.id ? 'var(--blue-dim)' : 'transparent',
              color: selected?.id === plan.id ? 'var(--blue-bright)' : 'var(--text)',
              fontFamily: 'Plus Jakarta Sans', fontWeight: 500, fontSize: 13,
              textAlign: 'left', transition: 'background 0.15s ease',
            }}>
              <BarChart2 size={14} style={{ flexShrink: 0, color: 'var(--blue-bright)' }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {plan.business_name}
              </span>
              {selected?.id === plan.id && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue-bright)', flexShrink: 0 }} />}
            </button>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', margin: '6px 0' }} />
          <Link to="/ideas" onClick={() => setOpen(false)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
            borderRadius: 9, textDecoration: 'none', fontSize: 12,
            color: 'var(--muted)', fontFamily: 'Plus Jakarta Sans',
          }}>
            <Plus size={13} /> {t('dashboard.start_new_business')}
          </Link>
        </div>
      )}
    </div>
  )
}

/* ── News row (with thumbnail) ────────────────────────── */
function NewsRow({ item }) {
  const { t } = useT()
  const [imgOk, setImgOk] = useState(true)
  const showImage = item.image_url && imgOk
  return (
    <a href={item.url || item.link} target="_blank" rel="noopener noreferrer"
       style={{ display: 'flex', gap: 10, alignItems: 'flex-start', textDecoration: 'none' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, fontWeight: 500, marginBottom: 2 }}>
          {item.headline || item.title}
        </div>
        <div style={{ fontSize: 10, color: 'var(--faint)' }}>{item.source_name || item.source || t('dashboard.kip_news_source')}</div>
      </div>
      {showImage && (
        <img
          src={item.image_url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgOk(false)}
          style={{ width: 52, height: 52, borderRadius: 9, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }}
        />
      )}
    </a>
  )
}

/* ── Day labels ──────────────────────────────────────── */
const DAY_KEYS = ['dashboard.day_mon','dashboard.day_tue','dashboard.day_wed','dashboard.day_thu','dashboard.day_fri','dashboard.day_sat','dashboard.day_sun']

function getDayIndex(dateStr) {
  if (!dateStr) return null
  try {
    return new Date(dateStr).getDay() || 6
  } catch { return null }
}

/* ── Main ────────────────────────────────────────────── */
export default function DashboardPage() {
  const { t }      = useT()
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [plans,    setPlans]    = useState([])
  const [selected, setSelected] = useState(null)
  const [planData, setPlanData] = useState(null)
  const [news,     setNews]     = useState([])
  const [ideas,    setIdeas]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [logLoad,  setLogLoad]  = useState(false)
  const [coachingOpen, setCoachingOpen] = useState(false)

  const firstName = user?.full_name?.split(' ')[0] || t('dashboard.greeting_fallback_name')
  const hour = new Date().getHours()
  const greetingKey = hour < 12 ? 'dashboard.greeting_morning' : hour < 17 ? 'dashboard.greeting_afternoon' : 'dashboard.greeting_evening'
  const greeting = t(greetingKey)

  // Load all plans + news + ideas on mount
  useEffect(() => {
    Promise.all([
      api.get('/business/my-plans').catch(() => ({ data: [] })),
      api.get('/news/articles?limit=3').catch(() => ({ data: [] })),
      api.get('/ideas/').catch(() => ({ data: [] })),
    ]).then(([p, n, i]) => {
      const planList = p.data || []
      setPlans(planList)
      setNews(n.data?.articles || n.data || [])
      setIdeas(i.data || [])

      // Auto-select saved preference or first plan
      const savedId = parseInt(localStorage.getItem('kip_dashboard_plan') || '0')
      const pick    = planList.find(p => p.id === savedId) || planList[0] || null
      if (pick) setSelected(pick)
      else       setLoading(false)
    })
  }, [])

  // Load plan detail when selected changes
  useEffect(() => {
    if (!selected) return
    localStorage.setItem('kip_dashboard_plan', selected.id)
    setLogLoad(true)
    api.get(`/business/plan/${selected.id}`)
      .then(r => setPlanData(r.data))
      .catch(() => setPlanData(null))
      .finally(() => { setLogLoad(false); setLoading(false) })
  }, [selected?.id])

  // Compute stats from logs
  const logs      = planData?.logs || []
  const last7     = logs.slice(0, 7).reverse()       // oldest first for chart
  const last14    = logs.slice(0, 14)
  const prev7     = logs.slice(7, 14).reverse()

  const totalRev7  = last7.reduce((s, l) => s + (l.revenue  || 0), 0)
  const totalExp7  = last7.reduce((s, l) => s + (l.expenses || 0), 0)
  const totalProfit7 = totalRev7 - totalExp7
  const totalCust7 = last7.reduce((s, l) => s + (l.customers || 0), 0)

  const prevRev7   = prev7.reduce((s, l) => s + (l.revenue  || 0), 0)
  const prevCust7  = prev7.reduce((s, l) => s + (l.customers || 0), 0)

  const revTrend  = prevRev7  > 0 ? ((totalRev7  - prevRev7)  / prevRev7)  * 100 : 0
  const custTrend = prevCust7 > 0 ? ((totalCust7 - prevCust7) / prevCust7) * 100 : 0

  const revData   = last7.map(l => l.revenue  || 0)
  const profData  = last7.map(l => (l.revenue || 0) - (l.expenses || 0))
  const custData  = last7.map(l => l.customers || 0)
  const dayLabels = last7.map(l => {
    const idx = getDayIndex(l.created_at)
    return idx === null ? '' : t(DAY_KEYS[idx])
  })

  // Peak day
  const peakIdx  = revData.indexOf(Math.max(...revData))
  const peakDay  = dayLabels[peakIdx] || '—'
  const peakRev  = revData[peakIdx] || 0

  // Profit margin
  const margin = totalRev7 > 0 ? ((totalProfit7 / totalRev7) * 100).toFixed(1) : '—'

  // Days logged
  const daysLogged = logs.length

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(43,127,255,0.2)', borderTopColor: 'var(--blue)', animation: 'spinSlow 0.8s linear infinite' }} />
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 16px', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
          <div>
            <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: 'var(--text)', marginBottom: 3 }}>
              {greeting}, {firstName} 👋
            </h1>
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              {new Date().toLocaleDateString('en-ZM', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {plans.length > 0 && (
            <BusinessSelector plans={plans} selected={selected} onSelect={setSelected} />
          )}
        </div>

        {/* ── No business yet ── */}
        {plans.length === 0 && (
          <div className="kip-card" style={{ padding: '32px 24px', textAlign: 'center', marginBottom: 20 }}>
            <div className="animate-float" style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
              <EmptyStateIllustration width={180} height={144} />
            </div>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>
              {t('dashboard.no_businesses_title')}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
              {t('dashboard.no_businesses_desc')}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/chat" className="kip-btn kip-btn-primary" style={{ fontSize: 13 }}>
                <Zap size={15} /> {t('dashboard.ask_kip_idea')}
              </Link>
              <Link to="/ideas" className="kip-btn kip-btn-ghost" style={{ fontSize: 13 }}>
                {t('dashboard.my_ideas')}
              </Link>
            </div>
          </div>
        )}

        {/* ── Business dashboard ── */}
        {selected && (
          <>
            {/* Business name + quick actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="kip-badge kip-badge-green">{selected.status?.toUpperCase() || t('dashboard.status_active').toUpperCase()}</span>
                  <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{selected.business_name}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                  {daysLogged} {daysLogged !== 1 ? t('dashboard.days_plural') : t('dashboard.day_singular')} {t('dashboard.logged_summary_suffix')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to={`/business/${selected.id}/log`} className="kip-btn kip-btn-primary" style={{ fontSize: 12, padding: '8px 14px' }}>
                  <ClipboardList size={14} /> {t('dashboard.log_today_short')}
                </Link>
                <Link to={`/business/${selected.id}`} className="kip-btn kip-btn-ghost" style={{ fontSize: 12, padding: '8px 14px' }}>
                  {t('dashboard.full_dashboard')} <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {logLoad ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
                {[0,1,2,3].map(i => <div key={i} className="shimmer-load" style={{ height: 120, borderRadius: 16 }} />)}
              </div>
            ) : logs.length === 0 ? (
              <div className="kip-card" style={{ padding: '24px 24px', textAlign: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                  <EmptyStateIllustration width={150} height={120} />
                </div>
                <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>{t('dashboard.no_logs_title', { name: selected.business_name })}</h3>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{t('dashboard.no_logs_desc')}</p>
                <Link to={`/business/${selected.id}/log`} className="kip-btn kip-btn-primary" style={{ fontSize: 13 }}>
                  <ClipboardList size={14} /> {t('dashboard.log_day_one')}
                </Link>
              </div>
            ) : (
              <>
                {/* ── Stat cards ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 12, marginBottom: 16 }}>

                  <StatCard label={t('dashboard.revenue_7days')} value={`K${totalRev7.toLocaleString()}`}
                    trend={revTrend} color="var(--green)" icon={DollarSign}
                    sub={`K${(totalRev7/Math.max(last7.length,1)).toFixed(0)}${t('dashboard.per_day_avg')}`}
                    spark={<Sparkline data={revData} color="var(--green)" height={40} />}
                  />

                  <StatCard label={t('dashboard.net_profit_7days')} value={`K${totalProfit7.toLocaleString()}`}
                    trend={revTrend} color={totalProfit7 >= 0 ? 'var(--gold-bright)' : 'var(--red)'} icon={TrendingUp}
                    sub={`${margin}${t('dashboard.margin_suffix')}`}
                    spark={<Sparkline data={profData} color={totalProfit7 >= 0 ? 'var(--gold)' : 'var(--red)'} height={40} />}
                  />

                  <StatCard label={t('dashboard.customers_7days')} value={totalCust7.toLocaleString()}
                    trend={custTrend} color="var(--teal)" icon={Users}
                    sub={`${(totalCust7/Math.max(last7.length,1)).toFixed(1)}${t('dashboard.per_day_avg')}`}
                    spark={<Sparkline data={custData} color="var(--teal)" height={40} />}
                  />

                  <StatCard label={t('dashboard.peak_day')} value={peakDay}
                    color="var(--blue-bright)" icon={Calendar}
                    sub={`K${peakRev.toLocaleString()} ${t('dashboard.best_single_day')}`}
                  />

                </div>

                {/* ── Revenue bar chart (last 7 days) ── */}
                <div className="kip-card" style={{ padding: '18px 20px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{t('dashboard.daily_revenue_chart_title')}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t('dashboard.k_per_day')}</div>
                    </div>
                    {revTrend !== 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, fontFamily: 'Syne', color: revTrend > 0 ? 'var(--green)' : 'var(--red)' }}>
                        {revTrend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {Math.abs(revTrend).toFixed(1)}% {t('dashboard.vs_prev_week')}
                      </div>
                    )}
                  </div>
                  <BarChart data={revData} labels={dayLabels} color="var(--blue)" />
                </div>

                {/* ── Recent log + coaching ── */}
                {logs[0] && (
                  <div className="kip-card" style={{ padding: '16px 18px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--blue), var(--teal))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Zap size={14} color="#fff" />
                      </div>
                      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                        {t('dashboard.latest_coaching')}
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginLeft: 6 }}>
                          {logs[0].created_at ? new Date(logs[0].created_at).toLocaleDateString('en-ZM', { day: 'numeric', month: 'short' }) : ''}
                        </span>
                      </div>
                    </div>
                    {logs[0].coaching ? (
                      <div style={{ position: 'relative' }}>
                        <div style={{
                          maxHeight: coachingOpen ? 'none' : 110, overflow: 'hidden',
                          maskImage: coachingOpen ? 'none' : 'linear-gradient(180deg, #000 65%, transparent 100%)',
                          WebkitMaskImage: coachingOpen ? 'none' : 'linear-gradient(180deg, #000 65%, transparent 100%)',
                        }}>
                          <KipMarkdown content={logs[0].coaching} />
                        </div>
                        <button onClick={() => setCoachingOpen(o => !o)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4,
                          fontSize: 12, fontFamily: 'Syne', fontWeight: 700, color: 'var(--blue-bright)',
                        }}>
                          {coachingOpen ? t('dashboard.show_less') : t('dashboard.read_full_coaching')}
                        </button>
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: 'var(--muted)' }}>{t('dashboard.no_coaching_latest')}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Divider ── */}
        {(plans.length > 0) && <div className="kip-divider" />}

        {/* ── Bottom row: recent ideas + news  ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>

          {/* Recent ideas */}
          {ideas.length > 0 && (
            <div className="kip-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{t('dashboard.recent_ideas')}</span>
                <Link to="/ideas" style={{ fontSize: 12, color: 'var(--blue-bright)', textDecoration: 'none', fontFamily: 'Syne', fontWeight: 600 }}>{t('common.view_all')}</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ideas.slice(0, 3).map(idea => (
                  <div key={idea.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                      background: idea.accepted ? 'var(--green-dim, rgba(26,224,110,0.14))' : 'var(--gold-dim)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Lightbulb size={13} style={{ color: idea.accepted ? 'var(--green)' : 'var(--gold)' }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {idea.idea_name}
                    </span>
                    <span style={{ fontSize: 10, fontFamily: 'Syne', fontWeight: 600, color: idea.accepted ? 'var(--green)' : 'var(--muted)' }}>
                      {idea.accepted ? t('dashboard.status_active') : t('dashboard.status_pending')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* News */}
          {news.length > 0 && (
            <div className="kip-card" style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{t('dashboard.economic_news')}</span>
                <Link to="/news" style={{ fontSize: 12, color: 'var(--blue-bright)', textDecoration: 'none', fontFamily: 'Syne', fontWeight: 600 }}>{t('dashboard.see_all')}</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {news.slice(0, 3).map((item, i) => (
                  <NewsRow key={item.id ?? i} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="kip-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 12 }}>{t('dashboard.quick_actions')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { to: '/chat',      label: t('dashboard.action_ask_kip'),  icon: Zap,          color: 'var(--blue-bright)' },
                { to: '/templates', label: t('dashboard.action_templates'), icon: BarChart2,    color: 'var(--gold)'        },
                { to: '/survey',    label: t('dashboard.action_survey'),   icon: MapPin,       color: 'var(--teal)'        },
              ].map(({ to, label, icon: Icon, color }) => (
                <Link key={to} to={to} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 9, textDecoration: 'none',
                  background: 'var(--input-bg)', border: '1px solid var(--border)',
                  transition: 'all 0.15s ease',
                }}>
                  <Icon size={14} style={{ color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{label}</span>
                  <ArrowRight size={12} style={{ color: 'var(--faint)', marginLeft: 'auto' }} />
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}
