// scripts/app.js
// Renderer bootstrap: initialises the Leaflet map and attaches all overlay
// controls. This is the entry point for the map window (index.html).

import { initMap, map } from './map.js'
import { initPoiOverlay } from './overlays/poiOverlay.js'
import { initCoordOverlay, updateCoordDisplay } from './overlays/coordOverlay.js'
import { setAppConfig } from './modules/appConfig.js'

// window.__TAURI__ is injected by Tauri (withGlobalTauri: true in tauri.conf.json).
const { listen } = window.__TAURI__.event

async function bootstrap() {
    await initMap()

    initPoiOverlay(map)
    initCoordOverlay(map)

    // Update the coordinate display whenever the user clicks on the map.
    map.on('click', (ev) => updateCoordDisplay(ev, map))
}

bootstrap().catch((error) => {
    console.error('Failed to initialise the map:', error)
})

// When the backend broadcasts a config change, update the cached config
// and reload the window so that directory and clustering changes take effect.
listen('app-config-updated', (event) => {
    setAppConfig(event.payload)
    window.location.reload()
})
