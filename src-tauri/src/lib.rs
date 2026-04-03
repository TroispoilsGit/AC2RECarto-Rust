// src-tauri/src/lib.rs
// Application entry point wired into Tauri's builder.
// Registers plugins, commands, the application menu, and startup logic.

mod commands;
mod config;

use tauri::menu::{MenuBuilder, MenuItem, PredefinedMenuItem, SubmenuBuilder};
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_app_config,
            commands::update_app_config,
            commands::get_data_directory,
            commands::list_poi_files,
            commands::load_poi_file,
            commands::open_directory_dialog,
            commands::close_config_window,
        ])
        .setup(|app| {
            // Ensure config.json exists and is valid before any window loads.
            config::ensure_config_file(app.handle())?;

            // ── Application Menu ──────────────────────────────────────────────
            let config_item =
                MenuItem::with_id(app, "open_config", "Config", true, Some("CmdOrCtrl+,"))?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit_item = PredefinedMenuItem::quit(app, Some("Exit"))?;

            let file_menu = SubmenuBuilder::new(app, "File")
                .items(&[&config_item, &separator, &quit_item])
                .build()?;

            let menu = MenuBuilder::new(app).items(&[&file_menu]).build()?;

            if let Some(main_window) = app.get_webview_window("main") {
                main_window.set_menu(menu)?;
            }

            Ok(())
        })
        .on_menu_event(|app, event| {
            if event.id().as_ref() == "open_config" {
                commands::open_config_window(app.clone());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
