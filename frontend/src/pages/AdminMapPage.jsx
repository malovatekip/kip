import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import maplibregl from '../lib/maplibre'
import Layout from '../components/Layout'
import { buildStyle, dot } from '../components/field/FieldMap'
import api from '../lib/api'
import { useAuth } from '../hooks/useAuth'

// Admin-only view of KIP's own mapped data (the Ground Truth layer): pins,
// markets, review progress and who holds a field role. Reads
// GET /api/map/admin/pins.geojson and /api/map/admin/markets. Owner contact
// details are never returned by those endpoints.

const TOWNS = {
  Luwingu:     [29.9270, -10.2550],
  Kitwe:       [28.2167, -12.8167],
  Lusaka:      [28.2833, -15.4167],
  Ndola:       [28.6366, -12.9587],
  Livingstone: [25.8542, -17.8419],
}

const STATUS_COLOR = { verified: '#0DAD55', pending: '#E8A317', rejected: '#8A8F98', duplicate: '#8A8F98' }
const pinColor = p => (p.is_trap ? '#E0263E' : STATUS_COLOR[p.review_status] || STATUS_COLOR.rejected)

function Stat({ label, value, color }) {
  return (
    <div className="kip-card" style={{ padding: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: color || 'var(--text)' }}>{value}</div>
    </div>
  )
}

function PinsMap({ features, center, onSelect }) {
  const container = useRef(null)
  const map = useRef(null)
  const markers = useRef([])

  useEffect(() => {
    const m = new maplibregl.Map({
      container: container.current, style: buildStyle(), center, zoom: 13,
      attributionControl: { compact: true },
    })
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    m.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
    map.current = m
    return () => m.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pins are HTML markers so they draw regardless of the map's worker or tiles.
  useEffect(() => {
    const m = map.current
    markers.current.forEach(mk => mk.remove())
    markers.current = features.map(f => {
      const el = dot(pinColor(f.properties), 18)
      el.style.cursor = 'pointer'
      el.title = f.properties.name || f.properties.label || ''
      el.addEventListener('click', e => { e.stopPropagation(); onSelect(f.properties) })
      return new maplibregl.Marker({ element: el }).setLngLat(f.geometry.coordinates).addTo(m)
    })
    if (features.length) {
      const b = new maplibregl.LngLatBounds()
      features.forEach(f => b.extend(f.geometry.coordinates))
      m.fitBounds(b, { padding: 60, maxZoom: 17, duration: 0 })
    } else {
      m.jumpTo({ center, zoom: 13 })
    }
  }, [features, center, onSelect])

  return <div ref={container} style={{ height: '56vh', minHeight: 360, width: '100%', borderRadius: 14, overflow: 'hidden' }} />
}

function PinDetail({ pin, onClose }) {
  const [photo, setPhoto] = useState('')
  useEffect(() => {
    let url = ''
    setPhoto('')
    if (!pin?.photo_media_id) return undefined
    api.get(`/field/media/${pin.photo_media_id}`, { responseType: 'blob' })
      .then(r => { url = URL.createObjectURL(r.data); setPhoto(url) })
      .catch(() => {})
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [pin?.photo_media_id])

  if (!pin) return null
  const flags = pin.qa_flags || []
  const row = (k, v) => v != null && v !== '' && (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, padding: '4px 0' }}>
      <span style={{ color: 'var(--muted)' }}>{k}</span><span style={{ color: 'var(--text)', textAlign: 'right' }}>{v}</span>
    </div>
  )
  return (
    <div className="kip-card" style={{ padding: 14, marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{pin.name || pin.label}</div>
        <button className="kip-btn kip-btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={onClose}>Close</button>
      </div>
      {photo && <img src={photo} alt="Shop frontage" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10, marginBottom: 8 }} />}
      {row('Type', pin.label)}
      {row('Category', pin.category)}
      {row('Structure', pin.structure_type)}
      {row('Status today', pin.op_status)}
      {row('Review', pin.review_status)}
      {row('GPS accuracy', pin.gps_accuracy_m != null ? `${Math.round(pin.gps_accuracy_m)} m` : null)}
      {row('Last verified', pin.last_verified ? pin.last_verified.slice(0, 10) : null)}
      {flags.length > 0 && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>Flags: {flags.join(', ')}</div>}
      {pin.is_trap ? <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>Trap pin (planted to detect copying)</div> : null}
    </div>
  )
}

function StaffPanel() {
  const [staff, setStaff] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole]   = useState('collector')
  const [msg, setMsg]     = useState('')
  const load = () => api.get('/field/admin/staff').then(r => setStaff(r.data.staff)).catch(() => {})
  useEffect(() => { load() }, [])

  const submit = e => {
    e.preventDefault()
    setMsg('')
    api.post('/field/admin/role', { email, role })
      .then(r => { setMsg(`${r.data.email} is now ${r.data.role}.`); setEmail(''); load() })
      .catch(err => setMsg(err.response?.data?.detail || 'Could not update the role.'))
  }
  const input = { padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }
  return (
    <section className="kip-card" style={{ padding: 16, marginTop: 18 }}>
      <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>Field staff</h2>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
        Collectors pin businesses at /field. Supervisors also review pins. The person must already have a KIP account.
      </p>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <input type="email" required placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} style={{ ...input, flex: '1 1 220px' }} />
        <select value={role} onChange={e => setRole(e.target.value)} style={input}>
          <option value="collector">Collector</option>
          <option value="supervisor">Supervisor</option>
          <option value="user">Remove role</option>
        </select>
        <button className="kip-btn kip-btn-primary" type="submit" style={{ fontSize: 12, padding: '8px 14px' }}>Save</button>
      </form>
      {msg && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{msg}</div>}
      {staff.length === 0
        ? <p style={{ fontSize: 13, color: 'var(--muted)' }}>No collectors or supervisors yet.</p>
        : staff.map(s => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderTop: '1px solid var(--border)', color: 'var(--text)' }}>
            <span>{s.full_name || s.email} <span style={{ color: 'var(--muted)' }}>{s.email}</span></span>
            <span style={{ fontWeight: 600 }}>{s.role}</span>
          </div>
        ))}
    </section>
  )
}

export default function AdminMapPage() {
  const { user, loading: authLoading } = useAuth()
  const [town, setTown]         = useState('Luwingu')
  const [features, setFeatures] = useState([])
  const [markets, setMarkets]   = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!user?.is_admin) return
    setLoading(true); setError(''); setSelected(null)
    Promise.all([
      api.get('/map/admin/pins.geojson', { params: { location: town } }),
      api.get('/map/admin/markets', { params: { location: town } }),
    ])
      .then(([p, m]) => { setFeatures(p.data.features); setMarkets(m.data.markets) })
      .catch(err => setError(err.response?.status === 403 ? 'Admins only.' : 'Could not load the map data. Try again.'))
      .finally(() => setLoading(false))
  }, [town, user?.is_admin])

  const onSelect = useCallback(p => setSelected(p), [])

  // Every pin KIP has collected (all towns), same pattern as the ideas dataset export.
  const downloadCsv = async () => {
    setExporting(true)
    try {
      const res = await api.get('/map/admin/export.csv', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `kip_ground_truth_pins_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setError('Could not download the dataset. Try again.')
    } finally {
      setExporting(false)
    }
  }

  if (authLoading) return null
  if (!user?.is_admin) return <Navigate to="/dashboard" replace />

  const real = features.filter(f => !f.properties.is_trap)
  const count = s => real.filter(f => f.properties.review_status === s).length
  const flagged = real.filter(f => (f.properties.qa_flags || []).length > 0).length
  const byLabel = Object.entries(real.reduce((a, f) => ({ ...a, [f.properties.label]: (a[f.properties.label] || 0) + 1 }), {}))
    .sort((a, b) => b[1] - a[1])
  const maxCount = byLabel[0]?.[1] || 1

  return (
    <Layout>
      <div style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, color: 'var(--text)', marginBottom: 5 }}>Ground Truth map</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 620 }}>
              Businesses and markets mapped on the ground by KIP field collectors. This is KIP's own data; only admins see individual pins.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={downloadCsv} disabled={exporting} className="kip-btn kip-btn-ghost" style={{ fontSize: 12, padding: '7px 12px' }}>
              {exporting ? 'Preparing…' : 'Download CSV'}
            </button>
            {Object.keys(TOWNS).map(t => (
              <button key={t} onClick={() => setTown(t)} className={t === town ? 'kip-btn kip-btn-primary' : 'kip-btn kip-btn-ghost'}
                style={{ fontSize: 12, padding: '7px 12px' }}>{t}</button>
            ))}
          </div>
        </div>

        {error && <div className="kip-card" style={{ padding: 16, marginBottom: 18, color: 'var(--red)', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12, marginBottom: 16, opacity: loading ? 0.6 : 1 }}>
          <Stat label="Pins" value={real.length} />
          <Stat label="Verified" value={count('verified')} color={STATUS_COLOR.verified} />
          <Stat label="Awaiting review" value={count('pending')} color={STATUS_COLOR.pending} />
          <Stat label="Flagged" value={flagged} color={flagged ? 'var(--red)' : undefined} />
          <Stat label="Markets" value={markets.length} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(260px,1fr)', gap: 16 }} className="admin-map-grid">
          <div>
            <PinsMap features={features} center={TOWNS[town]} onSelect={onSelect} />
            <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--muted)', marginTop: 8, flexWrap: 'wrap' }}>
              {[['Verified', STATUS_COLOR.verified], ['Pending', STATUS_COLOR.pending], ['Rejected / duplicate', STATUS_COLOR.rejected], ['Trap', '#E0263E']].map(([n, c]) => (
                <span key={n}><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: c, marginRight: 5 }} />{n}</span>
              ))}
            </div>
            {!loading && features.length === 0 && !error && (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>
                No pins in {town} yet. Open Field Mapping on a phone and pin the first businesses.
              </p>
            )}
          </div>
          <div>
            <section className="kip-card" style={{ padding: 14 }}>
              <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 10 }}>By business type</h2>
              {byLabel.length === 0 ? <p style={{ fontSize: 12, color: 'var(--muted)' }}>Nothing yet.</p> : byLabel.slice(0, 10).map(([label, n]) => (
                <div key={label} style={{ marginBottom: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text)' }}><span>{label}</span><span>{n}</span></div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--border)' }}>
                    <div style={{ height: 5, borderRadius: 3, width: `${(n / maxCount) * 100}%`, background: 'var(--mint, #8FFFE0)' }} />
                  </div>
                </div>
              ))}
            </section>
            <PinDetail pin={selected} onClose={() => setSelected(null)} />
          </div>
        </div>

        <section className="kip-card" style={{ padding: 16, marginTop: 18 }}>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 10 }}>Markets in {town}</h2>
          {markets.length === 0 ? <p style={{ fontSize: 13, color: 'var(--muted)' }}>No markets recorded yet.</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
                  {['Market', 'Type', 'Pins', 'Stalls', 'Daily levy', 'Monthly rent', 'Review'].map(h => <th key={h} style={{ padding: '6px 8px', fontWeight: 700 }}>{h}</th>)}
                </tr></thead>
                <tbody>{markets.map(m => (
                  <tr key={m.id} style={{ borderTop: '1px solid var(--border)', color: 'var(--text)' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{m.name}</td>
                    <td style={{ padding: '6px 8px' }}>{(m.market_type || '').replace(/_/g, ' ')}</td>
                    <td style={{ padding: '6px 8px' }}>{m.pins}</td>
                    <td style={{ padding: '6px 8px' }}>{m.stall_count != null ? `${m.occupied_stalls ?? '?'} / ${m.stall_count}` : '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{m.daily_levy_zmw != null ? `K${m.daily_levy_zmw}` : '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{m.rent_min_zmw != null ? `K${m.rent_min_zmw}–${m.rent_max_zmw ?? '?'}` : '—'}</td>
                    <td style={{ padding: '6px 8px' }}>{m.review_status}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>

        <StaffPanel />
      </div>
      <style>{'@media (max-width: 800px){.admin-map-grid{grid-template-columns:1fr !important}}'}</style>
    </Layout>
  )
}
