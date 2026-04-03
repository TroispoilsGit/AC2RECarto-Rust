# AC2RECarto-Rust

Desktop map application for Asheron's Call 2, migrated to Tauri v2 + Rust backend.

## Project Structure

- `ui/`: frontend assets (HTML/CSS/JS)
- `src-tauri/`: Rust backend, Tauri config, native build entrypoint

## Local Development

### Prerequisites

- Rust toolchain (stable)
- Tauri prerequisites for your OS

### Build backend

```bash
cd src-tauri
cargo build
```

### Run app in development

```bash
cd src-tauri
cargo tauri dev
```

## GitHub Releases (Automated)

This repository includes a workflow at `.github/workflows/release.yml` using `tauri-apps/tauri-action`.

A release build is triggered when you push a tag matching `v*`.

Example:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow builds the Tauri app and publishes artifacts to the GitHub Release.

## Notes

- Current CI release runner is `windows-latest`.
- `src-tauri/config.json` is excluded from git because it contains local runtime configuration.
