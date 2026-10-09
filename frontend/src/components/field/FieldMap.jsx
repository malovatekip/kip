// Map used by field collectors. The business layer drawn here is KIP's own
// data; nothing is loaded from Google or any hosted map service.
//
// Background map: a self-hosted PMTiles file (roads and place names built
// from an OpenStreetMap extract of Zambia) when VITE_BASEMAP_PMTILES_URL is
// set. Without it the backdrop is OpenStreetMap's public raster tiles (roads
// and place names, needs a connection); offline it degrades to a plain canvas
// with a scale bar, which is still enough to pin a stall you are standing at.
// Either way the backdrop is only a picture: no OSM points enter our data.
import React, { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import { layers, namedFlavor } from '@protomaps/basemaps'

const PMTILES_URL = import.meta.env.VITE_BASEMAP_PMTILES_URL
// Fonts and icons for the basemap labels. Point this at your own bucket to
// remove the last external host.
const ASSETS_URL = import.meta.env.VITE_BASEMAP_ASSETS_URL || 'https://protomaps.github.io/basemaps-assets'

let protocolRegistered = false

export function buildStyle() {
  if (!PMTILES_URL) {
    return {
      version: 8,
      sources: {
        osm: {
          type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap contributors',
        },
      },
      layers: [
        { id: 'bg', type: 'background', paint: { 'background-color': '#e9efe9' } },
        { id: 'osm', type: 'raster', source: 'osm' },
      ],
    }
  }
  if (!protocolRegistered) {
    maplibregl.addProtocol('pmtiles', new Protocol().tile)
    protocolRegistered = true
  }
  return {
    version: 8,
    glyphs: `${ASSETS_URL}/fonts/{fontstack}/{range}.pbf`,
    sprite: `${ASSETS_URL}/sprites/v4/light`,
    sources: {
      basemap: { type: 'vector', url: `pmtiles://${PMTILES_URL}`, attribution: '© OpenStreetMap' },
    },
    layers: layers('basemap', namedFlavor('light'), { lang: 'en' }),
  }
}

const PIN_COLORS = ['match', ['get', 'state'], 'unsynced', '#E8A317', 'mine', '#0DAD55', '#3B6FD4']

function dot(color, size) {
  const el = document.createElement('div')
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${color};` +
    'border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.45)'
  return el
}

/**
 * fix:   {lat, lon, accuracy} current GPS position (blue dot)
 * pins:  [{id, lat, lon, state: 'unsynced' | 'mine' | 'other', label}]
 * draft: {lat, lon} pin being placed (draggable); onDraftMove({lat, lon})
 */
export default function FieldMap({ fix, pins = [], draft, onDraftMove, height = '48vh' }) {
  const container = useRef(null)
  const map = useRef(null)
  const loaded = useRef(false)
  const meMarker = useRef(null)
  const draftMarker = useRef(null)
  const following = useRef(true)
  const pinsRef = useRef(pins)
  pinsRef.current = pins

  const pinData = list => ({
    type: 'FeatureCollection',
    features: list.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: { id: p.id, state: p.state, label: p.label || '' },
    })),
  })

  useEffect(() => {
    const m = new maplibregl.Map({
      container: container.current,
      style: buildStyle(),
      center: [28.2833, -15.4167],   // Lusaka until the first GPS fix arrives
      zoom: 17,
      maxZoom: 20,
      attributionControl: { compact: true },
    })
    m.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
    m.on('dragstart', () => { following.current = false })
    m.on('load', () => {
      m.addSource('pins', { type: 'geojson', data: pinData(pinsRef.current) })
      m.addLayer({
        id: 'pins', type: 'circle', source: 'pins',
        paint: {
          'circle-radius': 8, 'circle-color': PIN_COLORS,
          'circle-stroke-color': '#fff', 'circle-stroke-width': 2.5,
        },
      })
      loaded.current = true
    })
    map.current = m
    return () => { loaded.current = false; m.remove() }
  }, [])

  useEffect(() => {
    if (loaded.current) map.current.getSource('pins')?.setData(pinData(pins))
  }, [pins])

  useEffect(() => {
    if (!fix || !map.current) return
    const at = [fix.lon, fix.lat]
    if (!meMarker.current) {
      meMarker.current = new maplibregl.Marker({ element: dot('#1E88E5', 16) }).setLngLat(at).addTo(map.current)
      map.current.jumpTo({ center: at })
    } else {
      meMarker.current.setLngLat(at)
      if (following.current && !draft) map.current.easeTo({ center: at, duration: 400 })
    }
  }, [fix, draft])

  useEffect(() => {
    if (!map.current) return
    if (!draft) {
      draftMarker.current?.remove()
      draftMarker.current = null
      return
    }
    if (!draftMarker.current) {
      const marker = new maplibregl.Marker({ color: '#E0263E', draggable: true })
        .setLngLat([draft.lon, draft.lat]).addTo(map.current)
      marker.on('dragend', () => {
        const { lng, lat } = marker.getLngLat()
        onDraftMove?.({ lat, lon: lng })
      })
      draftMarker.current = marker
      map.current.easeTo({ center: [draft.lon, draft.lat], zoom: Math.max(map.current.getZoom(), 18) })
    } else {
      draftMarker.current.setLngLat([draft.lon, draft.lat])
    }
  }, [draft, onDraftMove])

  return (
    <div style={{ position: 'relative' }}>
      <div ref={container} style={{ height, width: '100%', borderRadius: 14, overflow: 'hidden' }} />
      <button
        type="button"
        onClick={() => {
          following.current = true
          if (fix) map.current?.easeTo({ center: [fix.lon, fix.lat], zoom: 18 })
        }}
        style={{
          position: 'absolute', right: 10, bottom: 10, padding: '8px 12px', borderRadius: 10,
          border: 'none', background: '#fff', color: '#1E88E5', fontWeight: 700, fontSize: 12,
          boxShadow: '0 1px 6px rgba(0,0,0,.3)',
        }}>
        My position
      </button>
    </div>
  )
}
