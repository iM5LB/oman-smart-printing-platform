# Library desktop (Tauri)

**Tauri 2 WebView** app for the library / print-center PC: dark Arabic RTL UI + Windows print bridge.

## Prerequisites

1. **Node.js 20+**
2. **Rust** (stable) + MSVC build tools  
   - `winget install Rustlang.Rustup` → `rustup default stable`  
   - Visual Studio Build Tools with “Desktop development with C++” (needed for `link.exe`)
3. **WebView2** (included on Windows 11; on Win10 install the Evergreen Runtime)
4. **.NET 8 SDK** for the print worker (`winget install Microsoft.DotNet.SDK.8`)

## Dev

From repo root (API must be running separately):

```powershell
# Ensure Nest API is up
npm run start:api

# In another terminal — build print sidecar if needed, then Tauri + Vite
npm run desktop:dev
```

Or:

```powershell
cd apps/shop-desktop-app
npm install
npm run worker:build
npm run tauri:dev
```

Optional env (DEV only):

- `VITE_API_URL` — local API override while running `tauri:dev` (default `http://localhost:4000`). Production/release builds always use `https://omsp-api.onrender.com`.
- `PRINT_WORKER_PATH` — absolute path to `print-worker.exe` if auto-discovery fails

Login: enter the **device token** only (no API URL). Seed token: `dev-al-noor-device-token-change-in-production`

## Layout

| Path | Role |
|------|------|
| `apps/shop-desktop-app` | Tauri 2 + React UI |
| `apps/print-worker` | .NET 8 JSON stdin/stdout print sidecar |

## Printer IPC

UI → Tauri `invoke(list_printers | print_test)` → spawns `print-worker.exe` with:

```json
{ "cmd": "printers.list" }
{ "cmd": "print.test", "printerId": "..." }
```

## Auto-updates

See [UPDATES.md](./UPDATES.md) for GitHub Releases + Tauri updater setup (secrets, tagging `v*`, verification).
