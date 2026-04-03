// scripts/overlays/poiOverlay.js
// Builds and registers two Leaflet layer-control panels on the map:
//   • "Base POIs"       — the built-in POI categories (towns, dungeons, etc.)
//   • "Additional POIs" — any extra JSON files found in the data directory.

import { loadPoiFile, listPoiFiles } from '../modules/dataLoader.js'
import { getIcons } from '../modules/icons.js'
import { getAppConfig } from '../modules/appConfig.js'

// ─── Base POI definitions ─────────────────────────────────────────────────────

/**
 * Maps a JSON file stem (lower-case) to its dedicated icon and display label.
 * Files listed here are treated as "base" POIs and rendered without clustering.
 */
function getBasePoiConfig(icons) {
    return {
        ringways: { icon: icons.blueCircleVoid,   label: 'Ringways' },
        gateways: { icon: icons.blueCircleFull,   label: 'Gateways' },
        poi:      { icon: icons.blueCrossFull,    label: 'PoI'      },
        town:     { icon: icons.yellowSquareFull, label: 'Town'     },
        outpost:  { icon: icons.yellowSquareVoid, label: 'Outpost'  },
        vault:    { icon: icons.redCrossFull,     label: 'Vault'    },
        dungeon:  { icon: icons.redCrossVoid,     label: 'Dungeon'  },
        city:     { icon: icons.yellowCrown,      label: 'City'     },
        faction:  { icon: icons.greySquare,       label: 'Faction'  },
    }
}

/** Display order for base POI layers in the control panel. */
const BASE_POI_ORDER = [
    'ringways', 'gateways', 'poi', 'town', 'outpost', 'vault', 'dungeon', 'city', 'faction',
]

/** Icon used for extra (non-base) POI files. Falls back to grey square. */
// ─── Cluster options ──────────────────────────────────────────────────────────

/** Default cluster settings used when the config provides no valid values. */
const DEFAULT_CLUSTER_OPTIONS = {
    chunkedLoading: true,
    disableClusteringAtZoom: 6,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: false,
}

/**
 * Extracts and validates the marker-cluster options from the app config,
 * falling back to defaults for any missing or invalid fields.
 *
 * @param {object} appConfig
 * @returns {object} A fully-formed cluster options object.
 */
function resolveClusterOptions(appConfig) {
    const raw = appConfig?.poiCluster
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return DEFAULT_CLUSTER_OPTIONS
    }

    return {
        chunkedLoading:
            typeof raw.chunkedLoading === 'boolean'
                ? raw.chunkedLoading
                : DEFAULT_CLUSTER_OPTIONS.chunkedLoading,
        disableClusteringAtZoom:
            typeof raw.disableClusteringAtZoom === 'number' && Number.isFinite(raw.disableClusteringAtZoom)
                ? raw.disableClusteringAtZoom
                : DEFAULT_CLUSTER_OPTIONS.disableClusteringAtZoom,
        showCoverageOnHover:
            typeof raw.showCoverageOnHover === 'boolean'
                ? raw.showCoverageOnHover
                : DEFAULT_CLUSTER_OPTIONS.showCoverageOnHover,
        spiderfyOnMaxZoom:
            typeof raw.spiderfyOnMaxZoom === 'boolean'
                ? raw.spiderfyOnMaxZoom
                : DEFAULT_CLUSTER_OPTIONS.spiderfyOnMaxZoom,
    }
}

// ─── Label helpers ────────────────────────────────────────────────────────────

/** Escapes HTML special characters to prevent XSS in control panel labels. */
function escapeHtml(text) {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

/**
 * Builds the HTML string used as the layer label in the control panel.
 * Includes a small inline icon image when an icon URL is available.
 *
 * @param {string}      label   Display name of the layer.
 * @param {string|null} iconUrl URL of the icon image, or null.
 * @returns {string} HTML string.
 */
function buildLayerLabel(label, iconUrl, iconSize) {
    const safeLabel = escapeHtml(label)
    if (!iconUrl) return safeLabel

    const safeUrl = escapeHtml(iconUrl)
    const style = Number.isFinite(iconSize)
        ? ` style="width:${iconSize}px;height:${iconSize}px"`
        : ''

    return (
        `<span class="poi-overlay-entry">` +
        `<span class="poi-overlay-name">${safeLabel}</span>` +
        `<span class="poi-overlay-separator"> - </span>` +
        `<img class="poi-overlay-icon" src="${safeUrl}" alt=""${style}>` +
        `</span>`
    )
}

// ─── Control helpers ──────────────────────────────────────────────────────────

/** Prepends a section title element to the top of a layer control's list. */
function addControlTitle(control, titleText) {
    const list = control.getContainer().querySelector('.leaflet-control-layers-list')
    const title = document.createElement('div')
    title.className = 'leaflet-control-layers-section-title'
    title.textContent = titleText
    list.prepend(title)
}

/** Adds the shared CSS class to a control container for custom styling. */
function applyPoiControlClass(control) {
    control?.getContainer().classList.add('poi-overlay-control')
}

// ─── Layer building ───────────────────────────────────────────────────────────

/**
 * Loads all POI JSON files from disk and builds a Leaflet layer for each one.
 * Base POI categories use plain LayerGroups; extra files use cluster groups.
 *
 * @returns {Promise<{ baseOverlays: object, extraOverlays: object }>}
 */
async function buildOverlayMaps() {
    const appConfig = await getAppConfig()
    const icons = getIcons()
    const basePoiConfig = getBasePoiConfig(icons)
    const extraPoiIcon = icons.redCrossAdditional ?? icons.greySquare
    const clusterOptions = resolveClusterOptions(appConfig)
    const files = await listPoiFiles()

    const results = await Promise.all(
        files.map(async (fileName) => {
            const stem = fileName.replace(/\.json$/i, '')
            const key = stem.toLowerCase()
            const isBase = key in basePoiConfig

            const { label, icon } = isBase
                ? basePoiConfig[key]
                : { label: stem.charAt(0).toUpperCase() + stem.slice(1), icon: extraPoiIcon }

            try {
                const data = await loadPoiFile(stem)
                if (!Array.isArray(data)) {
                    console.warn(`Skipping ${fileName}: expected a JSON array.`)
                    return null
                }

                const markers = data.map((item) =>
                    L.marker([item.y, item.x], { icon }).bindPopup(item.description ?? stem)
                )

                let layer
                if (isBase) {
                    layer = L.layerGroup(markers)
                } else {
                    layer = L.markerClusterGroup(clusterOptions)
                    layer.addLayers(markers)
                }

                return {
                    key,
                    label,
                    layer,
                    isBase,
                    iconUrl: icon.options?.iconUrl ?? null,
                    iconSize: icon.options?.iconSize?.[0] ?? null,
                }
            } catch (error) {
                console.error(`Failed to load ${fileName}:`, error)
                return null
            }
        })
    )

    // Remove failed entries then partition into base / extra.
    const valid = results.filter(Boolean)

    const baseEntries = valid
        .filter((e) => e.isBase)
        .sort((a, b) => BASE_POI_ORDER.indexOf(a.key) - BASE_POI_ORDER.indexOf(b.key))

    const extraEntries = valid
        .filter((e) => !e.isBase)
        .sort((a, b) => a.label.localeCompare(b.label))

    const toOverlayMap = (entries) =>
        Object.fromEntries(
            entries.map((e) => [buildLayerLabel(e.label, e.iconUrl, e.iconSize), e.layer])
        )

    return {
        baseOverlays: toOverlayMap(baseEntries),
        extraOverlays: toOverlayMap(extraEntries),
    }
}

// ─── Module-level control references ─────────────────────────────────────────

let baseLayerControl = null
let extraLayerControl = null

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Builds the POI overlay controls and registers them on the map.
 * Replaces any previously registered controls if called more than once.
 *
 * @param {L.Map} map
 */
export function initPoiOverlay(map) {
    buildOverlayMaps().then(({ baseOverlays, extraOverlays }) => {
        if (baseLayerControl) map.removeControl(baseLayerControl)
        if (extraLayerControl) map.removeControl(extraLayerControl)

        baseLayerControl = L.control.layers(null, baseOverlays, { collapsed: false }).addTo(map)
        addControlTitle(baseLayerControl, 'Base POIs')
        applyPoiControlClass(baseLayerControl)

        if (Object.keys(extraOverlays).length > 0) {
            extraLayerControl = L.control.layers(null, extraOverlays, { collapsed: false }).addTo(map)
            addControlTitle(extraLayerControl, 'Additional POIs')
            applyPoiControlClass(extraLayerControl)
        } else {
            extraLayerControl = null
        }
    })
}
