// scripts/map.js
// Creates and configures the Leaflet map instance.
// The exported `map` reference is populated by initMap() and should only be
// accessed after the bootstrap sequence has completed.

import { getAppConfig } from './modules/appConfig.js'

// window.__TAURI__.core.convertFileSrc converts an absolute file-system path
// into an `asset://` URL that Tauri's WebView can load from disk.
const { convertFileSrc } = window.__TAURI__.core

// ─── Map Constants ────────────────────────────────────────────────────────────

const TILE_SIZE = 255
const CENTER_LAT = -127.5
const CENTER_LON = 127.5
const DEFAULT_ZOOM = 4

/** Geographic bounds of the game world expressed in Leaflet Simple CRS units. */
const WORLD_BOUNDS = [
    [-255, 0],
    [0, 255],
]

// ─── Shared Map Instance ──────────────────────────────────────────────────────

/**
 * The shared Leaflet map instance.
 * `null` until `initMap()` resolves — do not use before that point.
 */
export let map = null

// ─── Initialisation ───────────────────────────────────────────────────────────

/**
 * Creates the Leaflet map, attaches it to the `#map` DOM element, and adds the
 * tile layer. Must be awaited before any overlay is initialised.
 */
export async function initMap() {
    const appConfig = await getAppConfig()

    map = L.map('map', {
        crs: L.CRS.Simple,
        minZoom: 1,
        maxZoom: 8,
    }).setView([CENTER_LAT, CENTER_LON], DEFAULT_ZOOM)

    addTileLayer(appConfig?.tilesDirectory)
}

// ─── Tile Layer ───────────────────────────────────────────────────────────────

/**
 * Resolves the tile URL template from a directory path.
 * Uses Tauri's asset protocol (`asset://`) to serve tiles from an arbitrary
 * file-system path. Falls back to a relative path during development when
 * no directory is configured.
 *
 * @param {string|undefined} tilesDirectory Absolute path to the tiles folder.
 * @returns {string} A Leaflet tile URL template string.
 */
function getTileUrl(tilesDirectory) {
    if (!tilesDirectory || typeof tilesDirectory !== 'string') {
        return 'tiles/{z}/{x}/{y}.png'
    }

    // convertFileSrc normalises path separators and encodes special characters.
    const baseUrl = convertFileSrc(tilesDirectory).replace(/\/$/, '')
    return `${baseUrl}/{z}/{x}/{y}.png`
}

/** Adds the tile layer to the map using the resolved URL template. */
function addTileLayer(tilesDirectory) {
    L.tileLayer(getTileUrl(tilesDirectory), {
        tileSize: TILE_SIZE,
        noWrap: true,
        bounds: WORLD_BOUNDS,
        attribution: "© Asheron's Call 2 maps",
    }).addTo(map)
}
