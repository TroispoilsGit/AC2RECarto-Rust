// scripts/modules/coordinates.js
// Utility functions for converting Leaflet map coordinates into the in-game
// cardinal coordinate system and LandBlock identifiers used by AC2.

/** The latitude/longitude value that corresponds to the centre of the map. */
const CENTER = 127.5

/**
 * Converts a Leaflet Simple-CRS lat/lng pair into a human-readable cardinal
 * coordinate string (e.g. "50.0N 25.0W").
 *
 * @param {number} lat  Leaflet latitude  (valid range: -255 .. 0).
 * @param {number} lng  Leaflet longitude (valid range:    0 .. 255).
 * @returns {string} Cardinal string, or an error label for out-of-range values.
 */
export function coordToCardinal(lat, lng) {
    if (lat > 0 || lat < -255 || lng < 0 || lng > 255) {
        return 'Invalid coordinates'
    }

    // Longitude: express the distance from the centre as a 0–100 percentage.
    let cardinalLng = 0
    if (lng < CENTER) cardinalLng = 100 - (lng * 100) / CENTER
    else if (lng > CENTER) cardinalLng = ((lng - CENTER) * 100) / CENTER
    // else: exactly at the centre → 0 (default)

    // Latitude: Leaflet uses negative values for the northern half, so flip sign.
    const posLat = lat * -1
    let cardinalLat = 0
    if (posLat < CENTER) cardinalLat = 100 - (posLat * 100) / CENTER
    else if (posLat > CENTER) cardinalLat = ((posLat - CENTER) * 100) / CENTER

    const dirLat = posLat < CENTER ? 'N' : 'S'
    const dirLng = lng < CENTER ? 'W' : 'E'

    return `${cardinalLat.toFixed(1)}${dirLat} ${cardinalLng.toFixed(1)}${dirLng}`
}

/**
 * Computes the LandBlock grid cell containing the clicked map position.
 * Each LandBlock cell spans 16 units in the game coordinate system.
 *
 * @param {L.LeafletMouseEvent} ev  The Leaflet click event.
 * @param {L.Map}               map The active Leaflet map instance.
 * @returns {L.Point} The integer (x, y) LandBlock grid coordinates.
 */
export function getLandBlockId(ev, map) {
    const point = map.project(ev.latlng, 4)
    const blockSize = 16

    const x = Math.floor(point.x / blockSize)
    const y = Math.floor((4080 - point.y) / blockSize)

    return L.point(x, y)
}
