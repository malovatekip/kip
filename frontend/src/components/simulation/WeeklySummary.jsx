import React from 'react'
import { Users, Check, X, Wallet, TrendingUp, TrendingDown, CloudLightning, ShieldCheck, Sun, Sparkles } from 'lucide-react'
import { useT } from '../../context/TranslationContext'
import { fmtK, fmtInt } from './LeverDeck'

/**
 * Plain-language recap of the week in play (or the last played week): how many
 * customers came, how many were served or turned away, profit and cash, and the
 * shock result. Reads the numbers SimulatePage already computed — no logic of its
 * own — so an average user can read what happened without the charts or factors.
 *
 * `week`  the live/last week trace (null before week 1)
 */
export default function WeeklySummary({ week }) {
  const { t } = useT()

  if (!week) {
    return (
      <div className="sim-panel sim-summary-week sim-m-play">
        <div className="sim-panel-head">
          <div className="sim-panel-title"><Sparkles size={16} /> {t('simulate.sum_title')}</div>
        </div>
        <p className="sim-empty">{t('simulate.sum_prompt')}</p>
      </div>
    )
  }

  const demand = week.gross_demand ?? 0
  const served = week.served_demand ?? 0
  const turned = week.turned_away ?? Math.max(0, demand - served)
  const profit = week.net_profit ?? 0
  const cash = week.cash_balance ?? 0
  const profitUp = profit >= 0

  let shock = null
  if (week.shock_name && week.shock_name !== 'Calm week') {
    shock = week.shock_hit
      ? { Icon: CloudLightning, tone: 'bad', text: t('simulate.shock_hit_sub', { units: fmtInt(week.units_lost || 0) }) }
      : { Icon: ShieldCheck, tone: 'good', text: t('simulate.shock_avoided_title', { name: week.shock_name }) }
  } else {
    shock = { Icon: Sun, tone: 'info', text: t('simulate.shock_calm_result') }
  }

  return (
    <div className="sim-panel sim-summary-week sim-m-play">
      <div className="sim-panel-head">
        <div className="sim-panel-title"><Sparkles size={16} /> {t('simulate.sum_title_wk', { week: week.week })}</div>
      </div>

      <div className="sim-sumw-row">
        <span className="sim-sumw-icon tone-info"><Users size={16} /></span>
        <span className="sim-sumw-text">{t('simulate.sum_came', { n: fmtInt(demand) })}</span>
      </div>

      <div className="sim-sumw-split">
        <div className="sim-sumw-stat tone-good">
          <Check size={15} /><strong>{fmtInt(served)}</strong><span>{t('simulate.sum_served_label')}</span>
        </div>
        <div className={`sim-sumw-stat ${turned > 0 ? 'tone-bad' : 'tone-muted'}`}>
          <X size={15} /><strong>{fmtInt(turned)}</strong><span>{t('simulate.sum_turned_label')}</span>
        </div>
      </div>

      <div className="sim-sumw-split">
        <div className={`sim-sumw-stat ${profitUp ? 'tone-good' : 'tone-bad'}`}>
          {profitUp ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
          <strong>{fmtK(Math.abs(profit))}</strong>
          <span>{profitUp ? t('simulate.sum_profit_label') : t('simulate.sum_loss_label')}</span>
        </div>
        <div className="sim-sumw-stat tone-info">
          <Wallet size={15} /><strong>{fmtK(cash)}</strong><span>{t('simulate.sum_cash_label')}</span>
        </div>
      </div>

      {shock && (
        <div className="sim-sumw-row sim-sumw-shock">
          <span className={`sim-sumw-icon tone-${shock.tone}`}><shock.Icon size={16} /></span>
          <span className="sim-sumw-text">{shock.text}</span>
        </div>
      )}
    </div>
  )
}
