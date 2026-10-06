// GPS access for field data collection. Uses the Capacitor plugin inside the
// Android app (the WebView's own geolocation needs native permission
// handling) and the browser API everywhere else.
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'

const OPTIONS = { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }

const toFix = pos => ({
  lat: pos.coords.latitude,
  lon: pos.coords.longitude,
  accuracy: pos.coords.accuracy,
  timestamp: pos.timestamp,
})

/**
 * Stream GPS fixes. onFix({lat, lon, accuracy, timestamp}); onError(message).
 * Returns a function that stops watching.
 */
export function watchPosition(onFix, onError) {
  if (Capacitor.isNativePlatform()) {
    let watchId = null
    let stopped = false
    ;(async () => {
      try {
        const perm = await Geolocation.requestPermissions()
        if (perm.location !== 'granted') return onError('Location permission was denied.')
        watchId = await Geolocation.watchPosition(OPTIONS, (pos, err) => {
          if (err) onError(err.message || 'Could not get a GPS fix.')
          else if (pos) onFix(toFix(pos))
        })
        if (stopped) Geolocation.clearWatch({ id: watchId })
      } catch (e) {
        onError(e.message || 'Location is unavailable.')
      }
    })()
    return () => {
      stopped = true
      if (watchId !== null) Geolocation.clearWatch({ id: watchId })
    }
  }

  if (!navigator.geolocation) {
    onError('This device does not support location.')
    return () => {}
  }
  const id = navigator.geolocation.watchPosition(
    pos => onFix(toFix(pos)),
    err => onError(err.message || 'Could not get a GPS fix.'),
    OPTIONS,
  )
  return () => navigator.geolocation.clearWatch(id)
}

/** Distance in metres between two {lat, lon} points (haversine). */
export function distanceM(a, b) {
  const R = 6371000
  const rad = d => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
