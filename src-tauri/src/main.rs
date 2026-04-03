// src-tauri/src/main.rs
// The library crate is defined in lib.rs and is referenced here by its
// Cargo package name (hyphens replaced with underscores): ac2re_carto.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ac2re_carto::run()
}
