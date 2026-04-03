// scripts/modules/icons.js
// Defines all custom Leaflet marker icons used throughout the application.
// Requires Leaflet (L) to be available as a global, which is guaranteed by the
// <script> tag in index.html.

import { getCachedAppConfig } from './appConfig.js'

const DEFAULT_ICON_SIZE = 9
const MIN_ICON_SIZE = 4
const MAX_ICON_SIZE = 32

function resolveIconSize() {
    const config = getCachedAppConfig()
    const rawSize = config?.iconSize

    if (typeof rawSize !== 'number' || !Number.isFinite(rawSize)) {
        return DEFAULT_ICON_SIZE
    }

    return Math.min(MAX_ICON_SIZE, Math.max(MIN_ICON_SIZE, rawSize))
}

/**
 * Creates a Leaflet Icon from the given URL using the shared icon dimensions.
 * @param {string} iconUrl Path to the icon image file.
 * @returns {L.Icon}
 */
function makeIcon(iconUrl) {
    const size = resolveIconSize()

    return new L.Icon({
        iconUrl,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    })
}

/**
 * Named icon instances for every POI category and live entity type.
 * Icon image files live in the `/icons/` directory.
 */
export function getIcons() {
    return {
        // ── POI category icons ────────────────────────────────────────────────
        redCrossFull:       makeIcon('./icons/red_cross_full.png'),
        redCrossVoid:       makeIcon('./icons/red_cross_void.png'),
        redCrossAdditional: makeIcon('./icons/red_cross_additional_full.png'),
        blueCircleFull:     makeIcon('./icons/blue_circle_full.png'),
        blueCircleVoid:     makeIcon('./icons/blue_circle_void.png'),
        blueCrossFull:      makeIcon('./icons/blue_cross_full.png'),
        greySquare:         makeIcon('./icons/grey_square.png'),
        yellowSquareFull:   makeIcon('./icons/yellow_square_full.png'),
        yellowSquareVoid:   makeIcon('./icons/yellow_square_void.png'),
        yellowCrown:        makeIcon('./icons/yellow_crown.png'),

        // ── Live entity icons ─────────────────────────────────────────────────
        greenPlayer:        makeIcon('./icons/green_circle_full.png'),
        yellowNpc:          makeIcon('./icons/yellow_star_big.png'),
    }
}
