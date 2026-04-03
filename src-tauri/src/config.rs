// src-tauri/src/config.rs
// Handles all configuration file operations: path resolution, default values,
// validation, reading/writing config.json.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

const CONFIG_FILE: &str = "config.json";
const DEFAULT_ICON_SIZE: u32 = 9;
const MIN_ICON_SIZE: u32 = 4;
const MAX_ICON_SIZE: u32 = 32;

// ─── Config Types ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PoiClusterConfig {
    pub chunked_loading: bool,
    pub disable_clustering_at_zoom: u32,
    pub show_coverage_on_hover: bool,
    pub spiderfy_on_max_zoom: bool,
}

impl Default for PoiClusterConfig {
    fn default() -> Self {
        Self {
            chunked_loading: true,
            disable_clustering_at_zoom: 6,
            show_coverage_on_hover: false,
            spiderfy_on_max_zoom: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub data_directory: String,
    pub tiles_directory: String,
    pub icon_size: u32,
    pub poi_cluster: PoiClusterConfig,
}

// ─── Path Helpers ─────────────────────────────────────────────────────────────

/// Returns the default data directory.
/// In development, points to ui/data next to the src-tauri crate.
/// In production, points to data/ next to the executable.
pub fn get_default_data_dir(_app: &AppHandle) -> String {
    if cfg!(debug_assertions) {
        // CARGO_MANIFEST_DIR = AC2RECarto-Rust/src-tauri  (compile-time constant)
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap_or(Path::new("."))
            .join("ui")
            .join("data")
            .to_string_lossy()
            .into_owned()
    } else {
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(PathBuf::from))
            .unwrap_or_default()
            .join("data")
            .to_string_lossy()
            .into_owned()
    }
}

/// Returns the default tiles directory.
/// In development, points to the original AC2RECarto/tiles in the workspace.
/// In production, points to tiles/ next to the executable.
pub fn get_default_tiles_dir(_app: &AppHandle) -> String {
    if cfg!(debug_assertions) {
        // Go up: src-tauri → AC2RECarto-Rust → AC2RECarto-Migration-Rust → AC2RECarto/tiles
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap_or(Path::new(".")) // AC2RECarto-Rust/
            .parent()
            .unwrap_or(Path::new(".")) // AC2RECarto-Migration-Rust/
            .join("AC2RECarto")
            .join("tiles")
            .to_string_lossy()
            .into_owned()
    } else {
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(PathBuf::from))
            .unwrap_or_default()
            .join("tiles")
            .to_string_lossy()
            .into_owned()
    }
}

/// Returns the path to config.json.
/// In development, stored next to src-tauri/Cargo.toml.
/// In production, stored next to the executable.
pub fn get_config_path(_app: &AppHandle) -> PathBuf {
    if cfg!(debug_assertions) {
        Path::new(env!("CARGO_MANIFEST_DIR")).join(CONFIG_FILE)
    } else {
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(PathBuf::from))
            .unwrap_or_default()
            .join(CONFIG_FILE)
    }
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

/// Returns a fresh config with all fields set to their defaults.
pub fn get_default_config(app: &AppHandle) -> AppConfig {
    AppConfig {
        data_directory: get_default_data_dir(app),
        tiles_directory: get_default_tiles_dir(app),
        icon_size: DEFAULT_ICON_SIZE,
        poi_cluster: PoiClusterConfig::default(),
    }
}

fn sanitize_icon_size(value: Option<u64>) -> u32 {
    value
        .map(|size| size as u32)
        .map(|size| size.clamp(MIN_ICON_SIZE, MAX_ICON_SIZE))
        .unwrap_or(DEFAULT_ICON_SIZE)
}

// ─── Sanitization ─────────────────────────────────────────────────────────────

/// Parses a raw JSON value into a validated AppConfig.
/// Missing or invalid fields are replaced with their defaults.
pub fn sanitize_config(raw: &serde_json::Value, app: &AppHandle) -> AppConfig {
    let defaults = get_default_config(app);

    let data_directory = raw
        .get("dataDirectory")
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.to_string())
        .unwrap_or(defaults.data_directory);

    let tiles_directory = raw
        .get("tilesDirectory")
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.to_string())
        .unwrap_or(defaults.tiles_directory);

    let icon_size = sanitize_icon_size(raw.get("iconSize").and_then(|v| v.as_u64()));

    let dc = &defaults.poi_cluster;
    let rc = raw.get("poiCluster");

    let poi_cluster = PoiClusterConfig {
        chunked_loading: rc
            .and_then(|v| v.get("chunkedLoading"))
            .and_then(|v| v.as_bool())
            .unwrap_or(dc.chunked_loading),
        disable_clustering_at_zoom: rc
            .and_then(|v| v.get("disableClusteringAtZoom"))
            .and_then(|v| v.as_u64())
            .map(|n| n as u32)
            .unwrap_or(dc.disable_clustering_at_zoom),
        show_coverage_on_hover: rc
            .and_then(|v| v.get("showCoverageOnHover"))
            .and_then(|v| v.as_bool())
            .unwrap_or(dc.show_coverage_on_hover),
        spiderfy_on_max_zoom: rc
            .and_then(|v| v.get("spiderfyOnMaxZoom"))
            .and_then(|v| v.as_bool())
            .unwrap_or(dc.spiderfy_on_max_zoom),
    };

    AppConfig {
        data_directory,
        tiles_directory,
        icon_size,
        poi_cluster,
    }
}

// ─── File I/O ─────────────────────────────────────────────────────────────────

/// Ensures config.json exists and contains valid data.
/// Creates it with defaults if it is missing; repairs it if the content is corrupt.
pub fn ensure_config_file(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let config_path = get_config_path(app);

    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)?;
    }

    if !config_path.exists() {
        let json = serde_json::to_string_pretty(&get_default_config(app))?;
        fs::write(&config_path, json)?;
        return Ok(());
    }

    // File exists: validate and repair if necessary.
    match fs::read_to_string(&config_path)
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).map_err(|e| {
            std::io::Error::new(std::io::ErrorKind::InvalidData, e)
        }))
    {
        Ok(raw) => {
            let sanitized = sanitize_config(&raw, app);
            let sanitized_val = serde_json::to_value(&sanitized)?;
            if raw != sanitized_val {
                fs::write(&config_path, serde_json::to_string_pretty(&sanitized)?)?;
            }
        }
        Err(_) => {
            // Corrupt file — reset to defaults.
            let json = serde_json::to_string_pretty(&get_default_config(app))?;
            fs::write(&config_path, json)?;
        }
    }

    Ok(())
}

/// Reads and sanitizes config.json, returning defaults on any error.
pub fn load_config(app: &AppHandle) -> Result<AppConfig, String> {
    let config_path = get_config_path(app);

    if !config_path.exists() {
        return Ok(get_default_config(app));
    }

    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let raw: serde_json::Value =
        serde_json::from_str(&content).unwrap_or(serde_json::Value::Null);

    Ok(sanitize_config(&raw, app))
}

/// Merges a partial JSON patch into the current config, saves it, and returns the result.
pub fn update_config_with_patch(
    app: &AppHandle,
    patch: serde_json::Value,
) -> Result<AppConfig, String> {
    let current = load_config(app)?;
    let mut current_val = serde_json::to_value(&current).map_err(|e| e.to_string())?;

    if let (
        serde_json::Value::Object(ref mut current_map),
        serde_json::Value::Object(patch_map),
    ) = (&mut current_val, &patch)
    {
        for (key, value) in patch_map {
            if key == "poiCluster" {
                // Deep-merge the nested poiCluster object.
                if let Some(cur_cluster) = current_map.get_mut("poiCluster") {
                    if let (
                        serde_json::Value::Object(ref mut cm),
                        serde_json::Value::Object(pm),
                    ) = (cur_cluster, value)
                    {
                        for (k, v) in pm {
                            cm.insert(k.clone(), v.clone());
                        }
                    }
                }
            } else {
                current_map.insert(key.clone(), value.clone());
            }
        }
    }

    let sanitized = sanitize_config(&current_val, app);
    let json = serde_json::to_string_pretty(&sanitized).map_err(|e| e.to_string())?;
    let config_path = get_config_path(app);
    fs::write(&config_path, json).map_err(|e| e.to_string())?;

    Ok(sanitized)
}
