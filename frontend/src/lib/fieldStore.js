// Offline-first store for field data collection (KIP's own business map).
//
// Collectors work in markets with poor signal, so nothing is sent directly:
// every observation is written to IndexedDB first and pushed by syncNow()
// when a connection is available. Each observation carries a client UUID
// that the server treats as an idempotency key, so a batch that is re-sent
// after a dropped connection never creates a second record.
import { openDB } from 'idb'
import api from './api'

const APP_VERSION = 'field-1'
const BATCH_SIZE = 25

const dbPromise = openDB('kip-field', 1, {
  upgrade(db) {
    db.createObjectStore('outbox', { keyPath: 'id' })
    db.createObjectStore('photos', { keyPath: 'observation_id' })
    db.createObjectStore('kv')
  },
})

// Ask the browser not to evict this origin's storage when the phone runs low
// on space: unsynced pins live only here until they reach the server.
navigator.storage?.persist?.().catch(() => {})

export const newId = () => crypto.randomUUID()

const listeners = new Set()
const notify = () => listeners.forEach(fn => fn())
/** Subscribe to outbox changes; returns an unsubscribe function. */
export function onOutboxChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * Save an observation locally. `obs` = { kind, target_id, lat, lon,
 * gps_accuracy_m, payload }; `photo` is an optional (already compressed) Blob.
 */
export async function queueObservation(obs, photo) {
  const db = await dbPromise
  const item = {
    id: newId(),
    captured_at: new Date().toISOString(),
    app_version: APP_VERSION,
    status: 'pending',
    ...obs,
  }
  await db.put('outbox', item)
  if (photo) await db.put('photos', { observation_id: item.id, blob: photo })
  notify()
  return item
}

export async function getOutbox() {
  return (await dbPromise).getAll('outbox')
}

export async function discardObservation(id) {
  const db = await dbPromise
  await db.delete('outbox', id)
  await db.delete('photos', id)
  notify()
}

let syncing = null

/** Push everything pending. Safe to call repeatedly; concurrent calls share one run. */
export function syncNow() {
  if (!syncing) syncing = runSync().finally(() => { syncing = null })
  return syncing
}

const toWire = ({ status, reason, ...wire }) => wire

// Send a batch; if the server cannot read it (one malformed record fails the
// whole request), fall back to one record at a time so a single bad record
// cannot block every other pin from uploading.
async function sendBatch(batch) {
  const unreadable = err => [400, 422].includes(err.response?.status)
  try {
    return (await api.post('/field/sync', { observations: batch.map(toWire) })).data.results
  } catch (err) {
    if (!unreadable(err) || batch.length === 1) {
      if (unreadable(err)) return [{ id: batch[0].id, status: 'rejected', reason: 'The server could not read this record.' }]
      throw err
    }
  }
  const results = []
  for (const item of batch) results.push(...await sendBatch([item]))
  return results
}

async function runSync() {
  const db = await dbPromise
  const pending = (await db.getAll('outbox')).filter(o => o.status === 'pending')
  const summary = { sent: 0, rejected: 0, photos: 0 }

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE)
    for (const result of await sendBatch(batch)) {
      if (result.status === 'rejected') {
        const item = batch.find(o => o.id === result.id)
        await db.put('outbox', { ...item, status: 'rejected', reason: result.reason })
        summary.rejected += 1
      } else {
        // "created" or "duplicate" (already received earlier) -- either way it is on the server.
        await db.delete('outbox', result.id)
        summary.sent += 1
      }
    }
  }

  // Photos go after their observation is accepted. One whose observation is
  // still in the outbox (pending or rejected) stays put.
  const stillQueued = new Set((await db.getAllKeys('outbox')))
  for (const photo of await db.getAll('photos')) {
    if (stillQueued.has(photo.observation_id)) continue
    const form = new FormData()
    form.append('observation_id', photo.observation_id)
    form.append('file', photo.blob, 'photo.jpg')
    try {
      await api.post('/field/media', form)
      await db.delete('photos', photo.observation_id)
      summary.photos += 1
    } catch (err) {
      // A photo the server refuses outright will never succeed; drop it.
      if (err.response?.status === 400) await db.delete('photos', photo.observation_id)
      else throw err
    }
  }
  notify()
  return summary
}

/** Vocabulary (sub-types, bands, basket). Cached so the forms work offline. */
export async function getTaxonomy() {
  const db = await dbPromise
  try {
    const { data } = await api.get('/field/taxonomy')
    await db.put('kv', data, 'taxonomy')
    return data
  } catch (err) {
    const cached = await db.get('kv', 'taxonomy')
    if (cached) return cached
    throw err
  }
}

/** Markets near the collector, with the last successful answer as the offline fallback. */
export async function getNearbyMarkets(lat, lon) {
  const db = await dbPromise
  try {
    const { data } = await api.get('/field/markets', { params: { lat, lon } })
    await db.put('kv', data.markets, 'markets')
    return data.markets
  } catch {
    return (await db.get('kv', 'markets')) || []
  }
}

/** Shrink a camera photo to roughly 100-250 KB before it is stored or uploaded. */
export async function compressImage(file, maxDim = 1280, quality = 0.7) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not process photo'))), 'image/jpeg', quality))
}
