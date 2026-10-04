import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Activity, ArrowLeft, Play, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import api from '../lib/api'
import { useT } from '../context/TranslationContext'

const SCORE_LABELS = {
  D: 'Demand', F: 'Financial', C: 'Capital Fit',
  E: 'Execution', R: 'Risk', S: 'Competitive', A: 'Asset/Location',
}

function num(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/* ── Delta chip comparing a compiled score against its baseline ── */
function Delta({ before, after }) {
  const d = num(after) - num(before)
  const flat = Math.abs(d) < 0.05
  const color = flat ? 'var(--muted)' : d > 0 ? 'var(--green)' : 'var(--red)'
  const Icon = flat ? Minus : d > 0 ? TrendingUp : TrendingDown
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color, fontSize: 11, fontWeight: 700 }}>
      <Icon size={11} /> {d > 0 ? '+' : ''}{d.toFixed(2)}
    </span>
  )
}

export default function SimulatePage() {
  const { ideaId } = useParams()
  const navigate = useNavigate()
  const { t } = useT()

  const [meta,    setMeta]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [result,  setResult]  = useState(null)

  // Lever form state
  const [price,     setPrice]     = useState(0)
  const [adSpend,   setAdSpend]   = useState(0)
  const [stock,     setStock]     = useState(0)
  const [staffing,  setStaffing]  = useState(0)
  const [horizon,   setHorizon]   = useState(4)
  const [mixIdx,    setMixIdx]    = useState([])   // indexes into allowed_sub_products

  useEffect(() => {
    let alive = true
    api.get(`/simulation/idea/${ideaId}`)
      .then(r => {
        if (!alive) return
        setMeta(r.data)
        setPrice(num(r.data?.default_levers?.price))
        setHorizon(num(r.data?.horizon_weeks, 4))
      })
      .catch(err => toast.error(err.response?.data?.detail || 'Could not load idea'))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [ideaId])

  const toggleMix = (i) =>
    setMixIdx(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])

  const run = async () => {
    setRunning(true)
    try {
      const subs = (meta.allowed_sub_products || []).filter((_, i) => mixIdx.includes(i))
      const { data } = await api.post('/simulation/run', {
        idea_id: Number(ideaId),
        horizon_weeks: num(horizon, 4),
        levers: {
          price: num(price),
          ad_spend: num(adSpend),
          product_mix_selections: subs,
          stock_ordered: Math.round(num(stock)),
          staffing_change: Math.round(num(staffing)),
        },
      })
      setResult(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Simulation failed')
    } finally {
      setRunning(false)
    }
  }

  const field = (label, value, setter, opts = {}) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Syne', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
        {label}
      </label>
      <input type="number" className="kip-input" value={value}
        onChange={e => setter(e.target.value)} style={{ fontSize: 13 }} {...opts} />
    </div>
  )

  return (
    <Layout>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px', position: 'relative', zIndex: 1 }}>
        <button onClick={() => navigate('/ideas')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          color: 'var(--muted)', cursor: 'pointer', fontSize: 12, marginBottom: 16, padding: 0,
        }}>
          <ArrowLeft size={14} /> {t('common.back') || 'Back to Ideas'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Activity size={22} style={{ color: 'var(--blue-bright)' }} />
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, color: 'var(--text)', margin: 0 }}>
            {t('nav.simulate') || 'Simulate'}
          </h1>
        </div>

        {loading ? (
          <div className="shimmer-load" style={{ height: 320, borderRadius: 16 }} />
        ) : !meta ? (
          <div className="kip-card" style={{ padding: 24 }}>Could not load this idea.</div>
        ) : (
          <>
            <p style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginBottom: 2 }}>{meta.idea_name}</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20, textTransform: 'capitalize' }}>
              {(meta.category || '').replace(/_/g, ' ')} · {t('simulate.baseline_viability') || 'Baseline viability'}: <strong style={{ color: 'var(--text)' }}>{num(meta.viability_baseline).toFixed(2)}/10</strong>
            </p>

            {/* ── Lever form ─────────────────────────────── */}
            <div className="kip-card" style={{ padding: 20, marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 14 }}>
                {t('simulate.levers') || 'Your levers'}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
                {field((t('simulate.price') || 'Selling price (K)'), price, setPrice, { min: 0, step: 'any' })}
                {field((t('simulate.ad_spend') || 'Weekly ad spend (K)'), adSpend, setAdSpend, { min: 0, step: 'any' })}
                {field((t('simulate.stock') || 'Stock ordered / week (units)'), stock, setStock, { min: 0, step: 1 })}
                {field((t('simulate.staffing') || 'Staffing change (workers)'), staffing, setStaffing, { step: 1 })}
                {field((t('simulate.horizon') || 'Weeks to simulate'), horizon, setHorizon, { min: 1, max: 52, step: 1 })}
              </div>

              {/* Product mix multi-select */}
              {(meta.allowed_sub_products || []).length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Syne', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
                    {t('simulate.product_mix') || 'Add complement products'}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
                    {meta.allowed_sub_products.map((s, i) => {
                      const on = mixIdx.includes(i)
                      return (
                        <button key={i} onClick={() => toggleMix(i)} style={{
                          textAlign: 'left', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                          background: on ? 'var(--blue-dim)' : 'var(--surface-2, rgba(127,127,127,0.06))',
                          border: `1px solid ${on ? 'rgba(43,127,255,0.5)' : 'var(--border, rgba(127,127,127,0.2))'}`,
                          color: 'var(--text)',
                        }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700 }}>{s.sub_product_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                            K{num(s.base_cost)} → K{num(s.suggested_price)} · +{(num(s.demand_expansion_factor) * 100).toFixed(0)}% reach
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <button onClick={run} disabled={running} className="kip-btn kip-btn-primary"
                style={{ marginTop: 18, fontSize: 14, padding: '11px 22px', opacity: running ? 0.6 : 1 }}>
                <Play size={15} /> {running ? (t('simulate.running') || 'Running…') : (t('simulate.run') || 'Run simulation')}
              </button>
            </div>

            {/* ── Results ─────────────────────────────────── */}
            {result && (
              <div className="kip-card animate-slide-up" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, fontFamily: 'Syne' }}>{t('simulate.baseline_viability') || 'Baseline'}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Syne', color: 'var(--muted)' }}>{num(result.viability_baseline).toFixed(2)}</div>
                  </div>
                  <ArrowRightGlyph />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--blue-bright)', fontWeight: 700, fontFamily: 'Syne' }}>{t('simulate.simulated_viability') || 'Simulated'}</div>
                    <div style={{ fontSize: 34, fontWeight: 800, fontFamily: 'Syne', color: 'var(--text)' }}>{num(result.viability_simulated).toFixed(2)}<span style={{ fontSize: 16, color: 'var(--muted)' }}>/10</span></div>
                  </div>
                  <div style={{ marginLeft: 'auto', alignSelf: 'center' }}>
                    <Delta before={result.viability_baseline} after={result.viability_simulated} />
                  </div>
                </div>

                {/* Compiled score grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10, marginBottom: 18 }}>
                  {Object.keys(SCORE_LABELS).map(k => (
                    <div key={k} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2, rgba(127,127,127,0.06))', border: '1px solid var(--border, rgba(127,127,127,0.15))' }}>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700, fontFamily: 'Syne', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{SCORE_LABELS[k]}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{num(result.compiled_scores?.[k]).toFixed(1)}</span>
                        <Delta before={meta.baseline_scores?.[k]} after={result.compiled_scores?.[k]} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cash summary */}
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
                  <span>{t('simulate.initial_cash') || 'Initial cash'}: <strong style={{ color: 'var(--text)' }}>K{num(result.initial_cash).toLocaleString()}</strong></span>
                  <span>{t('simulate.ending_cash') || 'Ending cash'}: <strong style={{ color: num(result.ending_cash) >= num(result.initial_cash) ? 'var(--green)' : 'var(--red)' }}>K{num(result.ending_cash).toLocaleString()}</strong></span>
                  <span>{t('simulate.crunch_weeks') || 'Cash-crunch weeks'}: <strong style={{ color: result.weeks_in_crunch ? 'var(--red)' : 'var(--text)' }}>{result.weeks_in_crunch}</strong></span>
                </div>

                {/* Weekly trace */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ color: 'var(--muted)', textAlign: 'right' }}>
                        {['Week', 'Gross', 'Served', 'Capacity', 'LSI', 'Net cash', 'Balance', 'Risk', 'Exec'].map(h => (
                          <th key={h} style={{ padding: '6px 8px', fontFamily: 'Syne', fontWeight: 700, textAlign: h === 'Week' ? 'left' : 'right' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(result.weekly_trace || []).map(w => (
                        <tr key={w.week} style={{ borderTop: '1px solid var(--border, rgba(127,127,127,0.15))', color: 'var(--text)' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 700 }}>{w.week}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Math.round(w.gross_demand)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Math.round(w.served_demand)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{Math.round(w.staff_capacity)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{num(w.labor_strain_index).toFixed(2)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', color: num(w.net_cash_flow) >= 0 ? 'var(--green)' : 'var(--red)' }}>K{Math.round(w.net_cash_flow).toLocaleString()}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>K{Math.round(w.cash_balance).toLocaleString()}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{num(w.risk_score).toFixed(1)}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{num(w.execution_fit).toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

/* Small inline arrow glyph between baseline and simulated V. */
function ArrowRightGlyph() {
  return <span style={{ fontSize: 22, color: 'var(--muted)', alignSelf: 'center' }}>→</span>
}
