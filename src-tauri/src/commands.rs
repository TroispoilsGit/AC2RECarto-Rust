// src-tauri/src/commands.rs
// Tauri command handlers — the bridge between the frontend and the Rust backend.
// These replace the Electron IPC handlers defined in main.js.

use crate::config::{get_default_data_dir, load_config, update_config_with_patch, AppConfig};
use std::path::Path;
use tauri::{AppHandle, Emitter, Manager};

// ─── Config Commands ──────────────────────────────────────────────────────────

/// Returns the full, sanitized application config.
#[tauri::command]
pub fn get_app_config(app: AppHandle) -> Result<AppConfig, String> {
    load_config(&app)
}

/// Applies a partial JSON patch to the config, persists it, and broadcasts the
/// updated config to all open windows via the `app-config-updated` event.
#[tauri::command]
pub fn update_app_config(
    app: AppHandle,
    patch: serde_json::Value,
) -> Result<AppConfig, String> {
    let updated = update_config_with_patch(&app, patch)?;

    // Broadcast the new config to every open window so they can react.
    for window in app.webview_windows().into_values() {
        let _ = window.emit("app-config-updated", &updated);
    }

    Ok(updated)
}

/// Returns the resolved data directory path.
/// Falls back to the default bundled data directory if the configured path
/// does not exist on disk.
#[tauri::command]
pub fn get_data_directory(app: AppHandle) -> Result<String, String> {
    let config = load_config(&app)?;
    let dir = &config.data_directory;
    if Path::new(dir).exists() {
        Ok(dir.clone())
    } else {
        Ok(get_default_data_dir(&app))
    }
}

// ─── File Commands ────────────────────────────────────────────────────────────

/// Returns a sorted list of all JSON file names found in the data directory.
#[tauri::command]
pub fn list_poi_files(app: AppHandle) -> Result<Vec<String>, String> {
    let config = load_config(&app)?;
    let data_dir = Path::new(&config.data_directory);

    let mut files: Vec<String> = std::fs::read_dir(data_dir)
        .map_err(|e| format!("Cannot read data directory: {e}"))?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            if !entry.file_type().ok()?.is_file() {
                return None;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            if name.to_lowercase().ends_with(".json") {
                Some(name)
            } else {
                None
            }
        })
        .collect();

    files.sort();
    Ok(files)
}

/// Loads and parses a single POI JSON file by its stem name (without extension).
/// Rejects names containing path separators or `..` to prevent path traversal.
#[tauri::command]
pub fn load_poi_file(app: AppHandle, name: String) -> Result<serde_json::Value, String> {
    // Validate: reject any attempt to traverse the directory tree.
    if name.contains('/') || name.contains('\\') || name.contains("..") {
        return Err(format!("Invalid POI file name: '{name}'"));
    }

    let config = load_config(&app)?;
    let file_path = Path::new(&config.data_directory).join(format!("{name}.json"));
    let content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Cannot read '{name}.json': {e}"))?;
    serde_json::from_str(&content).map_err(|e| format!("Invalid JSON in '{name}.json': {e}"))
}

// ─── Dialog Commands ──────────────────────────────────────────────────────────

/// Shows the OS folder-picker dialog and returns the selected path, or `null`
/// if the user cancelled.
#[tauri::command]
pub async fn open_directory_dialog(
    app: AppHandle,
    title: Option<String>,
    default_path: Option<String>,
) -> Option<String> {
    use std::sync::{Arc, Mutex};
    use tauri_plugin_dialog::DialogExt;
    use tokio::sync::oneshot;

    let (tx, rx) = oneshot::channel::<Option<String>>();
    let tx = Arc::new(Mutex::new(Some(tx)));

    let mut builder = app.dialog().file();
    if let Some(ref t) = title {
        builder = builder.set_title(t);
    }
    if let Some(ref dp) = default_path {
        let p = std::path::PathBuf::from(dp);
        if p.exists() {
            builder = builder.set_directory(p);
        }
    }

    let tx_clone = Arc::clone(&tx);
    builder.pick_folder(move |folder| {
        let result = folder.map(|p: tauri_plugin_dialog::FilePath| p.to_string());
        if let Some(sender) = tx_clone.lock().unwrap().take() {
            let _ = sender.send(result);
        }
    });

    rx.await.ok().flatten()
}

// ─── Window Management ────────────────────────────────────────────────────────

/// Closes the configuration window from the backend.
#[tauri::command]
pub fn close_config_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("config") {
        win.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Opens the configuration window. If it is already open, brings it to the foreground.
pub fn open_config_window(app: AppHandle) {
    use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

    if let Some(win) = app.get_webview_window("config") {
        let _ = win.set_focus();
        return;
    }

    let _ = WebviewWindowBuilder::new(&app, "config", WebviewUrl::App("config.html".into()))
        .title("Configuration")
        .inner_size(520.0, 500.0)
        .resizable(false)
        .center()
        .build()
        .map(|window| {
            let _ = window.remove_menu();
            let _ = window.hide_menu();
        });
}
