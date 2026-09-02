# Repository structure (desktop)

```text
apps/
  shop-desktop/              # Legacy WPF (transitional)
  shop-desktop-tauri/        # NEW — Tauri 2 + React UI
    src-tauri/               # Rust shell
    src/                     # React app
      app/                   # router, providers, layout
      features/              # auth, dashboard, orders, …
      components/ui/         # design system
      services/              # api client, ipc client
      stores/                # Zustand UI state
      types/
      styles/
    package.json
  print-service/             # NEW — .NET 8 Windows Service
    src/
      Application/
      Domain/
      Infrastructure/
        Printing/
        Storage/
        Database/
        Ipc/
      Contracts/
      Worker/
    tests/

packages/
  desktop-contracts/         # Shared TS + JSON Schema for IPC v1 + API DTOs used by UI
  types/                     # Existing shared statuses / money helpers
  shared/

docs/
  desktop/                   # This documentation set
```

## Package boundaries

- `@omsp/desktop-contracts` — versioned IPC + print command schemas (generated types for TS; C# mirrors via source-generated or hand-kept DTOs until codegen).
- UI depends on contracts + types, never on print-service internals.
- Print service depends only on Contracts assemblies, not on React.
