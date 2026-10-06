import React, { useCallback, useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { FieldShell, pretty } from '../../components/field/fieldUi'

// Photos sit behind auth, so they are fetched with the token and shown from a blob URL.
function Photo({ mediaId }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!mediaId) return
    let objectUrl
    api.get(`/field/media/${mediaId}`, { responseType: 'blob' })
      .then(r => { objectUrl = URL.createObjectURL(r.data); setUrl(objectUrl) })
      .catch(() => {})
    return () => objectUrl && URL.revokeObjectURL(objectUrl)
  }, [mediaId])
  if (!mediaId) return <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 0' }}>No photo uploaded yet.</div>
  return url
    ? <img src={url} alt="Business front" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 10 }} />
    : <div style={{ height: 120, borderRadius: 10, background: 'var(--border)' }} />
}

const actionStyle = color => ({
  flex: 1, padding: '11px 8px', borderRadius: 10, border: `1px solid ${color}`,
  background: 'transparent', color, fontWeight: 700, fontSize: 13,
})

export default function FieldReviewPage() {
  const [items, setItems] = useState(null)

  const load = useCallback(() => {
    api.get('/field/review').then(r => setItems(r.data.items)).catch(() => {
      setItems([])
      toast.error('Could not load the review queue.')
    })
  }, [])
  useEffect(load, [load])

  const decide = async (item, decision, merged_into_id) => {
    try {
      await api.post(`/field/review/business/${item.id}`, { decision, merged_into_id })
      setItems(list => list.filter(i => i.id !== item.id))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not save the decision.')
    }
  }

  return (
    <FieldShell title="Review queue">
      {items === null && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
      {items?.length === 0 && <p style={{ color: 'var(--muted)' }}>Nothing waiting for review.</p>}
      {items?.map(item => {
        const dupOf = item.qa_flags.find(f => f.startsWith('possible_duplicate:'))?.split(':')[1]
        return (
          <article key={item.id} className="kip-card" style={{ padding: 14, marginBottom: 12 }}>
            <Photo mediaId={item.photo_media_id} />
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 10 }}>{item.name || item.label}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {item.label} · {pretty(item.structure_type || 'structure not given')} · {pretty(item.op_status)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {item.collector || 'Unknown collector'} · GPS ±{Math.round(item.gps_accuracy_m ?? 0)} m ·{' '}
              {item.lat.toFixed(5)}, {item.lon.toFixed(5)}
            </div>
            {dupOf && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--red)', marginTop: 8 }}>
                <AlertTriangle size={14} /> The same type of business was already pinned within 10 m.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" style={actionStyle('var(--green)')} onClick={() => decide(item, 'verified')}>Verify</button>
              {dupOf && (
                <button type="button" style={actionStyle('var(--muted)')} onClick={() => decide(item, 'duplicate', dupOf)}>Duplicate</button>
              )}
              <button type="button" style={actionStyle('var(--red)')} onClick={() => decide(item, 'rejected')}>Reject</button>
            </div>
          </article>
        )
      })}
    </FieldShell>
  )
}
