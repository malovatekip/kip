import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Store, ClipboardCheck, Trash2 } from 'lucide-react'
import api from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { discardObservation } from '../../lib/fieldStore'
import { FieldShell, SyncChip, BigButton, useOutbox, isSupervisor, pretty } from '../../components/field/fieldUi'

const REJECT_REASONS = {
  outside_zambia: 'The GPS position was outside Zambia.',
  missing_location: 'No GPS position was recorded.',
  unknown_subtype: 'The business type is not on the current list. Update the app.',
  market_name_required: 'The market had no name.',
  captured_at_in_future: "The phone's clock is wrong. Fix the date and time.",
}
const explain = reason =>
  REJECT_REASONS[reason] || (reason?.startsWith('gps_accuracy') ? 'The GPS fix was not accurate enough.' : pretty(reason || 'Rejected'))

function Stat({ value, label }) {
  return (
    <div className="kip-card" style={{ padding: '14px 12px', flex: 1, textAlign: 'center' }}>
      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 24 }}>{value ?? '–'}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
    </div>
  )
}

function NavCard({ to, icon: Icon, title, text }) {
  return (
    <Link to={to} className="kip-card"
      style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 16, marginTop: 12, textDecoration: 'none', color: 'var(--text)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} style={{ color: 'var(--green)' }} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{text}</div>
      </div>
    </Link>
  )
}

export default function FieldHomePage() {
  const { user } = useAuth()
  const outbox = useOutbox()
  const [stats, setStats] = useState(null)

  // Refetch after each upload so the counts reflect what just went up.
  useEffect(() => {
    api.get('/field/me/stats').then(r => setStats(r.data)).catch(() => {})
  }, [outbox.pending.length])

  return (
    <FieldShell title="KIP Field" back="/dashboard" right={<SyncChip outbox={outbox} />}>
      <div style={{ display: 'flex', gap: 10 }}>
        <Stat value={stats?.pins_total} label="Pins uploaded" />
        <Stat value={stats?.pins_verified} label="Verified" />
        <Stat value={outbox.pending.length} label="On this phone" />
      </div>

      <NavCard to="/field/capture" icon={MapPin} title="Pin businesses" text="Walk the market and pin each shop, stall or vendor." />
      <NavCard to="/field/market" icon={Store} title="Record a market" text="Name, stalls, levy, rent, facilities and access." />
      {isSupervisor(user) && (
        <NavCard to="/field/review" icon={ClipboardCheck} title="Review queue" text="Verify, reject or merge pins from collectors." />
      )}

      {outbox.pending.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <BigButton onClick={() => outbox.sync()} disabled={outbox.syncing}>
            {outbox.syncing ? 'Uploading…' : `Upload ${outbox.pending.length} record(s) now`}
          </BigButton>
        </div>
      )}

      {outbox.rejected.length > 0 && (
        <section style={{ marginTop: 22 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--red)' }}>
            Rejected records ({outbox.rejected.length})
          </h2>
          {outbox.rejected.map(item => (
            <div key={item.id} className="kip-card" style={{ padding: 12, marginBottom: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {pretty(item.kind)}: {item.payload?.name || pretty(item.payload?.subtype || 'record')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{explain(item.reason)} Capture it again.</div>
              </div>
              <button type="button" aria-label="Remove" onClick={() => discardObservation(item.id)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)' }}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </section>
      )}
    </FieldShell>
  )
}
