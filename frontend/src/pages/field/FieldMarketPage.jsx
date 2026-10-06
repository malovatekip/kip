import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getTaxonomy, newId, queueObservation } from '../../lib/fieldStore'
import {
  FieldShell, GpsChip, Field, Chips, BigButton, labelStyle, numberOrNull,
  useGps, useOutbox, MAX_MARKET_ACCURACY_M,
} from '../../components/field/fieldUi'

const FACILITIES = [
  'piped_water', 'toilets', 'zesco_power', 'roofed_stalls', 'lighting', 'security_guards',
  'storage', 'cold_room', 'good_drainage', 'waste_collection', 'parking', 'truck_access',
]
const OPERATORS = ['council', 'cooperative', 'private', 'none']
const ROAD_SURFACES = ['tarred', 'gravel', 'earth']
const SIGNAL = ['none', 'weak', 'good']

const NUMBER_FIELDS = [
  ['stall_count', 'Stalls and shops (total)'],
  ['occupied_stalls', 'Occupied today'],
  ['daily_levy_zmw', 'Daily levy (K)'],
  ['rent_min_zmw', 'Lowest stall rent per month (K)'],
  ['rent_max_zmw', 'Highest stall rent per month (K)'],
]

const TEXT_FIELDS = [
  ['alt_names', 'Other names people use', 'Separate with commas'],
  ['ward', 'Ward', ''],
  ['constituency', 'Constituency', ''],
  ['market_days', 'Busiest days', 'e.g. Friday, Saturday, month end'],
  ['peak_season', 'Peak season', 'e.g. harvest, school opening'],
  ['catchment', 'Where customers come from', 'Compounds, villages, institutions'],
  ['anchors', 'What brings people here', 'Bus station, school, clinic, mine gate'],
  ['restock_sources', 'Where traders restock', 'e.g. Soweto, Kasumbalesa, local farms'],
  ['association', 'Market committee or association', 'Name and contact, if public'],
  ['planned_changes', 'Disputes or planned changes', 'Relocation, upgrade, new rules'],
]

export default function FieldMarketPage() {
  const navigate = useNavigate()
  const { fix, error } = useGps()
  const outbox = useOutbox()
  const [taxonomy, setTaxonomy] = useState(null)
  const [form, setForm] = useState({ name: '', market_type: null, operator: null, road_surface: null, facilities: [], signal: {} })
  const [saving, setSaving] = useState(false)
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  useEffect(() => {
    getTaxonomy().then(setTaxonomy).catch(() =>
      toast.error('Could not load the lists. Connect to the internet once to download them.'))
  }, [])

  const gpsOk = fix && fix.accuracy <= MAX_MARKET_ACCURACY_M

  const save = async e => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Enter the name of the market.')
    if (!form.market_type) return toast.error('Choose the type of market.')
    if (!gpsOk) return toast.error('Wait for a better GPS fix.')
    setSaving(true)
    try {
      const attributes = { facilities: form.facilities }
      for (const key of ['operator', 'road_surface']) if (form[key]) attributes[key] = form[key]
      for (const key of ['market_days', 'peak_season', 'catchment', 'anchors', 'restock_sources', 'association', 'planned_changes']) {
        if (form[key]?.trim()) attributes[key] = form[key].trim()
      }
      for (const key of ['bus_station_distance_m', 'mobile_money_agents', 'loadshedding_hours_per_day']) {
        const n = numberOrNull(form[key])
        if (n !== null) attributes[key] = n
      }
      if (Object.keys(form.signal).length) attributes.mobile_signal = form.signal

      const payload = {
        name: form.name.trim(),
        market_type: form.market_type,
        alt_names: (form.alt_names || '').split(',').map(s => s.trim()).filter(Boolean),
        ward: form.ward?.trim() || null,
        constituency: form.constituency?.trim() || null,
        attributes,
      }
      for (const [key] of NUMBER_FIELDS) payload[key] = numberOrNull(form[key])

      await queueObservation({
        kind: 'market', target_id: newId(),
        lat: fix.lat, lon: fix.lon, gps_accuracy_m: fix.accuracy, payload,
      })
      toast.success('Market saved.')
      outbox.sync({ quiet: true })
      navigate('/field')
    } catch {
      toast.error('Could not save on this phone. Free up some storage and try again.')
    } finally {
      setSaving(false)
    }
  }

  const input = (key, props = {}) => (
    <input className="kip-input" value={form[key] ?? ''} onChange={e => set(key, e.target.value)} style={{ width: '100%' }} {...props} />
  )
  const number = key => input(key, { type: 'number', inputMode: 'decimal', min: 0 })

  return (
    <FieldShell title="Record a market">
      <GpsChip fix={fix} error={error} limit={MAX_MARKET_ACCURACY_M} />
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
        Stand near the main entrance or the middle of the market. Your position becomes the market's point on the map.
      </p>

      {taxonomy && (
        <form onSubmit={save}>
          <Field label="Market name">{input('name')}</Field>
          <span style={labelStyle}>Type</span>
          <Chips options={taxonomy.market_types} value={form.market_type} onChange={v => set('market_type', v)} />
          <span style={labelStyle}>Who runs it and collects fees</span>
          <Chips options={OPERATORS} value={form.operator} onChange={v => set('operator', v)} />

          {NUMBER_FIELDS.map(([key, label]) => <Field key={key} label={label}>{number(key)}</Field>)}

          <span style={labelStyle}>Facilities that work today</span>
          <Chips multi options={FACILITIES} value={form.facilities} onChange={v => set('facilities', v)} />
          <Field label="Hours without power on a normal day">{number('loadshedding_hours_per_day')}</Field>

          <span style={labelStyle}>Road to the market</span>
          <Chips options={ROAD_SURFACES} value={form.road_surface} onChange={v => set('road_surface', v)} />
          <Field label="Distance to the nearest bus station (metres)">{number('bus_station_distance_m')}</Field>
          <Field label="Mobile money booths in and around the market">{number('mobile_money_agents')}</Field>

          {taxonomy.mobile_networks.map(network => (
            <div key={network}>
              <span style={labelStyle}>{network.toUpperCase()} signal</span>
              <Chips options={SIGNAL} value={form.signal[network] ?? null}
                onChange={v => set('signal', { ...form.signal, [network]: v })} />
            </div>
          ))}

          {TEXT_FIELDS.map(([key, label, placeholder]) => (
            <Field key={key} label={label}>{input(key, { placeholder })}</Field>
          ))}

          <div style={{ marginTop: 22 }}>
            <BigButton type="submit" disabled={saving || !gpsOk}>{saving ? 'Saving…' : 'Save market'}</BigButton>
          </div>
        </form>
      )}
    </FieldShell>
  )
}
