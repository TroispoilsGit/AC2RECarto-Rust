// scripts/overlays/playerOverlay.js
// Tracks live player character positions by polling the `/characterloc` endpoint
// and updating their markers on the map in place.
//
// NOTE: This overlay is not yet wired into the main bootstrap (work in progress).

import { getIcons } from '../modules/icons.js'
import { map } from '../map.js'

/** Marker instances keyed by character ID, used to move existing markers. */
const characterMarkers = {}

/**
 * Creates a new marker for a character, or moves an existing one to the new
 * position. Markers are stored in `characterMarkers` for subsequent updates.
 *
 * @param {string} characterId Unique identifier / display name for the character.
 * @param {number} lat         Latitude in Leaflet Simple CRS coordinates.
 * @param {number} lng         Longitude in Leaflet Simple CRS coordinates.
 */
function upsertCharacterMarker(characterId, lat, lng) {
    const icons = getIcons()

    if (characterMarkers[characterId]) {
        characterMarkers[characterId].setLatLng([lat, lng])
    } else {
        characterMarkers[characterId] = L.marker([lat, lng], { icon: icons.greenPlayer })
            .bindPopup(characterId)
            .addTo(map)
    }
}

/**
 * Fetches the current character positions from the server and refreshes all
 * character markers on the map.
 */
export function fetchCharacterLocations() {
    fetch('/characterloc')
        .then((response) => response.json())
        .then((data) => {
            data.forEach((character) => {
                upsertCharacterMarker(character.literalValue, character.locy, character.locx)
            })
        })
        .catch((error) => {
            console.error('Failed to fetch character locations:', error)
        })
}
