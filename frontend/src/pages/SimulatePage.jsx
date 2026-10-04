import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Play, LogOut, Sun, Moon, Loader2, Activity, BarChart3, ScrollText, Gamepad2, RotateCcw, Trophy } from 'lucide-react'
import '../styles/simulate.css'
import { useT } from '../context/TranslationContext'
import { useTheme } from '../hooks/useTheme'
import Gauge from '../components/simulation/Gauge'
import AdvisorHead from '../components/simulation/AdvisorHead'
import BusinessFlowScene from '../components/simulation/BusinessFlowScene'
import ShockBanner from '../components/simulation/ShockBanner'
import LeverDeck, { fmtK, fmtInt } from '../components/simulation/LeverDeck'
import WeekProgress from '../components/simulation/WeekProgress'
import LiveCharts from '../components/simulation/LiveCharts'
import { ScoreBreakdown, EventLog, PastSessions, buildEvents } from '../components/simulation/LeftPanel'
import useWeekPlayback from '../components/simulation/useWeekPlayback'
import { makeSimulationApi } from '../components/simulation/simulationApi'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const lerp = (a, b, f) => a + (b - a) * f
const sum = (xs) => xs.reduce((s, x) => s + (Number(x) || 0), 0)

/* Server lever shape <-> editable shape ({ mix: { name: units } }). */
function toEditable(def = {}) {
  const mix = {}
  for (const s of def.product_mix_selections || []) mix[s.sub_product_name] = Number(s.units) || 0
  return {
    price: Number(def.price) || 0, ad_spend: Number(def.ad_spend) || 0,
    stock_ordered: Number(def.stock_ordered) || 0, staffing_change: Number(def.staffing_change) || 0, mix,
  }
}
function toApi(levers, subs = []) {
  return {
    price: levers.price, ad_spend: levers.ad_spend, stock_ordered: levers.stock_ordered,
    staffing_change: levers.staffing_change,
    product_mix_selections: subs.filter(s => levers.mix[s.sub_product_name] != null)
      .map(s => ({ ...s, units: Number(levers.mix[s.sub_product_name]) || 0 })),
  }
}

/* Day-by-day chart points for played weeks, plus the animating week up to `f`. */
function chartPoints(weeks, initialCash, live, f, t) {
  const pts = [{ i: 0, dayIndex: 0, week: 0, weekLabel: '', label: t('simulate.chart_start'), cash: initialCash, demand: 0, served: 0, profit: 0 }]
  let profitBefore = 0
  const push = (w, days) => {
    days.forEach((d, k) => pts.push({
      i: (w.week - 1) * 7 + d.day, dayIndex: d.day, week: w.week, weekLabel: `W${w.week}`,
      label: `W${w.week} · ${t(`simulate.day_${DAY_KEYS[k]}`)}`,
      cash: d.cash_balance, demand: d.demand, served: d.served, profit: profitBefore + d.profit_to_date,
    }))
  }
  for (const w of weeks) { push(w, w.daily || []); profitBefore += w.net_profit || 0 }
  if (live) {
    const days = live.daily || []
    const pos = f * 7
    const whole = Math.floor(pos)
    push(live, days.slice(0, whole))
    if (whole < 7 && days[whole]) {
      const prev = pts[pts.length - 1]
      const next = days[whole]
      const frac = pos - whole
      pts.push({
        i: (live.week - 1) * 7 + whole + frac, dayIndex: -1, week: live.week, weekLabel: '',
        label: `W${live.week} · ${t(`simulate.day_${DAY_KEYS[whole]}`)}`,
        cash: lerp(prev.cash, next.cash_balance, frac), demand: next.demand * frac, served: next.served * frac,
        profit: lerp(prev.profit, profitBefore + next.profit_to_date, frac),
      })
    }
  }
  return pts
}

export default function SimulatePage({ demo = false }) {
  const { ideaId } = useParams()
  const navigate = useNavigate()
  const { t } = useT()
  const { isDark, toggle } = useTheme()
  const simApi = useMemo(() => makeSimulationApi(ideaId, { demo }), [ideaId, demo])
  const playback = useWeekPlayback()

  const [session, setSession] = useState(null)
  const [past, setPast] = useState([])
  const [levers, setLevers] = useState(toEditable())
  const [pending, setPending] = useState(null)      // { week, session, levers } while animating
  const [prevSession, setPrevSession] = useState(null)
  const [awaiting, setAwaiting] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [mtab, setMtab] = useState('play')
  const [advisorOpen, setAdvisorOpen] = useState(false)
  const [newHorizon, setNewHorizon] = useState(4)
  const busy = awaiting || playback.playing
  const sceneRef = useRef(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const { session: s, past: p } = await simApi.load()
      setSession(s)
      setPast(p)
      setLevers(toEditable(s.default_levers))
    } catch (err) {
      setLoadError(err.response?.data?.detail || err.message || 'error')
    }
  }, [simApi])
  useEffect(() => { load() }, [load])

  const subs = session?.allowed_sub_products || []

  const play = async () => {
    if (busy || !session || session.status !== 'in_progress') return
    setAwaiting(true)
    const sent = toApi(levers, subs)
    try {
      const res = await simApi.play(session.session_id, sent)
      const used = res.recordedLevers || sent
      if (res.recordedLevers) setLevers(toEditable(res.recordedLevers))
      setPrevSession(session)
      setPending({ ...res, levers: used })
      setAwaiting(false)
      if (window.matchMedia?.('(max-width: 767px)').matches) {
        setMtab('play')
        sceneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      playback.start(() => {
        setSession(res.session)
        setPending(null)
        setLevers(toEditable(res.session.default_levers))
        if (res.session.status === 'completed') simApi.past().then(setPast).catch(() => {})
      })
    } catch (err) {
      setAwaiting(false)
      toast.error(err.response?.data?.detail || t('simulate.play_failed'))
    }
  }

  const restart = async () => {
    try {
      const s = await simApi.restart(newHorizon)
      setSession(s)
      setLevers(toEditable(s.default_levers))
      setPending(null)
      setMtab('play')
      simApi.past().then(setPast).catch(() => {})
    } catch (err) {
      toast.error(err.response?.data?.detail || t('simulate.restart_failed'))
    }
  }

  /* ── Derived live view ─────────────────────────────────────────── */
  const view = useMemo(() => {
    if (!session) return null
    const f = playback.playing ? playback.progress : pending ? 1 : 0
    const base = pending ? prevSession || session : session
    const live = pending?.week
    const weeksDone = base.weeks || []
    const lastWeek = live || weeksDone[weeksDone.length - 1]

    const fromScores = base.running_scores
    const toScores = live ? live.running_scores : session.running_scores
    const scores = Object.fromEntries(Object.keys(fromScores || {}).map(k => [k, lerp(fromScores[k], toScores?.[k] ?? fromScores[k], f)]))
    const v = live ? lerp(base.running_viability, live.running_viability, f) : session.running_viability

    const points = chartPoints(weeksDone, session.economics?.initial_cash ?? 0, live, f, t)

    // Scene values
    const lv = pending?.levers || toApi(levers, subs)
    const bought = (lv.stock_ordered || 0) + sum((lv.product_mix_selections || []).map(s => s.units))
    const onHandBefore = sum(Object.values(base.economics?.inventory || {}))
    let metrics
    if (live) {
      const days = live.daily || []
      const pos = f * 7, whole = Math.floor(pos), frac = pos - whole
      const cumOf = (key) => sum(days.slice(0, whole).map(d => d[key])) + (days[whole] ? days[whole][key] * frac : 0)
      const served = cumOf('served'), demand = cumOf('demand')
      const servedFrac = live.served_demand > 0 ? served / live.served_demand : 0
      const lost = live.shock_hit ? live.units_lost * Math.min(1, f / 0.15) : 0
      metrics = {
        bought, served, demand, staff: live.staff_count, ad: lv.ad_spend,
        stock: Math.max(0, onHandBefore + bought - lost - served),
        revenue: live.revenue * servedFrac, cash: points[points.length - 1].cash,
      }
    } else {
      metrics = {
        bought, staff: (session.economics?.staff_count || 1) + (levers.staffing_change || 0), ad: levers.ad_spend,
        stock: onHandBefore, served: lastWeek?.served_demand || 0, demand: lastWeek?.gross_demand || 0,
        revenue: lastWeek?.revenue || 0, cash: session.economics?.cash,
      }
    }

    // Flow strength + bottlenecks for the scene
    const ref = lastWeek
    const play = !!live && playback.playing
    const intensity = ref ? {
      people: Math.min(1, 0.35 + 0.65 * Math.min(1, (ref.gross_demand || 0) / Math.max(1, ref.staff_capacity || 1))),
      goods: Math.min(1, 0.25 + 0.75 * ((ref.served_demand || 0) / Math.max(1, ref.gross_demand || 1))),
      money: ref.revenue > 0 ? Math.min(1, 0.4 + 0.6 * Math.max(0, ref.net_profit) / Math.max(1, ref.revenue)) : 0.1,
      labor: Math.min(1, (ref.labor_strain_index || 0) / 1.5),
      info: lv.ad_spend > 0 ? Math.min(1, 0.3 + lv.ad_spend / ((session.economics?.marketing_scale_k || 300) * 2)) : 0.08,
    } : { people: 0.2, goods: 0.2, money: 0.15, labor: 0.2, info: 0.1 }
    const alerts = ref ? {
      people: ref.turned_away > 0.15 * Math.max(1, ref.gross_demand),
      labor: ref.labor_strain_index > 1.25,
      money: ref.in_crunch,
      goods: !!(ref.shock_hit && play && f < 0.4),
    } : {}

    const dayIdx = Math.min(6, Math.floor(f * 7))
    return { f, base, live, weeksDone, lastWeek, scores, v, metrics, intensity, alerts, points, dayIdx, play }
  }, [session, pending, prevSession, playback.playing, playback.progress, levers, subs, t])

  const events = useMemo(() => {
    if (!view) return []
    const weeks = view.live && !playback.playing ? [...view.weeksDone, view.live] : view.weeksDone
    const history = pending && !playback.playing ? [...(view.base.lever_history || []), pending.levers] : view.base.lever_history || []
    return buildEvents(weeks, history, session?.viability_baseline)
  }, [view, pending, playback.playing, session])

  /* ── Loading / error ───────────────────────────────────────────── */
  if (loadError) {
    return (
      <div className="sim-root" style={{ display: 'grid', placeItems: 'center' }}>
        <div className="sim-panel" style={{ maxWidth: 420, textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>{t('simulate.load_failed_title')}</h2>
          <p className="sim-empty" style={{ marginBottom: 14 }}>{t('simulate.load_failed_body')}</p>
          <div className="sim-summary-actions">
            <button className="sim-play" onClick={load}>{t('simulate.retry')}</button>
            <button className="sim-ghost-btn" onClick={() => navigate('/ideas')}>{t('simulate.exit')}</button>
          </div>
        </div>
      </div>
    )
  }
  if (!session || !view) {
    return (
      <div className="sim-root" style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'Syne', fontWeight: 700 }}>
          <Loader2 size={20} className="sim-spin" /> {t('simulate.loading')}
        </div>
      </div>
    )
  }

  const finished = session.status === 'completed' && !pending
  const weekNumber = Math.min(session.horizon_weeks, (view.base.current_week || 0) + 1)
  const fmtUnits = (n) => fmtInt(n)
  const values = {
    bought: t('simulate.node_bought', { n: fmtInt(view.metrics.bought) }),
    stock: t('simulate.node_stock', { n: fmtInt(view.metrics.stock) }),
    served: t('simulate.node_served', { n: fmtInt(view.metrics.served) }),
    demand: t('simulate.node_demand', { n: fmtInt(view.metrics.demand) }),
    staff: t('simulate.node_staff', { n: view.metrics.staff }),
    ad: fmtK(view.metrics.ad),
    revenue: fmtK(view.metrics.revenue),
  }
  const tips = playback.playing
    ? [{ kind: 'watch', text: t('simulate.advisor_watching') }]
    : (view.lastWeek?.advice?.length ? view.lastWeek.advice : [])
  const deltaV = view.v - session.viability_baseline
  const playLabel = finished ? t('simulate.finished') : busy ? t('simulate.playing') : t('simulate.play_week', { week: weekNumber })
  const renderPlay = (mini) => (
    <button className={`sim-play${mini ? ' is-mini' : ''}`} onClick={play} disabled={busy || finished}
      aria-label={playLabel}>
      {busy ? <span className="sim-play-pulse" /> : <Play size={mini ? 14 : 17} fill="currentColor" />}
      {mini ? (busy ? t('simulate.playing_short') : `W${weekNumber}`) : playLabel}
    </button>
  )
  const sparkline = (() => {
    const cs = view.points.map(p => p.cash)
    if (cs.length < 2) return ''
    const lo = Math.min(...cs), hi = Math.max(...cs), span = hi - lo || 1
    return cs.map((c, i) => `${(i / (cs.length - 1)) * 64},${20 - ((c - lo) / span) * 18}`).join(' ')
  })()

  return (
    <div className="sim-root" data-mtab={mtab}>
      {/* ── Desktop / tablet HUD ─────────────────────────────── */}
      <header className="sim-hud">
        <div className="sim-panel sim-gauge-card">
          <Gauge value={session.viability_baseline} label={t('simulate.gauge_initial')} caption={t('simulate.gauge_initial_caption')} />
        </div>
        <div className="sim-panel sim-hud-centre">
          <div className="sim-hud-top">
            <div className="sim-hud-title">
              <div className="sim-eyebrow">{t('simulate.eyebrow')}{simApi.demo ? ` · ${t('simulate.demo_badge')}` : ''}</div>
              <h1>{session.idea.name}</h1>
              <div className="sim-hud-meta">
                {session.idea.category && <span className="sim-chip is-category">{session.idea.category.replace(/_/g, ' ')}</span>}
                <span className="sim-chip is-muted sim-num">{t('simulate.week_of', { week: weekNumber, total: session.horizon_weeks })}</span>
                <span className="sim-num">{t('simulate.cash_on_hand', { amount: fmtK(view.metrics.cash) })}</span>
              </div>
            </div>
            <div className="sim-hud-actions">
              <button className="sim-iconbtn" onClick={toggle} aria-label={t('simulate.toggle_theme')}>{isDark ? <Sun size={16} /> : <Moon size={16} />}</button>
              <button className="sim-iconbtn" onClick={() => navigate('/ideas')} aria-label={t('simulate.exit')}><LogOut size={16} /></button>
              {renderPlay(false)}
            </div>
          </div>
          <AdvisorHead tips={tips} name={t('simulate.advisor_name')} intro={t('simulate.advisor_intro')} />
        </div>
        <div className="sim-panel sim-gauge-card">
          <Gauge value={view.v} live={playback.playing} marker={session.viability_baseline} label={t('simulate.gauge_live')}
            caption={<span className={deltaV >= 0 ? 'sim-good' : 'sim-bad'}>{t('simulate.gauge_delta', { d: `${deltaV >= 0 ? '+' : ''}${deltaV.toFixed(2)}` })}</span>} />
        </div>
      </header>

      {/* ── Mobile HUD ───────────────────────────────────────── */}
      <header className="sim-hud-mini">
        <div className="sim-mini-row">
          <button className="sim-iconbtn" onClick={() => navigate('/ideas')} aria-label={t('simulate.exit')}><LogOut size={16} /></button>
          <div className="sim-mini-title">
            <h1>{session.idea.name}</h1>
            <div className="sim-num">{t('simulate.week_of', { week: weekNumber, total: session.horizon_weeks })} · {fmtK(view.metrics.cash)}</div>
          </div>
          <button className="sim-iconbtn" onClick={toggle} aria-label={t('simulate.toggle_theme')}>{isDark ? <Sun size={16} /> : <Moon size={16} />}</button>
          {renderPlay(true)}
        </div>
        <div className="sim-mini-gauges">
          <div className="sim-mini-gauge">
            <Gauge mini value={session.viability_baseline} label={t('simulate.gauge_initial')} />
            <div><div className="sim-eyebrow">{t('simulate.gauge_initial')}</div><strong>{session.viability_baseline.toFixed(2)}</strong></div>
          </div>
          <div className="sim-mini-gauge">
            <Gauge mini value={view.v} live={playback.playing} marker={session.viability_baseline} label={t('simulate.gauge_live')} />
            <div><div className="sim-eyebrow">{t('simulate.gauge_live')}</div><strong className={deltaV >= 0 ? 'sim-good' : 'sim-bad'}>{view.v.toFixed(2)}</strong></div>
          </div>
        </div>
        {playback.playing && (
          <div className="sim-mini-progress">
            <div className="sim-progress-bar"><div className="sim-progress-fill" style={{ width: `${playback.progress * 100}%` }} /></div>
            <svg viewBox="0 0 64 22" aria-hidden="true"><polyline points={sparkline} fill="none" style={{ stroke: 'var(--teal)' }} strokeWidth="1.8" /></svg>
          </div>
        )}
      </header>
      <div className={`sim-panel sim-advisor-strip sim-m-play${advisorOpen ? '' : ' is-collapsed'}`}>
        <AdvisorHead compact tips={tips} name={t('simulate.advisor_name')} intro={t('simulate.advisor_intro')}
          collapsed={!advisorOpen} onToggle={() => setAdvisorOpen(o => !o)} />
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <main className="sim-body">
        <aside className="sim-col sim-col-left">
          <ScoreBreakdown baseline={session.baseline_scores} running={view.scores} />
          <EventLog events={events} />
          <PastSessions rows={past} currentId={session.session_id} />
        </aside>

        <section className="sim-col sim-col-centre">
          <div className="sim-panel sim-scene sim-m-play" ref={sceneRef}>
            <div className="sim-panel-head">
              <div className="sim-panel-title"><Activity size={16} /> {t('simulate.scene_title')}</div>
              <span className="sim-eyebrow">{t('simulate.scene_legend')}</span>
            </div>
            <BusinessFlowScene
              category={session.idea.category}
              values={values}
              intensity={view.intensity}
              alerts={view.alerts}
              playing={view.play}
              loading={awaiting}
              loadingLabel={t('simulate.opening_shop')}
              dayLabel={view.play ? t('simulate.scene_day', { day: view.dayIdx + 1, name: t(`simulate.day_${DAY_KEYS[view.dayIdx]}`) })
                : finished ? t('simulate.progress_done') : t('simulate.week_of', { week: weekNumber, total: session.horizon_weeks })}
              shock={view.live?.shock_hit ? { name: view.live.shock_name, active: view.play && view.f < 0.45,
                lostLabel: t('simulate.shock_hit_chip', { name: view.live.shock_name, units: fmtInt(view.live.units_lost) }) } : null}
              ariaLabel={t('simulate.scene_aria', { name: session.idea.name })}
            />
          </div>

          <div className="sim-m-play">
            <ShockBanner shock={pending ? (prevSession || session).next_shock : session.next_shock}
              result={finished ? view.lastWeek : null}
              playing={playback.playing} fmtUnits={fmtUnits} />
          </div>

          {finished ? (
            <div className="sim-panel sim-summary sim-m-play">
              <Trophy size={30} style={{ color: deltaV >= 0 ? 'var(--gold)' : 'var(--muted)' }} />
              <h2>{t('simulate.summary_title')}</h2>
              <p className="sim-empty">{deltaV >= 0.25 ? t('simulate.summary_better') : deltaV <= -0.25 ? t('simulate.summary_worse') : t('simulate.summary_same')}</p>
              <div className="sim-summary-v">
                <span style={{ fontSize: 26, color: 'var(--muted)' }} className="sim-num">{session.viability_baseline.toFixed(2)}</span>
                <span style={{ color: 'var(--faint)' }}>→</span>
                <span style={{ fontSize: 40 }} className="sim-num">{session.running_viability.toFixed(2)}</span>
                <span className={`sim-chip ${deltaV >= 0 ? 'is-green' : 'is-red'}`}>{deltaV >= 0 ? '+' : ''}{deltaV.toFixed(2)}</span>
              </div>
              <div className="sim-hud-meta" style={{ justifyContent: 'center' }}>
                {t('simulate.summary_cash', { from: fmtK(session.economics.initial_cash), to: fmtK(session.economics.cash) })}
              </div>
              <div className="sim-summary-actions">
                <label className="sim-ghost-btn" style={{ cursor: 'default' }}>
                  {t('simulate.new_run_weeks')}
                  <select value={newHorizon} onChange={e => setNewHorizon(Number(e.target.value))}
                    style={{ background: 'transparent', color: 'var(--text)', border: 'none', fontWeight: 700, fontFamily: 'inherit' }}>
                    {[4, 8, 12].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <button className="sim-play" onClick={restart}><RotateCcw size={16} /> {t('simulate.new_run')}</button>
                <button className="sim-ghost-btn" onClick={() => navigate('/ideas')}>{t('simulate.exit')}</button>
              </div>
            </div>
          ) : (
            <LeverDeck levers={levers} onChange={setLevers} economics={view.base.economics} subProducts={subs}
              scores={view.base.running_scores} disabled={awaiting} playing={playback.playing} onPlay={play}
              weekNumber={weekNumber} finished={finished} />
          )}

          <WeekProgress horizon={session.horizon_weeks} played={view.base.current_week + (pending && !playback.playing ? 1 : 0)}
            weeks={pending && !playback.playing ? [...view.weeksDone, pending.week] : view.weeksDone}
            playing={playback.playing} progress={playback.progress} />
        </section>

        <aside className="sim-col sim-col-right">
          <LiveCharts points={view.points} initialCash={session.economics?.initial_cash ?? 0} />
        </aside>
      </main>

      {/* ── Mobile tab bar ───────────────────────────────────── */}
      <nav className="sim-tabs" aria-label={t('simulate.tabs_label')}>
        {[
          { id: 'play', Icon: Gamepad2, label: t('simulate.tab_play') },
          { id: 'charts', Icon: Activity, label: t('simulate.tab_charts'), dot: playback.playing },
          { id: 'scores', Icon: BarChart3, label: t('simulate.tab_scores') },
          { id: 'log', Icon: ScrollText, label: t('simulate.tab_log') },
        ].map(({ id, Icon, label, dot }) => (
          <button key={id} className={`sim-tab${mtab === id ? ' is-active' : ''}`}
            onClick={() => { setMtab(id); window.scrollTo({ top: 0 }) }}
            aria-current={mtab === id ? 'page' : undefined}>
            <Icon size={18} /> {label}
            {dot && mtab !== id && <span className="sim-tab-dot" />}
          </button>
        ))}
      </nav>
    </div>
  )
}
