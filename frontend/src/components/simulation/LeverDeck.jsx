import React, { useMemo } from 'react'
import { Tag, Megaphone, Boxes, Users, Layers, Wallet, Minus, Plus, Check, Play } from 'lucide-react'
import { useT } from '../../context/TranslationContext'

const CORE = '__core__'

export const fmtK = (n) => {
  const v = Number(n) || 0
  const a = Math.abs(v)
  const s = a >= 1e6 ? `${(a / 1e6).toFixed(2)}M` : a >= 1e4 ? `${(a / 1e3).toFixed(1)}k` : Math.round(a).toLocaleString('en')
  return `${v < 0 ? '-' : ''}K${s}`
}
export const fmtInt = (n) => Math.round(Number(n) || 0).toLocaleString('en')
const pct = (x) => `${x >= 0 ? '+' : ''}${Math.round(x * 100)}%`

function niceStep(max) {
  if (max <= 50) return 1
  if (max <= 500) return 5
  if (max <= 5000) return 10
  return 50
}

function Stepper({ value, onChange, step = 1, min = 0, max = Infinity, disabled, label }) {
  const set = (v) => onChange(Math.max(min, Math.min(max, Math.round(v))))
  return (
    <div className="sim-stepper">
      <button type="button" className="sim-step-btn" disabled={disabled || value <= min}
        onClick={() => set(value - step)} aria-label={`${label} −`}><Minus size={14} /></button>
      <input className="sim-step-input" type="number" inputMode="numeric" value={value} disabled={disabled}
        aria-label={label} onChange={e => set(Number(e.target.value) || 0)} />
      <button type="button" className="sim-step-btn" disabled={disabled || value >= max}
        onClick={() => set(value + step)} aria-label={`${label} +`}><Plus size={14} /></button>
    </div>
  )
}

function Group({ id, icon: Icon, title, value, wide, children }) {
  return (
    <details className={`sim-lever${wide ? ' is-wide' : ''}`} open id={id}>
      <summary className="sim-lever-head" style={{ listStyle: 'none', cursor: 'pointer' }}>
        <span className="sim-lever-name"><Icon size={15} /> {title}</span>
        <span className="sim-lever-value">{value}</span>
      </summary>
      {children}
    </details>
  )
}

/**
 * Weekly decisions. `levers` = { price, ad_spend, stock_ordered, staffing_change, mix: {name: units} }.
 * Previews use the same formulas as the engine (elasticity, marketing curve,
 * staff capacity) so the player sees the likely effect before committing.
 */
export default function LeverDeck({ levers, onChange, economics, subProducts = [], scores, disabled, playing,
  onPlay, weekNumber, finished }) {
  const { t } = useT()
  const e = economics || {}
  const P = e.average_unit_price || 0
  const set = (patch) => onChange({ ...levers, ...patch })
  const mix = levers.mix || {}

  const preview = useMemo(() => {
    const price = levers.price || P
    const beta = e.base_elasticity ?? 1
    const Mp = price > 0 && P > 0 ? Math.pow(P / price, beta) : 1
    const A = scores?.A ?? 5
    const k = e.marketing_scale_k || 300
    const Mm = 1 + Math.log(1 + Math.max(0, levers.ad_spend) / k) * (A / 10)
    const chosen = subProducts.filter(s => mix[s.sub_product_name] != null)
    const mixBoost = chosen.reduce((s, x) => s + (Number(x.demand_expansion_factor) || 0), 0)
    const baseWeekly = ((e.total_target_buyers || 0) * (e.consumption_frequency_per_year || 0)) / 52
    const expected = baseWeekly * Mm * (1 + mixBoost) * Mp
    const staffAfter = Math.max(0, (e.staff_count || 1) + (levers.staffing_change || 0))
    const capacity = staffAfter * (e.worker_throughput_weekly || 0) * ((scores?.E ?? 5) / 10)
    const coreCost = e.core_unit_cost || 0
    const subCost = chosen.reduce((s, x) => s + (Number(mix[x.sub_product_name]) || 0) * (Number(x.base_cost) || 0), 0)
    const procurement = (levers.stock_ordered || 0) * coreCost + subCost
    const wages = staffAfter * (e.weekly_wage_per_worker || 0)
    const fixed = (e.weekly_rent || 0) + wages + Math.max(0, levers.ad_spend || 0)
    const onHand = Object.values(e.inventory || {}).reduce((s, v) => s + (Number(v) || 0), 0)
    const unitsBought = (levers.stock_ordered || 0) + chosen.reduce((s, x) => s + (Number(mix[x.sub_product_name]) || 0), 0)
    return {
      Mp, Mm, expected, capacity, staffAfter, wages, procurement, fixed,
      needed: procurement + fixed, available: onHand + unitsBought,
      margin: price > 0 ? (price - coreCost) / price : 0, mixBoost,
    }
  }, [levers, e, P, scores, subProducts, mix])

  const cash = e.cash ?? 0
  const over = preview.needed > cash
  const share = cash > 0 ? Math.min(1, preview.needed / cash) : 1
  const priceMin = Math.max(1, Math.round(P * 0.5))
  const priceMax = Math.max(priceMin + 1, Math.round(P * 2))
  const adMax = Math.max(1000, Math.round((e.marketing_scale_k || 300) * 4))
  const stockMax = Math.max(100, Math.round(Math.max(preview.expected, preview.capacity) * 3))
  const carried = e.inventory?.[CORE] || 0

  const toggleSub = (s) => {
    const next = { ...mix }
    if (next[s.sub_product_name] != null) delete next[s.sub_product_name]
    else next[s.sub_product_name] = Math.max(10, Math.round(preview.expected * 0.1))
    set({ mix: next })
  }

  if (finished) return null
  const lock = disabled || playing

  return (
    <div className={`sim-panel sim-m-play${lock ? ' sim-locked' : ''}`} aria-busy={playing}>
      <div className="sim-panel-head">
        <div className="sim-panel-title"><Layers size={16} /> {t('simulate.levers_title', { week: weekNumber })}</div>
        {playing && <span className="sim-chip is-muted">{t('simulate.levers_locked')}</span>}
      </div>

      <div className="sim-levers">
        <Group id="lever-price" icon={Tag} title={t('simulate.lever_price')} value={fmtK(levers.price)}>
          <input type="range" className="sim-range" min={priceMin} max={priceMax} step={niceStep(priceMax) > 5 ? 5 : 1}
            value={levers.price} disabled={lock} aria-label={t('simulate.lever_price')}
            onChange={ev => set({ price: Number(ev.target.value) })} />
          <div className="sim-lever-hint">
            <span>{t('simulate.hint_margin', { pct: Math.round(preview.margin * 100) })}</span>
            <span className={preview.Mp >= 1 ? 'sim-good' : 'sim-bad'}>{t('simulate.hint_customers', { pct: pct(preview.Mp - 1) })}</span>
          </div>
        </Group>

        <Group id="lever-ads" icon={Megaphone} title={t('simulate.lever_ads')} value={fmtK(levers.ad_spend)}>
          <input type="range" className="sim-range" min={0} max={adMax} step={adMax > 2000 ? 50 : 10}
            value={levers.ad_spend} disabled={lock} aria-label={t('simulate.lever_ads')}
            onChange={ev => set({ ad_spend: Number(ev.target.value) })} />
          <div className="sim-lever-hint">
            <span className={preview.Mm > 1.001 ? 'sim-good' : ''}>{t('simulate.hint_reach', { pct: pct(preview.Mm - 1) })}</span>
            <span>{t('simulate.hint_ads_curve')}</span>
          </div>
        </Group>

        <Group id="lever-stock" icon={Boxes} title={t('simulate.lever_stock')} value={fmtInt(levers.stock_ordered)}>
          <Stepper value={levers.stock_ordered} step={niceStep(stockMax)} max={stockMax * 2} disabled={lock}
            label={t('simulate.lever_stock')} onChange={v => set({ stock_ordered: v })} />
          <div className="sim-lever-hint">
            <span>{t('simulate.hint_cost', { amount: fmtK((levers.stock_ordered || 0) * (e.core_unit_cost || 0)) })}</span>
            <span>{t('simulate.hint_on_hand', { units: fmtInt(carried) })}</span>
          </div>
        </Group>

        <Group id="lever-staff" icon={Users} title={t('simulate.lever_staff')}
          value={t('simulate.staff_value', { n: preview.staffAfter })}>
          <Stepper value={levers.staffing_change} step={1} min={-(e.staff_count || 0)} max={20} disabled={lock}
            label={t('simulate.lever_staff')} onChange={v => set({ staffing_change: v })} />
          <div className="sim-lever-hint">
            <span>{levers.staffing_change > 0 ? t('simulate.hint_hire', { n: levers.staffing_change })
              : levers.staffing_change < 0 ? t('simulate.hint_fire', { n: -levers.staffing_change })
              : t('simulate.hint_keep')}</span>
            <span>{t('simulate.hint_capacity', { n: fmtInt(preview.capacity) })}</span>
          </div>
        </Group>

        {subProducts.length > 0 && (
          <Group id="lever-mix" icon={Layers} title={t('simulate.lever_mix')} wide
            value={preview.mixBoost > 0 ? t('simulate.hint_reach', { pct: pct(preview.mixBoost) }) : '—'}>
            <div className="sim-subs">
              {subProducts.map(s => {
                const on = mix[s.sub_product_name] != null
                const margin = s.suggested_price > 0 ? (s.suggested_price - s.base_cost) / s.suggested_price : 0
                return (
                  <div key={s.sub_product_name} className={`sim-sub${on ? ' is-on' : ''}`}>
                    <button type="button" className="sim-sub-top" disabled={lock} onClick={() => toggleSub(s)}
                      aria-pressed={on} style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                      <span className="sim-sub-name">{s.sub_product_name}</span>
                      <span className="sim-check">{on && <Check size={12} strokeWidth={3} />}</span>
                    </button>
                    <div className="sim-sub-econ">
                      <span>{fmtK(s.base_cost)} → {fmtK(s.suggested_price)}</span>
                      <span>{t('simulate.hint_margin', { pct: Math.round(margin * 100) })}</span>
                      <span>{t('simulate.hint_reach', { pct: pct(Number(s.demand_expansion_factor) || 0) })}</span>
                    </div>
                    {on && (
                      <div>
                        <div className="sim-eyebrow" style={{ marginBottom: 5 }}>{t('simulate.units_to_buy')}</div>
                        <Stepper value={Number(mix[s.sub_product_name]) || 0} step={5} disabled={lock}
                          label={`${s.sub_product_name} ${t('simulate.units_to_buy')}`}
                          onChange={v => set({ mix: { ...mix, [s.sub_product_name]: v } })} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Group>
        )}

        <Group id="lever-budget" icon={Wallet} title={t('simulate.budget_title')} wide value={fmtK(preview.needed)}>
          <div className="sim-budget">
            <div className="sim-budget-bar"><div className={`sim-budget-fill${over ? ' is-over' : ''}`} style={{ width: `${share * 100}%` }} /></div>
            <div className="sim-budget-row">
              <span>{t('simulate.budget_stock', { amount: fmtK(preview.procurement) })}</span>
              <span>{t('simulate.budget_fixed', { amount: fmtK(preview.fixed) })}</span>
              <span className={over ? 'sim-bad' : 'sim-good'}>{t('simulate.budget_cash', { amount: fmtK(cash) })}</span>
            </div>
            <div className="sim-lever-hint">
              <span>{t('simulate.forecast_customers', { n: fmtInt(preview.expected) })}</span>
              <span className={preview.available < preview.expected * 0.85 || preview.capacity < preview.expected * 0.85 ? 'sim-warn' : ''}>
                {t('simulate.forecast_serve', { n: fmtInt(Math.min(preview.available, preview.capacity)) })}
              </span>
            </div>
            {over && <div className="sim-lever-hint"><span className="sim-bad">{t('simulate.budget_over')}</span></div>}
          </div>
        </Group>
      </div>

      <button type="button" className="sim-play is-block" style={{ marginTop: 14 }} onClick={onPlay} disabled={lock}>
        {playing ? <><span className="sim-play-pulse" /> {t('simulate.playing')}</> : <><Play size={16} fill="currentColor" /> {t('simulate.play_week', { week: weekNumber })}</>}
      </button>
    </div>
  )
}
