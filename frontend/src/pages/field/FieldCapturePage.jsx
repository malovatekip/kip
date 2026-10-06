import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { distanceM } from '../../lib/geo'
import { compressImage, getNearbyMarkets, getTaxonomy, newId, queueObservation } from '../../lib/fieldStore'
import FieldMap from '../../components/field/FieldMap'
import {
  FieldShell, GpsChip, SyncChip, Field, Chips, BigButton, labelStyle, pretty, numberOrNull,
  useGps, useOutbox, MAX_BUSINESS_ACCURACY_M,
} from '../../components/field/fieldUi'

// A collector may nudge the pin onto the right stall, but not place it
// somewhere they are not standing.
const MAX_DRAG_M = 25
// Same radius the server uses to flag possible duplicates.
const DUPLICATE_RADIUS_M = 10
const NEARBY_RADIUS_M = 150
const REFETCH_AFTER_M = 40

const EMPTY_FORM = {
  subtype: '', structure_type: null, op_status: 'open', name: '', market_id: '', section: '',
  products: '', staff_count: '', years_operating: '', payments: [], power_source: null,
  rent_band: null, daily_customers_band: null, daily_sales_band: null,
  hours: '', restock_source: '', challenges: '', prices: {},
  consent: false, owner_first_name: '', owner_gender: null, owner_age_band: null, owner_phone: '',
}

const AGE_BANDS = ['under_25', '25_35', '36_50', 'over_50']

export default function FieldCapturePage() {
  const { fix, error } = useGps()
  const outbox = useOutbox()
  const [taxonomy, setTaxonomy] = useState(null)
  const [markets, setMarkets] = useState([])
  const [serverPins, setServerPins] = useState([])
  const [draft, setDraft] = useState(null)        // {lat, lon, accuracy} while a pin is being placed
  const [form, setForm] = useState(EMPTY_FORM)
  const [photo, setPhoto] = useState(null)        // {blob, url}
  const [showDetails, setShowDetails] = useState(false)
  const [saving, setSaving] = useState(false)
  const lastFetch = useRef(null)
  const lastPending = useRef(0)
  const origin = useRef(null)                     // where the collector stood when the pin was dropped
  const fileInput = useRef(null)

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  useEffect(() => {
    getTaxonomy().then(setTaxonomy).catch(() =>
      toast.error('Could not load the business list. Connect to the internet once to download it.'))
  }, [])

  // Refresh nearby pins and markets as the collector walks, and after each
  // upload: an uploaded pin leaves the outbox, so it has to come back from
  // the server or it would vanish from the map and the duplicate check.
  const pendingCount = outbox.pending.length
  useEffect(() => {
    if (!fix) return
    const uploaded = pendingCount < lastPending.current
    lastPending.current = pendingCount
    if (!uploaded && lastFetch.current && distanceM(lastFetch.current, fix) < REFETCH_AFTER_M) return
    lastFetch.current = { lat: fix.lat, lon: fix.lon }
    api.get('/field/nearby', { params: { lat: fix.lat, lon: fix.lon, radius_m: NEARBY_RADIUS_M } })
      .then(r => setServerPins(r.data.pins)).catch(() => {})
    getNearbyMarkets(fix.lat, fix.lon).then(setMarkets)
  }, [fix, pendingCount])

  const pins = useMemo(() => {
    const local = outbox.items
      .filter(o => o.kind === 'business' && o.status === 'pending')
      .map(o => ({ id: o.target_id, lat: o.lat, lon: o.lon, state: 'unsynced', subtype: o.payload.subtype }))
    const localIds = new Set(local.map(p => p.id))
    const remote = serverPins
      .filter(p => !localIds.has(p.id))
      .map(p => ({ ...p, state: p.mine ? 'mine' : 'other' }))
    return [...remote, ...local]
  }, [serverPins, outbox.items])

  const duplicate = useMemo(() => {
    if (!draft || !form.subtype) return null
    let best = null
    for (const p of pins) {
      if (p.subtype !== form.subtype) continue
      const d = distanceM(draft, p)
      if (d <= DUPLICATE_RADIUS_M && (!best || d < best.d)) best = { d }
    }
    return best
  }, [draft, form.subtype, pins])

  const gpsOk = fix && fix.accuracy <= MAX_BUSINESS_ACCURACY_M

  const startPin = () => {
    origin.current = { lat: fix.lat, lon: fix.lon }
    setDraft({ lat: fix.lat, lon: fix.lon, accuracy: fix.accuracy })
    // The market and section usually stay the same from one stall to the next.
    setForm(f => ({ ...EMPTY_FORM, market_id: f.market_id, section: f.section }))
    setPhoto(null)
    setShowDetails(false)
  }

  const cancelPin = () => {
    if (photo) URL.revokeObjectURL(photo.url)
    setDraft(null)
    setPhoto(null)
  }

  const moveDraft = useCallback(pos => {
    const tooFar = origin.current && distanceM(origin.current, pos) > MAX_DRAG_M
    if (tooFar) toast.error(`Keep the pin within ${MAX_DRAG_M} m of where you are standing.`)
    // A fresh object either way, so a refused move snaps the marker back.
    setDraft(d => (d ? (tooFar ? { ...d } : { ...d, ...pos }) : d))
  }, [])

  const onPhoto = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const blob = await compressImage(file)
      if (photo) URL.revokeObjectURL(photo.url)
      setPhoto({ blob, url: URL.createObjectURL(blob) })
    } catch {
      toast.error('Could not read that photo. Try again.')
    }
  }

  const save = async () => {
    if (!form.subtype) return toast.error('Choose the type of business.')
    if (!form.structure_type) return toast.error('Choose the kind of structure.')
    if (!photo) return toast.error('Take a photo of the front of the business.')
    setSaving(true)
    try {
      const list = text => text.split(',').map(s => s.trim()).filter(Boolean)
      const attributes = {}
      if (form.hours) attributes.hours = form.hours
      if (form.restock_source) attributes.restock_source = form.restock_source
      if (form.challenges) attributes.challenges = list(form.challenges)

      const payload = {
        subtype: form.subtype,
        structure_type: form.structure_type,
        op_status: form.op_status,
        name: form.name.trim() || null,
        market_id: form.market_id || null,
        section: form.section.trim() || null,
        products: list(form.products),
        staff_count: numberOrNull(form.staff_count),
        years_operating: numberOrNull(form.years_operating),
        payments: form.payments,
        power_source: form.power_source,
        rent_band: form.rent_band,
        daily_customers_band: form.daily_customers_band,
        daily_sales_band: form.daily_sales_band,
        attributes,
        prices: Object.entries(form.prices)
          .map(([item_code, v]) => ({ item_code, price_zmw: numberOrNull(v) }))
          .filter(p => p.price_zmw > 0),
      }
      if (form.consent) {
        payload.owner = {
          consent: true,
          first_name: form.owner_first_name.trim() || null,
          gender: form.owner_gender,
          age_band: form.owner_age_band,
          phone: form.owner_phone.trim() || null,
        }
      }
      await queueObservation({
        kind: 'business', target_id: newId(),
        lat: draft.lat, lon: draft.lon, gps_accuracy_m: draft.accuracy, payload,
      }, photo.blob)
      URL.revokeObjectURL(photo.url)
      setDraft(null)
      setPhoto(null)
      toast.success('Pin saved.')
      outbox.sync({ quiet: true })
    } catch {
      toast.error('Could not save on this phone. Free up some storage and try again.')
    } finally {
      setSaving(false)
    }
  }

  const subtypeGroups = useMemo(() => {
    const groups = {}
    for (const s of taxonomy?.subtypes || []) (groups[s.category] ||= []).push(s)
    return Object.entries(groups)
  }, [taxonomy])

  return (
    <FieldShell title="Pin businesses" right={<SyncChip outbox={outbox} />}>
      <div style={{ marginBottom: 8 }}>
        <GpsChip fix={fix} error={error} limit={MAX_BUSINESS_ACCURACY_M} />
      </div>
      <FieldMap fix={fix} pins={pins} draft={draft} onDraftMove={moveDraft} height={draft ? '34vh' : '58vh'} />

      {!draft && (
        <div style={{ marginTop: 14 }}>
          <BigButton onClick={startPin} disabled={!gpsOk || !taxonomy}>
            Pin a business here
          </BigButton>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
            {gpsOk
              ? 'Stand at the front of the stall or shop, then tap.'
              : 'Move into the open and wait for a better GPS fix.'}
            {' '}Green = yours, blue = other collectors, amber = not uploaded yet.
          </p>
        </div>
      )}

      {draft && taxonomy && (
        <form onSubmit={e => { e.preventDefault(); save() }}>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
            Drag the red pin if it is not exactly on the business.
          </p>

          <Field label="Type of business">
            <select className="kip-input" value={form.subtype} onChange={e => set('subtype', e.target.value)} style={{ width: '100%' }}>
              <option value="">Choose…</option>
              {subtypeGroups.map(([category, list]) => (
                <optgroup key={category} label={pretty(category)}>
                  {list.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                </optgroup>
              ))}
            </select>
          </Field>

          {duplicate && (
            <div role="alert" style={{
              display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10, padding: 10, borderRadius: 10,
              background: 'var(--red-dim)', color: 'var(--text)', fontSize: 13,
            }}>
              <AlertTriangle size={16} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 2 }} />
              <span>
                The same type of business is already pinned {Math.round(duplicate.d)} m from here.
                Only save if this is a different business.
              </span>
            </div>
          )}

          <span style={labelStyle}>Structure</span>
          <Chips options={taxonomy.structure_types} value={form.structure_type} onChange={v => set('structure_type', v)} />

          <span style={labelStyle}>Status today</span>
          <Chips options={taxonomy.operating_status} value={form.op_status} onChange={v => set('op_status', v || 'open')} />

          <span style={labelStyle}>Photo of the front (no faces)</span>
          <input ref={fileInput} type="file" accept="image/*" capture="environment" onChange={onPhoto} hidden />
          <button type="button" onClick={() => fileInput.current.click()}
            style={{
              width: '100%', minHeight: 96, borderRadius: 12, border: '1px dashed var(--border)',
              background: 'transparent', color: 'var(--muted)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8, overflow: 'hidden', padding: 0,
            }}>
            {photo
              ? <img src={photo.url} alt="Business front" style={{ width: '100%', maxHeight: 220, objectFit: 'cover' }} />
              : <><Camera size={18} /> Take photo</>}
          </button>

          <Field label="Business name (if it has one)">
            <input className="kip-input" value={form.name} onChange={e => set('name', e.target.value)} style={{ width: '100%' }} />
          </Field>

          {markets.length > 0 && (
            <Field label="Market">
              <select className="kip-input" value={form.market_id} onChange={e => set('market_id', e.target.value)} style={{ width: '100%' }}>
                <option value="">Not in a market</option>
                {markets.map(m => <option key={m.id} value={m.id}>{m.name} ({m.distance_m} m)</option>)}
              </select>
            </Field>
          )}

          <button type="button" onClick={() => setShowDetails(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, margin: '18px 0 0', padding: 0,
              background: 'none', border: 'none', color: 'var(--green)', fontWeight: 700, fontSize: 14,
            }}>
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showDetails ? 'Hide full survey' : 'Add full survey (when the owner has 3 minutes)'}
          </button>

          {showDetails && (
            <div>
              <Field label="Section of the market">
                <input className="kip-input" value={form.section} onChange={e => set('section', e.target.value)}
                  placeholder="e.g. vegetable section" style={{ width: '100%' }} />
              </Field>
              <Field label="Main products or services" hint="Separate with commas.">
                <input className="kip-input" value={form.products} onChange={e => set('products', e.target.value)} style={{ width: '100%' }} />
              </Field>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <Field label="People working">
                    <input className="kip-input" type="number" inputMode="numeric" min="0" value={form.staff_count}
                      onChange={e => set('staff_count', e.target.value)} style={{ width: '100%' }} />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="Years here">
                    <input className="kip-input" type="number" inputMode="decimal" min="0" step="0.5" value={form.years_operating}
                      onChange={e => set('years_operating', e.target.value)} style={{ width: '100%' }} />
                  </Field>
                </div>
              </div>

              <span style={labelStyle}>Payments accepted</span>
              <Chips multi options={taxonomy.payment_methods} value={form.payments} onChange={v => set('payments', v)} />
              <span style={labelStyle}>Power</span>
              <Chips options={taxonomy.power_sources} value={form.power_source} onChange={v => set('power_source', v)} />
              <span style={labelStyle}>Rent per month (K)</span>
              <Chips options={taxonomy.monthly_rent_bands} value={form.rent_band} onChange={v => set('rent_band', v)} />
              <span style={labelStyle}>Customers on a normal day</span>
              <Chips options={taxonomy.daily_customer_bands} value={form.daily_customers_band} onChange={v => set('daily_customers_band', v)} />
              <span style={labelStyle}>Sales on a normal day (K) — only if the owner is happy to say</span>
              <Chips options={taxonomy.daily_sales_bands} value={form.daily_sales_band} onChange={v => set('daily_sales_band', v)} />

              <Field label="Opening days and hours">
                <input className="kip-input" value={form.hours} onChange={e => set('hours', e.target.value)}
                  placeholder="e.g. Mon-Sat 07-18" style={{ width: '100%' }} />
              </Field>
              <Field label="Where they restock">
                <input className="kip-input" value={form.restock_source} onChange={e => set('restock_source', e.target.value)}
                  placeholder="e.g. Soweto market, weekly" style={{ width: '100%' }} />
              </Field>
              <Field label="Biggest challenges" hint="Separate with commas.">
                <input className="kip-input" value={form.challenges} onChange={e => set('challenges', e.target.value)} style={{ width: '100%' }} />
              </Field>

              <span style={labelStyle}>Prices today (K) — fill only what this business sells</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {taxonomy.price_basket.map(item => (
                  <label key={item.code} style={{ fontSize: 12 }}>
                    <span style={{ display: 'block', marginBottom: 4 }}>{item.label} <span style={{ color: 'var(--muted)' }}>({item.unit})</span></span>
                    <input className="kip-input" type="number" inputMode="decimal" min="0" step="0.5"
                      value={form.prices[item.code] ?? ''} style={{ width: '100%' }}
                      onChange={e => set('prices', { ...form.prices, [item.code]: e.target.value })} />
                  </label>
                ))}
              </div>

              <div className="kip-card" style={{ padding: 12, marginTop: 16 }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                  <input type="checkbox" checked={form.consent} onChange={e => set('consent', e.target.checked)} style={{ marginTop: 3 }} />
                  <span>
                    The owner agrees that KIP may keep their name and phone number to contact them about their business.
                    Leave unticked if they did not clearly agree.
                  </span>
                </label>
                {form.consent && (
                  <div>
                    <Field label="Owner's first name">
                      <input className="kip-input" value={form.owner_first_name} onChange={e => set('owner_first_name', e.target.value)} style={{ width: '100%' }} />
                    </Field>
                    <Field label="Phone">
                      <input className="kip-input" type="tel" inputMode="tel" value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} style={{ width: '100%' }} />
                    </Field>
                    <span style={labelStyle}>Gender</span>
                    <Chips options={['female', 'male']} value={form.owner_gender} onChange={v => set('owner_gender', v)} />
                    <span style={labelStyle}>Age</span>
                    <Chips options={AGE_BANDS} value={form.owner_age_band} onChange={v => set('owner_age_band', v)} />
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <div style={{ flex: 1 }}><BigButton tone="ghost" onClick={cancelPin}>Cancel</BigButton></div>
            <div style={{ flex: 2 }}><BigButton type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save pin'}</BigButton></div>
          </div>
        </form>
      )}
    </FieldShell>
  )
}
