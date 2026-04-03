// scripts/overlays/coordOverlay.js
// Leaflet control that displays the in-game LandBlock ID and cardinal
// coordinates of the last click position on the map.

import { coordToCardinal, getLandBlockId } from '../modules/coordinates.js'

/** The Leaflet control instance — created once and reused across all updates. */
const coordControl = L.control({ position: 'bottomleft' })

coordControl.onAdd = function () {
    this._div = L.DomUtil.create('div', 'coordinates-overlay')
    this._div.textContent = 'Click on the map to see coordinates'
    // Prevent map click events from firing when the user clicks on the overlay.
    L.DomEvent.disableClickPropagation(this._div)
    return this._div
}

/**
 * Refreshes the overlay with the LandBlock ID and cardinal coordinates derived
 * from the given map click event.
 *
 * @param {L.LeafletMouseEvent} ev
 * @param {L.Map}               map
 */
coordControl.update = function (ev, map) {
    const block = getLandBlockId(ev, map)
    const cardinal = coordToCardinal(ev.latlng.lat, ev.latlng.lng)

    // Format the LandBlock as a 4-digit hex ID with the fixed FFFF cell suffix.
    const blockHex =
        '0x' +
        block.x.toString(16).toUpperCase().padStart(2, '0') +
        block.y.toString(16).toUpperCase().padStart(2, '0') +
        'FFFF'

    this._div.innerHTML = `LandBlock ID:<br>${blockHex}<br>${cardinal}`
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Updates the coordinate display from a map click event.
 * Wire this to the map's `click` event in the bootstrap (app.js).
 *
 * @param {L.LeafletMouseEvent} ev
 * @param {L.Map}               map
 */
export function updateCoordDisplay(ev, map) {
    coordControl.update(ev, map)
}

/**
 * Attaches the coordinate overlay control to the Leaflet map.
 * @param {L.Map} map
 */
export function initCoordOverlay(map) {
    coordControl.addTo(map)
}
