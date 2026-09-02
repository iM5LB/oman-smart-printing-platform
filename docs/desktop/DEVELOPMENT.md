# Development setup

## Prerequisites

1. **Node.js 20+**
2. **Rust** stable — `winget install Rustlang.Rustup` then `rustup default stable`
3. **MSVC linker** — Visual Studio 2022 Build Tools with workload **Desktop development with C++**  
   (`winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"`)  
   Run `tauri`/`cargo` from **x64 Native Tools** / Developer PowerShell so `link.exe` is on `PATH`.
4. **WebView2** — built into Windows 11; on Windows 10 install the [Evergreen Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)
5. **.NET 8 SDK** — for `apps/print-worker`

## One-command desktop

With the API already running (`npm run start:api`):

```powershell
npm run desktop:dev
```

This builds `print-worker` if missing, then starts Vite (:1420) + the Tauri window.

## Env

```text
# DEV only — release builds hardcode https://omsp-api.onrender.com
VITE_API_URL=http://localhost:4000
PRINT_WORKER_PATH=   # optional absolute path to print-worker.exe
```

Device token (local seed): `dev-al-noor-device-token-change-in-production`

Staff login: device token only (API URL is not configurable in the UI).

CORS must allow the Tauri/Vite origin (see root `.env` / `CORS_ORIGIN`).

## Architecture

Tauri 2 shell → React UI → `invoke` → Rust → .NET `print-worker` → Windows spooler.  
Cloud: Nest `/api/v1/shop/*` with header `X-Device-Token`.
