import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'

// Admin-only view of Anthropic API spend, read from GET /api/usage/summary.
// Costs come from the price table in backend/app/services/usage_meter.py, so
// they are estimates from token counts, not invoice amounts.

const DAY_OPTIONS = [7, 30, 90, 365]

const usd = v => `$${Number(v || 0).toFixed(4)}`
const num = v => Number(v || 0).toLocaleString()

function hitRate(row) {
  const prompt = (row.input_tokens || 0) + (row.cache_read_tokens || 0) + (row.cache_write_tokens || 0)
  return prompt ? `${Math.round((row.cache_hit_rate || 0) * 100)}%` : '—'
}

function Stat({ label, value }) {
  return (
    <div className="kip-card" style={{ padding: 16 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

function UsageTable({ title, rows, keyLabel, emptyText = 'No API calls in this period.' }) {
  const th = { textAlign: 'right', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }
  const td = { textAlign: 'right', padding: '8px 10px', fontSize: 12, color: 'var(--text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }
  return (
    <section className="kip-card" style={{ padding: 16, marginBottom: 18 }}>
      <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 12 }}>{title}</h2>
      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>{emptyText}</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left' }}>{keyLabel}</th>
                <th style={th}>Calls</th>
                <th style={th}>Cost</th>
                <th style={th}>Input</th>
                <th style={th}>Output</th>
                <th style={th}>Cache read</th>
                <th style={th}>Cache hit</th>
                <th style={th}>Web searches</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={String(r.key)}>
                  <td style={{ ...td, textAlign: 'left', fontFamily: 'Syne', fontWeight: 600 }}>{r.key ?? '(no user)'}</td>
                  <td style={td}>{num(r.calls)}</td>
                  <td style={td}>{usd(r.cost_usd)}</td>
                  <td style={td}>{num(r.input_tokens)}</td>
                  <td style={td}>{num(r.output_tokens)}</td>
                  <td style={td}>{num(r.cache_read_tokens)}</td>
                  <td style={td}>{hitRate(r)}</td>
                  <td style={td}>{num(r.web_searches)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function AdminUsagePage() {
  const { user, loading: authLoading } = useAuth()
  const [days, setDays]       = useState(30)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!user?.is_admin) return
    setLoading(true)
    setError('')
    api.get('/usage/summary', { params: { days } })
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.status === 403 ? 'Admins only.' : 'Could not load usage. Try again.'))
      .finally(() => setLoading(false))
  }, [days, user?.is_admin])

  if (authLoading) return null
  if (!user?.is_admin) return <Navigate to="/dashboard" replace />

  const totals = data?.totals

  return (
    <Layout>
      <div style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, color: 'var(--text)', marginBottom: 5 }}>API usage</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 620 }}>
              What KIP spends on Claude per feature, day and user. Costs are estimated from token counts and the price table,
              and only include calls made since usage logging was added.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {DAY_OPTIONS.map(d => (
              <button key={d} onClick={() => setDays(d)} className={d === days ? 'kip-btn kip-btn-primary' : 'kip-btn kip-btn-ghost'}
                style={{ fontSize: 12, padding: '7px 12px' }}>
                {d === 365 ? '1 year' : `${d} days`}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="kip-card" style={{ padding: 16, marginBottom: 18, color: 'var(--red)', fontSize: 13 }}>{error}</div>
        )}

        {loading && !data && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
            {[0, 1, 2, 3].map(i => <div key={i} className="shimmer-load" style={{ height: 84, borderRadius: 16 }} />)}
          </div>
        )}

        {totals && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 18, opacity: loading ? 0.6 : 1 }}>
              <Stat label="Calls" value={num(totals.calls)} />
              <Stat label="Estimated cost" value={usd(totals.cost_usd)} />
              <Stat label="Input tokens" value={num(totals.input_tokens)} />
              <Stat label="Output tokens" value={num(totals.output_tokens)} />
            </div>

            <UsageTable title="By feature" rows={data.by_feature} keyLabel="Feature" />
            <UsageTable title="By day" rows={data.by_day} keyLabel="Day" />
            <UsageTable title="Top users" rows={data.top_users} keyLabel="User ID" />
          </>
        )}
      </div>
    </Layout>
  )
}
