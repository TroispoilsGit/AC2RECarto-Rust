// scripts/modules/dataLoader.js
// Reads POI data files via Tauri commands exposed from the Rust backend.
// Replaces the Electron version that used Node.js fs/path APIs directly.

const { invoke } = window.__TAURI__.core

/**
 * Loads and parses a single POI JSON file by its stem name (no extension).
 *
 * @param {string} name File stem, e.g. "town" for town.json.
 * @returns {Promise<object[]>} The parsed array of POI entries.
 */
export async function loadPoiFile(name) {
    return invoke('load_poi_file', { name })
}

/**
 * Returns a sorted list of all JSON file names found in the data directory.
 *
 * @returns {Promise<string[]>} File names including the `.json` extension.
 */
export async function listPoiFiles() {
    return invoke('list_poi_files')
}
