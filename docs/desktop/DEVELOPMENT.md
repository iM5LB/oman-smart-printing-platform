# Development setup (planned)

## One-command goal

```bash
# from monorepo root (after scaffold)
npm run desktop:dev
```

Starts:

1. Vite React UI  
2. Tauri shell (optional `--no-tauri` for browser-only UI)  
3. Print service in MockPrinter mode  
4. Points `API_URL` at local Nest / Render  

## Env (`.env.example` keys)

```text
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000/ws/shop
OMSP_DEVICE_TOKEN=
OMSP_PRINT_MOCK=true
```

## Mock printer

Simulates Ready / Offline / PaperOut / Printing / Completed / Failure without hardware.

## Do not

Ship MockPrinter as production default.
