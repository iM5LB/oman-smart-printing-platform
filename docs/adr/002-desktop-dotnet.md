# ADR-002: Desktop Application Technology

## Status
Accepted

## Context
The desktop application must reliably control Windows printers, monitor print queues, and run as a background service. Printer integration reliability is the top priority.

## Decision
Use **C# .NET 8** with:
- **WPF** for the main UI (mature Arabic RTL support)
- **Windows Service** for background print operations
- **System.Printing** / **PrintDocument** APIs for printer control

## Alternatives Considered
| Option | Pros | Cons |
|--------|------|------|
| Rust + Tauri | Modern, lightweight | Weaker Windows print API ecosystem |
| Electron | Cross-platform | Heavy, unreliable print control |
| .NET MAUI | Cross-platform UI | Less mature print integration |

## Consequences
- Desktop app lives in `apps/shop-desktop/`
- Communicates with API via WebSocket (see ADR-003)
- Separate Windows Service project for background printing
- MSIX packaging for distribution
