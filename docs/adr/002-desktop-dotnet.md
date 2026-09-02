# ADR-002: Desktop Application Technology

## Status
**Superseded in proposal** — see `docs/desktop/ARCHITECTURE.md` (2026-09-02).  
Previous acceptance (WPF UI) remains for the transitional `apps/shop-desktop` binary only.

## Context
The shop desktop must deliver commercial Arabic RTL UX, reliable Windows printing, offline resilience, tray/autostart/updater, and a print engine that survives UI crashes.

## Prior decision (historical)
C# .NET 8 + **WPF UI** + Windows printing APIs.

## Updated decision
| Layer | Technology |
|-------|------------|
| UI | React + TypeScript + Vite + Tailwind + TanStack Query + Zustand + React Router |
| Shell | Tauri 2 (Rust) |
| Print engine | C# .NET 8 worker/service with SQLite |
| IPC | Versioned Named Pipe protocol v1 |

## Alternatives considered
| Option | Pros | Cons |
|--------|------|------|
| Keep WPF UI | Already started | Harder to match prompt’s React design system velocity |
| Electron | Familiar web stack | Heavy; weaker native integration vs Tauri |
| Print APIs from Rust only | Single language | Weaker Windows printing ecosystem than .NET |

## Consequences
- New apps: `shop-desktop-tauri`, `print-service`
- WPF kept until Phase 1 E2E tests pass
- Cloud contracts documented in `docs/desktop/API_CONTRACTS.md`
- Session 0 service vs per-user worker risk documented in `PRINT_SERVICE.md`
