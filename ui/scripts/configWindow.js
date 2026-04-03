// scripts/configWindow.js
// Drives the configuration window UI (config.html).
// Reads the current config via Tauri commands on load, updates it on every form
// change with a short debounce, and reflects external updates broadcast by the backend.
//
// window.__TAURI__ is injected by Tauri because `withGlobalTauri: true` is set
// in tauri.conf.json. No module bundler is required.

const { invoke } = window.__TAURI__.core
const { listen } = window.__TAURI__.event

// ─── DOM References ───────────────────────────────────────────────────────────

const dataDirectoryInput           = document.getElementById('dataDirectory')
const tilesDirectoryInput          = document.getElementById('tilesDirectory')
const iconSizeInput                = document.getElementById('iconSize')
const chunkedLoadingInput          = document.getElementById('chunkedLoading')
const disableClusteringAtZoomInput = document.getElementById('disableClusteringAtZoom')
const showCoverageOnHoverInput     = document.getElementById('showCoverageOnHover')
const spiderfyOnMaxZoomInput       = document.getElementById('spiderfyOnMaxZoom')
const browseDataButton             = document.getElementById('browseData')
const browseTilesButton            = document.getElementById('browseTiles')
const resetDefaultsButton          = document.getElementById('resetDefaults')
const closeWindowButton            = document.getElementById('closeWindow')
const statusEl                     = document.getElementById('status')

// ─── State ────────────────────────────────────────────────────────────────────

let saveTimer = null

// Flag used to suppress scheduleSave() calls that fire when fillForm()
// programmatically changes input values (which would trigger an unnecessary save).
let applyingExternalConfig = false

// ─── Status Display ───────────────────────────────────────────────────────────

function showStatus(message) {
    statusEl.textContent = message
}

// ─── Form ↔ Config Helpers ────────────────────────────────────────────────────

function fillForm(config) {
    const poiCluster = config?.poiCluster || {}

    applyingExternalConfig = true
    dataDirectoryInput.value = config?.dataDirectory || ''
    tilesDirectoryInput.value = config?.tilesDirectory || ''
    iconSizeInput.value = Number.isFinite(config?.iconSize) ? config.iconSize : 9
    chunkedLoadingInput.checked = !!poiCluster.chunkedLoading
    disableClusteringAtZoomInput.value = Number.isFinite(poiCluster.disableClusteringAtZoom)
        ? poiCluster.disableClusteringAtZoom
        : 6
    showCoverageOnHoverInput.checked = !!poiCluster.showCoverageOnHover
    spiderfyOnMaxZoomInput.checked = !!poiCluster.spiderfyOnMaxZoom
    applyingExternalConfig = false
}

function getPatchFromForm() {
    const parsedIconSize = Number.parseInt(iconSizeInput.value, 10)
    const parsedZoom = Number.parseInt(disableClusteringAtZoomInput.value, 10)

    return {
        dataDirectory: dataDirectoryInput.value,
        tilesDirectory: tilesDirectoryInput.value,
        iconSize: Number.isFinite(parsedIconSize) ? parsedIconSize : 9,
        poiCluster: {
            chunkedLoading: chunkedLoadingInput.checked,
            disableClusteringAtZoom: Number.isFinite(parsedZoom) ? parsedZoom : 6,
            showCoverageOnHover: showCoverageOnHoverInput.checked,
            spiderfyOnMaxZoom: spiderfyOnMaxZoomInput.checked,
        },
    }
}

// ─── Save Logic ───────────────────────────────────────────────────────────────

async function saveFormConfig() {
    if (applyingExternalConfig) return

    try {
        const updatedConfig = await invoke('update_app_config', { patch: getPatchFromForm() })
        fillForm(updatedConfig)
        showStatus('Saved')
    } catch (error) {
        showStatus(`Save failed: ${error}`)
    }
}

function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer)
    showStatus('Saving...')
    saveTimer = setTimeout(() => saveFormConfig(), 250)
}

// ─── Directory Browser ────────────────────────────────────────────────────────

async function browseDirectory(targetInput, title) {
    try {
        const selected = await invoke('open_directory_dialog', {
            title,
            defaultPath: targetInput.value || null,
        })

        if (selected) {
            targetInput.value = selected
            scheduleSave()
        }
    } catch (error) {
        showStatus(`Browse failed: ${error}`)
    }
}

// ─── Reset Defaults ───────────────────────────────────────────────────────────

async function resetDefaults() {
    try {
        const defaults = await invoke('update_app_config', {
            patch: {
                dataDirectory: '',
                tilesDirectory: '',
                iconSize: 9,
                poiCluster: {
                    chunkedLoading: true,
                    disableClusteringAtZoom: 6,
                    showCoverageOnHover: false,
                    spiderfyOnMaxZoom: false,
                },
            },
        })
        fillForm(defaults)
        showStatus('Defaults restored')
    } catch (error) {
        showStatus(`Reset failed: ${error}`)
    }
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

;[dataDirectoryInput, tilesDirectoryInput, iconSizeInput, disableClusteringAtZoomInput].forEach((input) => {
    input.addEventListener('input', scheduleSave)
})
;[chunkedLoadingInput, showCoverageOnHoverInput, spiderfyOnMaxZoomInput].forEach((input) => {
    input.addEventListener('change', scheduleSave)
})

browseDataButton.addEventListener('click', () => browseDirectory(dataDirectoryInput, 'Select data directory'))
browseTilesButton.addEventListener('click', () => browseDirectory(tilesDirectoryInput, 'Select tiles directory'))
resetDefaultsButton.addEventListener('click', resetDefaults)
closeWindowButton.addEventListener('click', () => invoke('close_config_window'))

// Reflect external config changes broadcast by the backend.
listen('app-config-updated', (event) => {
    fillForm(event.payload)
    showStatus('Updated')
}).catch(console.error)

// ─── Initialisation ───────────────────────────────────────────────────────────

invoke('get_app_config')
    .then((config) => {
        fillForm(config)
        showStatus('Ready')
    })
    .catch((error) => {
        showStatus(`Unable to load config: ${error}`)
    })
