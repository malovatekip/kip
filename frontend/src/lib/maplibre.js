// MapLibre v6 loads its worker from a file next to its own module, which does
// not exist once Vite has bundled the app. Without the worker, tile-less
// layers such as our GeoJSON pins silently never draw. Bundle the worker as
// its own chunk and point MapLibre at it; import maplibregl from here.
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'

maplibregl.setWorkerUrl(workerUrl)

export default maplibregl
