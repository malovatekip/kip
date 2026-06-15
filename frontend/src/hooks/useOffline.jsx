import { useState, useEffect, useCallback, useRef } from 'react'
import { getPendingCount, syncNow, requestBackgroundSync } from '../lib/offlineQueue'
import api from '../lib/api'

/**
 * useOffline — detects connectivity, tracks pending sync count,
 * and auto-syncs when the device comes back online.
 *
 * Returns:
 *   isOnline       {boolean}  — current connectivity state
 *   pendingCount   {number}   — number of logs waiting to sync
 *   isSyncing      {boolean}  — sync in progress
 *   lastSynced     {string}   — ISO timestamp of last successful sync
 *   syncManually   {fn}       — trigger a manual sync
 *   refreshPending {fn}       — re-check pending count
 */
export function useOffline() {
  const [isOnline,     setIsOnline]     = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing,    setIsSyncing]    = useState(false)
  const [lastSynced,   setLastSynced]   = useState(null)
  const syncLock = useRef(false)

  const refreshPending = useCallback(async () => {
    const count = await getPendingCount()
    setPendingCount(count)
  }, [])

  const doSync = useCallback(async () => {
    if (syncLock.current || !navigator.onLine) return
    const count = await getPendingCount()
    if (count === 0) return

    syncLock.current = true
    setIsSyncing(true)
    try {
      const result = await syncNow(api)
      if (result.synced > 0) {
        setLastSynced(new Date().toISOString())
      }
      await refreshPending()
    } catch (err) {
      console.error('[useOffline] Sync error:', err)
    } finally {
      setIsSyncing(false)
      syncLock.current = false
    }
  }, [refreshPending])

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      // Small delay to ensure connectivity is stable before syncing
      setTimeout(() => doSync(), 1500)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [doSync])

  // Listen for sync events from service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handler = event => {
      if (event.data?.type === 'LOG_SYNCED') {
        refreshPending()
        setLastSynced(new Date().toISOString())
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [refreshPending])

  // Initial pending count
  useEffect(() => { refreshPending() }, [])

  // Periodic check every 30 seconds when online
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) refreshPending()
    }, 30_000)
    return () => clearInterval(interval)
  }, [refreshPending])

  const syncManually = useCallback(async () => {
    // Try background sync first, fall back to foreground
    const bgRegistered = await requestBackgroundSync()
    if (!bgRegistered) {
      await doSync()
    }
  }, [doSync])

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSynced,
    syncManually,
    refreshPending,
  }
}
