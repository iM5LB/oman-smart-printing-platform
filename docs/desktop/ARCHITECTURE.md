# Desktop Application — Architecture Proposal

**Status:** Proposed (supersedes ADR-002 WPF-only UI)  
**Product:** Oman Smart Printing — Shop Desktop  
**Stack:** React + Vite + Tauri 2 + C# Print Service + SQLite  
**Language:** Arabic RTL first  

---

## 1. Decision summary

| Layer | Choice | Why |
|-------|--------|-----|
| UI | React 19 + TypeScript + Vite + Tailwind | Fast Arabic RTL UI, TanStack Query, commercial density |
| Shell | Tauri 2 (Rust) | Tray, autostart, updater, single-instance, secure IPC bridge |
| Printing | .NET 8 Windows Service (C#) | Real spooler / driver control; survives UI close |
| Local DB | SQLite (print service) | Offline jobs, idempotency, sync queue — not cloud SoT |
| Cloud | Existing NestJS REST + WebSocket | Device token auth; typed contracts |

**Cloud remains source of truth** for orders, payments, customers, prices, employees, reports.  
**SQLite** holds operational cache only.

The current WPF app in `apps/shop-desktop/` is a transitional prototype. New code lives under `apps/shop-desktop-app/` (UI+Tauri) and `apps/print-worker/` (C# print sidecar).

---

## 2. Runtime topology

```text
┌─────────────────────────────────────────────┐
│  Tauri Desktop App                          │
│  ┌─────────────┐    ┌────────────────────┐  │
│  │ React UI    │◄──►│ Tauri/Rust core    │  │
│  │ (Arabic RTL)│    │ tray · updater ·   │  │
│  └─────────────┘    │ WS client · IPC    │  │
│         │           └─────────┬──────────┘  │
└─────────┼─────────────────────┼─────────────┘
          │ HTTPS/WSS           │ Named Pipe (v1)
          ▼                     ▼
   NestJS API            C# Print Service
   PostgreSQL            ┌──────────────────┐
                         │ Spooler / Print  │
                         │ SQLite           │
                         │ File cache       │
                         └────────┬─────────┘
                                  ▼
                           Windows Printers
```

React never calls Win32 print APIs directly.

---

## 3. Process responsibilities

### React UI
- Auth (employee session), dashboards, orders, queue, printers, pickup, settings
- Displays print progress from service events
- Manual print / pickup / payment actions via cloud API (+ local IPC for print)

### Tauri / Rust
- Window lifecycle, tray, notifications, autostart, single-instance, updater
- Secure storage for device token (OS keychain)
- WebSocket client to cloud (or bridge from React via invoke — prefer Rust-owned WS for resilience when window minimized)
- Named-pipe client to print service
- Do **not** put business/print logic here

### C# Print Service
- Printer discovery & capabilities
- Routing, validation, download (via signed URL handed from desktop/cloud), checksum
- Spooler submission & monitoring
- Local SQLite + temp file lifecycle
- Continues when UI is closed (if background printing enabled)

---

## 4. Auth model (device ≠ employee)

| Identity | Lifetime | Storage | Revoke effect |
|----------|----------|---------|---------------|
| Device token | Long-lived | OS credential store via Tauri | Blocks all cloud + print sync |
| Employee session | Short / refreshable | Memory + secure session store | Locks UI; device stays registered |

API continues to use `X-Device-Token` (existing shop endpoints). Employee JWT (future Phase 2) gates mutating actions that require RBAC.

---

## 5. Phase 1 MVP scope (locked)

Login · Dashboard · Orders · Order details · Print queue · Printers · Pickup · Settings  
Plus: print service, discovery, job state machine, auto/manual print, offline sync, logging.

Phase 2+: customers, pricing UI, employees/RBAC, reports, audit, refunds, advanced routing.

---

## 6. Related documents

| Doc | Content |
|-----|---------|
| [REPOSITORY_STRUCTURE.md](./REPOSITORY_STRUCTURE.md) | Monorepo layout |
| [API_CONTRACTS.md](./API_CONTRACTS.md) | Cloud REST/WS contracts |
| [IPC_PROTOCOL.md](./IPC_PROTOCOL.md) | Desktop ↔ print service |
| [STATE_MACHINES.md](./STATE_MACHINES.md) | Order / print job states |
| [SQLITE_SCHEMA.md](./SQLITE_SCHEMA.md) | Local tables |
| [PRINT_SERVICE.md](./PRINT_SERVICE.md) | Printer abstraction, routing, risks |
| [OFFLINE_SYNC.md](./OFFLINE_SYNC.md) | Idempotency + sync |
| [SECURITY.md](./SECURITY.md) | Tokens, files, IPC |
| [FILE_LIFECYCLE.md](./FILE_LIFECYCLE.md) | Download → print → delete |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Tokens, components |
| [SCREEN_LAYOUTS.md](./SCREEN_LAYOUTS.md) | Six priority screens |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Dev / mock printer |

---

## 7. Migration from WPF

1. Keep `apps/shop-desktop` until Tauri Phase 1 is runnable.  
2. Reuse API/shop WebSocket knowledge from WPF client.  
3. Port Arabic copy and status maps from `@omsp/types`.  
4. Delete or archive WPF only after E2E cases 1–5 pass on Tauri stack.
