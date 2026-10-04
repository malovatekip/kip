import React from 'react'
import { BarChart3, ScrollText, History, CloudLightning, ShieldCheck, UserX, Flame, TriangleAlert,
         Settings2, TrendingUp, TrendingDown } from 'lucide-react'
import { useT } from '../../context/TranslationContext'
import { fmtK, fmtInt } from './LeverDeck'

const SCORE_KEYS = ['D', 'F', 'C', 'E', 'R', 'S', 'A']

/* 7 viability factors: bar = live value, notch = baseline. */
export function ScoreBreakdown({ baseline = {}, running = {} }) {
  const { t } = useT()
  return (
    <div className="sim-panel sim-m-scores">
      <div className="sim-panel-head">
        <div className="sim-panel-title"><BarChart3 size={16} /> {t('simulate.scores_title')}</div>
        <span className="sim-eyebrow">{t('simulate.scores_scale')}</span>
      </div>
      {SCORE_KEYS.map(k => {
        const b = Number(baseline[k] ?? 0), v = Number(running[k] ?? b)
        const d = v - b
        const color = Math.abs(d) < 0.05 ? 'var(--blue)' : d > 0 ? 'var(--green)' : 'var(--red)'
        return (
          <div className="sim-score" key={k}>
            <span className="sim-score-name">{t(`simulate.score_${k}`)}</span>
            <div className="sim-score-track" title={`${t('simulate.baseline')}: ${b.toFixed(2)}`}>
              <div className="sim-score-fill" style={{ width: `${Math.max(2, v * 10)}%`, background: color }} />
              <div className="sim-score-base" style={{ left: `calc(${b * 10}% - 1px)` }} />
            </div>
            <span className="sim-score-val">
              {v.toFixed(1)}
              {Math.abs(d) >= 0.05 && <span className="sim-score-delta" style={{ color }}>{d > 0 ? '+' : ''}{d.toFixed(1)}</span>}
            </span>
          </div>
        )
      })}
    </div>
  )
}

const LOG_ICONS = { decision: Settings2, shock_hit: CloudLightning, shock_avoided: ShieldCheck, turned_away: UserX,
  burnout: Flame, crunch: TriangleAlert, v_up: TrendingUp, v_down: TrendingDown }

/* Build the event feed (newest first) from played weeks + the decisions taken. */
export function buildEvents(weeks = [], leverHistory = [], baselineV) {
  const out = []
  let prevV = baselineV
  weeks.forEach((w, i) => {
    const lv = leverHistory[i] || {}
    const subs = (lv.product_mix_selections || []).length
    out.push({ kind: 'decision', tone: 'info', week: w.week, key: 'simulate.log_decision',
      params: { price: fmtK(lv.price), units: fmtInt(lv.stock_ordered), ads: fmtK(lv.ad_spend),
        staff: lv.staffing_change > 0 ? `+${lv.staffing_change}` : `${lv.staffing_change || 0}`, subs } })
    if (w.shock_name && w.shock_name !== 'Calm week') {
      out.push(w.shock_hit
        ? { kind: 'shock_hit', tone: 'bad', week: w.week, key: 'simulate.log_shock_hit', params: { name: w.shock_name, units: fmtInt(w.units_lost) } }
        : { kind: 'shock_avoided', tone: 'good', week: w.week, key: 'simulate.log_shock_avoided', params: { name: w.shock_name } })
    }
    if (w.turned_away > 0.1 * Math.max(1, w.gross_demand)) {
      out.push({ kind: 'turned_away', tone: 'warn', week: w.week, key: 'simulate.log_turned_away', params: { n: fmtInt(w.turned_away) } })
    }
    if (w.labor_strain_index > 1.25) {
      out.push({ kind: 'burnout', tone: 'bad', week: w.week, key: 'simulate.log_burnout', params: { x: w.labor_strain_index.toFixed(2) } })
    }
    if (w.in_crunch) {
      out.push({ kind: 'crunch', tone: 'bad', week: w.week, key: 'simulate.log_crunch', params: { x: w.liquidity_ratio.toFixed(2) } })
    }
    const v = w.running_viability
    if (prevV != null && Math.abs(v - prevV) >= 0.01) {
      out.push({ kind: v > prevV ? 'v_up' : 'v_down', tone: v > prevV ? 'good' : 'bad', week: w.week,
        key: 'simulate.log_viability', params: { from: prevV.toFixed(2), to: v.toFixed(2) } })
    }
    prevV = v
  })
  return out.reverse()
}

export function EventLog({ events = [] }) {
  const { t } = useT()
  return (
    <div className="sim-panel sim-m-log">
      <div className="sim-panel-head">
        <div className="sim-panel-title"><ScrollText size={16} /> {t('simulate.log_title')}</div>
      </div>
      {events.length === 0 ? <div className="sim-empty">{t('simulate.log_empty')}</div> : (
        <div className="sim-log" aria-live="polite">
          {events.map((ev, i) => {
            const Icon = LOG_ICONS[ev.kind] || Settings2
            return (
              <div className="sim-log-item" key={`${ev.week}-${ev.kind}-${i}`}>
                <span className={`sim-log-icon tone-${ev.tone}`}><Icon size={14} /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="sim-log-week">{t('simulate.week_short', { week: ev.week })}</div>
                  <div>{t(ev.key, ev.params)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function PastSessions({ rows = [], currentId }) {
  const { t } = useT()
  const done = rows.filter(r => r.status === 'completed' && r.session_id !== currentId)
  return (
    <div className="sim-panel sim-m-scores">
      <div className="sim-panel-head">
        <div className="sim-panel-title"><History size={16} /> {t('simulate.past_title')}</div>
      </div>
      {done.length === 0 ? <div className="sim-empty">{t('simulate.past_empty')}</div> : (
        <div className="sim-past">
          {done.slice(0, 6).map(r => {
            const d = (r.viability_simulated ?? 0) - (r.viability_baseline ?? 0)
            return (
              <div className="sim-past-row" key={r.session_id}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-ZM', { day: 'numeric', month: 'short' }) : '—'}
                    <span style={{ color: 'var(--muted)', fontWeight: 500 }}> · {t('simulate.past_weeks', { n: r.horizon_weeks })}</span></div>
                  <div style={{ color: 'var(--muted)', fontSize: 11 }}>{t('simulate.past_cash', { amount: fmtK(r.ending_cash) })}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="sim-past-v">{(r.viability_simulated ?? 0).toFixed(2)}</div>
                  <div className={d >= 0 ? 'sim-good' : 'sim-bad'} style={{ fontSize: 11, fontWeight: 700 }}>{d >= 0 ? '+' : ''}{d.toFixed(2)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
