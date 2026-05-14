import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin, Building2, ShoppingBag, Zap, TrendingUp,
  CheckCircle, Send, ArrowLeft, Info, Globe
} from 'lucide-react'
import Layout from '../components/Layout'
import api from '../lib/api'
import toast from 'react-hot-toast'

function FL({ label, hint }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 12, color: 'var(--muted)' }}>{label}</span>
      {hint && <span style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 6 }}>({hint})</span>}
    </div>
  )
}

function Opt({ value, selected, label, color = 'var(--blue-bright)', onClick }) {
  return (
    <button onClick={() => onClick(value)} style={{
      padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
      fontFamily: 'Syne', fontWeight: 600, fontSize: 12,
      color: selected ? color : 'var(--muted)',
      background: selected ? `${color}15` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${selected ? color + '40' : 'rgba(255,255,255,0.07)'}`,
      transition: 'all 0.2s ease',
    }}>
      {label}
    </button>
  )
}

function NumIn({ value, onChange, placeholder = '0', prefix = '' }) {
  return (
    <div style={{ position: 'relative', marginBottom: 10 }}>
      {prefix && <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--muted)', pointerEvents: 'none' }}>{prefix}</span>}
      <input type="number" value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="kip-input"
        style={{ fontSize: 13, paddingLeft: prefix ? 40 : 14 }} />
    </div>
  )
}

function Section({ title, icon: Icon, color, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${color}25` }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} style={{ color }} />
        </div>
        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 15, color: '#fff' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

export default function GeneralSurveyPage() {
  const [saved,   setSaved]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [prev,    setPrev]    = useState([])

  const [d, setD] = useState({
    location: '', area_type: '',
    food_businesses_count: '', retail_count: '',
    services_count: '', manufacturing_count: '',
    missing_services: '', oversaturated_sectors: '',
    power_reliability: '', internet_access: '', road_quality: '',
    dominant_income_level: '', primary_employment: '', market_days: '',
    avg_tomato_price_per_kg: '', avg_bread_price: '',
    avg_phone_data_1gb: '', avg_shop_rent_pm: '', avg_labor_wage_pm: '',
    seasonal_notes: '', other_observations: '',
  })

  const set = (k, v) => setD(prev => ({ ...prev, [k]: v }))

  useEffect(() => {
    api.get('/templates/general-survey').then(r => setPrev(r.data || [])).catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!d.location.trim()) { toast.error('Please enter the location.'); return }
    setSaving(true)
    try {
      const payload = { ...d }
      // Convert numerics
      for (const k of ['food_businesses_count','retail_count','services_count','manufacturing_count']) {
        if (payload[k]) payload[k] = parseInt(payload[k]) || null
      }
      for (const k of ['avg_tomato_price_per_kg','avg_bread_price','avg_phone_data_1gb','avg_shop_rent_pm','avg_labor_wage_pm']) {
        if (payload[k]) payload[k] = parseFloat(payload[k]) || null
      }
      await api.post('/templates/general-survey', payload)
      setSaved(true)
      toast.success('Survey saved! Thank you for improving KIP.')
    } catch { toast.error('Save failed.') }
    finally { setSaving(false) }
  }

  return (
    <Layout>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <Link to="/templates" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)', textDecoration: 'none', marginBottom: 12 }}>
            <ArrowLeft size={14} /> Templates
          </Link>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(0,212,177,0.12)', border: '1px solid rgba(0,212,177,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Globe size={20} style={{ color: 'var(--teal)' }} />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 4 }}>
                Community Market Intelligence
              </h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, maxWidth: 520 }}>
                Share what you know about your area. This intelligence improves KIP's business recommendations for all Zambian entrepreneurs — including you.
              </p>
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div style={{ display: 'flex', gap: 10, background: 'rgba(0,212,177,0.06)', border: '1px solid rgba(0,212,177,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 24 }}>
          <Info size={15} style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
            You don't need to know every answer. Fill in what you know. Multiple users contribute to the same area — KIP aggregates the data to build a richer picture over time.
          </p>
        </div>

        {/* Previous submissions */}
        {prev.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontFamily: 'Syne', fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>Your previous contributions:</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {prev.map(p => (
                <button key={p.location} onClick={() => { setD(prev => ({ ...prev, ...p })); setSaved(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontFamily: 'Syne', fontWeight: 600, color: 'var(--teal)', background: 'rgba(0,212,177,0.08)', border: '1px solid rgba(0,212,177,0.25)', cursor: 'pointer' }}>
                  <MapPin size={11} /> {p.location}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Location ── */}
        <div style={{ marginBottom: 20 }}>
          <FL label="Location you're surveying" hint="be as specific as possible" />
          <input value={d.location} onChange={e => set('location', e.target.value)}
            placeholder='e.g. "Chawama, Lusaka" or "Riverside, Kitwe" or "Chipata CBD"'
            className="kip-input" style={{ fontSize: 13 }} />
        </div>

        {/* 1. Business Count */}
        <Section title="1. Business Landscape" icon={Building2} color="var(--blue-bright)">
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
            How many businesses of each type operate in this area? (rough estimate)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { k: 'food_businesses_count', l: 'Food & restaurants', p: 'e.g. 15' },
              { k: 'retail_count',          l: 'Retail / general shops', p: 'e.g. 30' },
              { k: 'services_count',        l: 'Services (salons, repairs, etc.)', p: 'e.g. 20' },
              { k: 'manufacturing_count',   l: 'Manufacturing / production', p: 'e.g. 3' },
            ].map(({ k, l, p }) => (
              <div key={k}>
                <FL label={l} />
                <NumIn value={d[k]} onChange={v => set(k, v)} placeholder={p} />
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10 }}>
            <FL label="What businesses are missing from this area?" hint="gaps you've noticed" />
            <input value={d.missing_services} onChange={e => set('missing_services', e.target.value)}
              placeholder='e.g. "No pharmacy, no electronics repair, no fresh meat butcher"'
              className="kip-input" style={{ fontSize: 13, marginBottom: 10 }} />

            <FL label="What sectors are oversaturated?" hint="too much competition" />
            <input value={d.oversaturated_sectors} onChange={e => set('oversaturated_sectors', e.target.value)}
              placeholder='e.g. "Barbershops, kapenta sellers, phone accessories"'
              className="kip-input" style={{ fontSize: 13 }} />
          </div>
        </Section>

        {/* 2. Infrastructure */}
        <Section title="2. Infrastructure" icon={Zap} color="var(--gold)">
          <FL label="Electricity" />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {[{v:'reliable',l:'Reliable'},{v:'load_shedding',l:'Load shedding'},{v:'unreliable',l:'Very unreliable'}].map(o =>
              <Opt key={o.v} value={o.v} selected={d.power_reliability===o.v} label={o.l} color="var(--gold)" onClick={v => set('power_reliability', v)} />
            )}
          </div>

          <FL label="Internet / Mobile data" />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {[{v:'good',l:'Good (4G)'},{v:'fair',l:'Fair (3G)'},{v:'poor',l:'Poor'},{v:'none',l:'None'}].map(o =>
              <Opt key={o.v} value={o.v} selected={d.internet_access===o.v} label={o.l} color="var(--gold)" onClick={v => set('internet_access', v)} />
            )}
          </div>

          <FL label="Roads" />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[{v:'tarmac',l:'Tarmac'},{v:'gravel',l:'Gravel'},{v:'dirt',l:'Dirt/Poor'}].map(o =>
              <Opt key={o.v} value={o.v} selected={d.road_quality===o.v} label={o.l} color="var(--gold)" onClick={v => set('road_quality', v)} />
            )}
          </div>
        </Section>

        {/* 3. Economy */}
        <Section title="3. Local Economy" icon={TrendingUp} color="var(--teal)">
          <FL label="Income level — most residents" />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {[{v:'low',l:'Low income'},{v:'lower_mid',l:'Lower middle'},{v:'middle',l:'Middle class'},{v:'upper',l:'Upper / High'}].map(o =>
              <Opt key={o.v} value={o.v} selected={d.dominant_income_level===o.v} label={o.l} color="var(--teal)" onClick={v => set('dominant_income_level', v)} />
            )}
          </div>

          <FL label="Primary source of income in the area" />
          <input value={d.primary_employment} onChange={e => set('primary_employment', e.target.value)}
            placeholder='e.g. "Mining workers, government employees, informal trade"'
            className="kip-input" style={{ fontSize: 13, marginBottom: 10 }} />

          <FL label="Market days" hint="if there are scheduled market days" />
          <input value={d.market_days} onChange={e => set('market_days', e.target.value)}
            placeholder='e.g. "Every Friday" or "Permanent market"'
            className="kip-input" style={{ fontSize: 13 }} />
        </Section>

        {/* 4. Price Intelligence */}
        <Section title="4. Local Prices (ZMW)" icon={ShoppingBag} color="var(--green)">
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
            Current prices in this specific area — helps KIP give accurate cost estimates.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { k: 'avg_tomato_price_per_kg', l: 'Tomatoes (per kg)', p: '25' },
              { k: 'avg_bread_price',         l: 'Bread loaf (large)', p: '35' },
              { k: 'avg_phone_data_1gb',      l: 'Mobile data (1GB)', p: '20' },
              { k: 'avg_shop_rent_pm',        l: 'Shop/stall rent (per month)', p: '2000' },
              { k: 'avg_labor_wage_pm',       l: 'Unskilled worker wage (per month)', p: '2500' },
            ].map(({ k, l, p }) => (
              <div key={k}>
                <FL label={l} />
                <NumIn value={d[k]} onChange={v => set(k, v)} placeholder={p} prefix="K" />
              </div>
            ))}
          </div>
        </Section>

        {/* 5. Other */}
        <Section title="5. Additional Observations" icon={MapPin} color="var(--muted)">
          <FL label="Seasonal patterns" hint="months when business is slow or busy" />
          <input value={d.seasonal_notes} onChange={e => set('seasonal_notes', e.target.value)}
            placeholder='e.g. "December–January very busy, June–August slow"'
            className="kip-input" style={{ fontSize: 13, marginBottom: 10 }} />

          <FL label="Anything else KIP should know about this area" />
          <textarea value={d.other_observations} onChange={e => set('other_observations', e.target.value)}
            placeholder='e.g. "New shopping mall opening in 2025" or "Mining operations closing next year will affect income levels"'
            className="kip-input" rows={3} style={{ resize: 'none', fontSize: 13 }} />
        </Section>

        {/* Submit */}
        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: '14px 0', borderRadius: 14,
          background: saved
            ? 'linear-gradient(135deg, var(--green), #00A854)'
            : 'linear-gradient(135deg, var(--teal), #009E82)',
          border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'Syne', fontWeight: 700, fontSize: 15,
          color: saved ? 'var(--base)' : '#fff',
          boxShadow: '0 4px 20px rgba(0,212,177,0.25)',
          opacity: saving ? 0.7 : 1, transition: 'all 0.25s ease',
        }}>
          {saving
            ? <><div style={{ width: 17, height: 17, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spinSlow 0.8s linear infinite' }} /> Saving…</>
            : saved
              ? <><CheckCircle size={17} /> Saved — Thank you for improving KIP!</>
              : <><Send size={17} /> Submit Market Intelligence</>
          }
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--faint)', marginTop: 10 }}>
          Your data is anonymous and used only to improve business recommendations in your area.
        </p>
      </div>
    </Layout>
  )
}
