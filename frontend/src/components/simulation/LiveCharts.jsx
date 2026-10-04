import React, { useEffect, useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts'
import { Wallet, Users, TrendingUp } from 'lucide-react'
import { useT } from '../../context/TranslationContext'
import { useTheme } from '../../hooks/useTheme'
import { fmtK, fmtInt } from './LeverDeck'

const TOKENS = ['--teal', '--gold', '--violet', '--green', '--red', '--muted', '--border', '--blue']

/* Resolve theme tokens to concrete colours (recharts writes SVG attributes). */
function useThemeColors() {
  const { theme } = useTheme()
  const [c, setC] = useState({})
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement)
    setC(Object.fromEntries(TOKENS.map(k => [k.slice(2), cs.getPropertyValue(k).trim() || '#888'])))
  }, [theme])
  return c
}

function compact(v) {
  const a = Math.abs(v)
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (a >= 1e3) return `${(v / 1e3).toFixed(0)}k`
  return `${Math.round(v)}`
}

function Tip({ active, payload, label, money }) {
  if (!active || !payload?.length) return null
  return (
    <div className="sim-tooltip">
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{payload[0]?.payload?.label || label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="sim-num" style={{ color: p.color }}>
          {p.name}: {money ? fmtK(p.value) : fmtInt(p.value)}
        </div>
      ))}
    </div>
  )
}

function Chart({ title, Icon, value, delta, deltaGood, children, legend }) {
  return (
    <div className="sim-chart">
      <div className="sim-chart-head">
        <div className="sim-panel-title"><Icon size={15} /> {title}</div>
        {legend}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="sim-chart-value">{value}</span>
        {delta && <span className={`sim-chart-delta ${deltaGood ? 'sim-good' : 'sim-bad'}`}>{delta}</span>}
      </div>
      <div className="sim-chart-box">{children}</div>
    </div>
  )
}

/**
 * points: [{ i, label, week, cash, demand, served, profit }] — one per day,
 * growing live while a week plays.
 */
export default function LiveCharts({ points = [], initialCash = 0 }) {
  const { t } = useT()
  const c = useThemeColors()
  const last = points[points.length - 1]
  const cash = last?.cash ?? initialCash
  const profit = last?.profit ?? 0
  const thisWeek = points.filter(p => p.week === last?.week)
  const wkDemand = thisWeek.reduce((s, p) => s + p.demand, 0)
  const wkServed = thisWeek.reduce((s, p) => s + p.served, 0)
  const data = points.length ? points : [{ i: 0, label: t('simulate.chart_start'), cash: initialCash, demand: 0, served: 0, profit: 0 }]
  const grid = <CartesianGrid stroke={c.border} strokeDasharray="3 5" vertical={false} />
  const axisProps = {
    tick: { fill: c.muted, fontSize: 10 }, axisLine: false, tickLine: false,
  }
  const weekTicks = data.filter(p => p.dayIndex === 1).map(p => p.i)
  const xAxis = <XAxis dataKey="i" type="number" domain={['dataMin', 'dataMax']} ticks={weekTicks}
    tickFormatter={i => data.find(p => p.i === i)?.weekLabel || ''} {...axisProps} />

  return (
    <div className="sim-panel sim-m-charts">
      <Chart title={t('simulate.chart_cash')} Icon={Wallet} value={fmtK(cash)}
        delta={`${cash - initialCash >= 0 ? '+' : ''}${fmtK(cash - initialCash)}`} deltaGood={cash >= initialCash}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="simCash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.teal} stopOpacity={0.45} />
                <stop offset="100%" stopColor={c.teal} stopOpacity={0} />
              </linearGradient>
            </defs>
            {grid}{xAxis}
            <YAxis width={40} tickFormatter={compact} {...axisProps} />
            <Tooltip content={<Tip money />} />
            <ReferenceLine y={initialCash} stroke={c.muted} strokeDasharray="4 4" />
            <Area type="monotone" dataKey="cash" name={t('simulate.chart_cash')} stroke={c.teal} strokeWidth={2.2}
              fill="url(#simCash)" isAnimationActive={false} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Chart>

      <Chart title={t('simulate.chart_demand')} Icon={Users}
        value={`${fmtInt(wkServed)} / ${fmtInt(wkDemand)}`}
        delta={wkDemand ? t('simulate.chart_served_pct', { pct: Math.round((wkServed / wkDemand) * 100) }) : null}
        deltaGood={wkDemand ? wkServed / wkDemand >= 0.85 : true}
        legend={<div className="sim-legend">
          <span><i style={{ background: c.violet }} />{t('simulate.chart_wanted')}</span>
          <span><i style={{ background: c.teal }} />{t('simulate.chart_served')}</span>
        </div>}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="simDem" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.violet} stopOpacity={0.35} />
                <stop offset="100%" stopColor={c.violet} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="simSrv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.teal} stopOpacity={0.45} />
                <stop offset="100%" stopColor={c.teal} stopOpacity={0} />
              </linearGradient>
            </defs>
            {grid}{xAxis}
            <YAxis width={40} tickFormatter={compact} {...axisProps} />
            <Tooltip content={<Tip />} />
            <Area type="monotone" dataKey="demand" name={t('simulate.chart_wanted')} stroke={c.violet} strokeWidth={2}
              fill="url(#simDem)" isAnimationActive={false} dot={false} />
            <Area type="monotone" dataKey="served" name={t('simulate.chart_served')} stroke={c.teal} strokeWidth={2.2}
              fill="url(#simSrv)" isAnimationActive={false} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Chart>

      <Chart title={t('simulate.chart_profit')} Icon={TrendingUp} value={fmtK(profit)}
        delta={t('simulate.chart_session_total')} deltaGood={profit >= 0}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="simProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={profit >= 0 ? c.green : c.red} stopOpacity={0.4} />
                <stop offset="100%" stopColor={profit >= 0 ? c.green : c.red} stopOpacity={0} />
              </linearGradient>
            </defs>
            {grid}{xAxis}
            <YAxis width={40} tickFormatter={compact} {...axisProps} />
            <Tooltip content={<Tip money />} />
            <ReferenceLine y={0} stroke={c.muted} strokeDasharray="4 4" />
            <Area type="monotone" dataKey="profit" name={t('simulate.chart_profit')} stroke={profit >= 0 ? c.green : c.red}
              strokeWidth={2.2} fill="url(#simProfit)" isAnimationActive={false} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Chart>
    </div>
  )
}
