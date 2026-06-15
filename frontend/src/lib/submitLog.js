/**
 * KIP submitLog — universal log submission
 * Tries the API first. If offline, queues in IndexedDB and
 * registers a background sync.
 *
 * Usage (replaces direct api.post('/logs/daily', payload)):
 *
 *   import { submitLog } from '../lib/submitLog'
 *   const result = await submitLog(payload)
 *   if (result.queued) {
 *     toast.success('Log saved offline. Will sync when online.')
 *   } else {
 *     toast.success('Log saved!')
 *   }
 */

import api from './api'
import { queueLog, requestBackgroundSync } from './offlineQueue'

const TOKEN_KEYS = ['kip_token', 'token', 'access_token']

function getToken() {
  for (const k of TOKEN_KEYS) {
    const t = localStorage.getItem(k)
    if (t && t !== 'undefined' && t !== 'null') return t
  }
  return null
}

export async function submitLog(payload) {
  // Try online submission first
  if (navigator.onLine) {
    try {
      const { data } = await api.post('/logs/daily', payload)
      return { queued: false, data }
    } catch (err) {
      // If it's a network error (not a 4xx), fall through to queue
      const isNetworkError = !err.response
      if (!isNetworkError) throw err
      // Network error — fall through to queue
    }
  }

  // Offline or network error — queue for later
  const token = getToken()
  await queueLog(payload, token)

  // Register background sync
  await requestBackgroundSync()

  return { queued: true, data: null }
}
