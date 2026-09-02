# Print service — abstraction, routing, risks

## Printer abstraction

```csharp
interface IPrinterAdapter {
  Task<IReadOnlyList<PrinterInfo>> DiscoverAsync(CancellationToken ct);
  Task<PrinterCapabilities> GetCapabilitiesAsync(string printerId, CancellationToken ct);
  Task<SpoolSubmission> SubmitAsync(PrintCommand cmd, CancellationToken ct);
  Task<SpoolStatus> GetJobStatusAsync(string spoolerId, CancellationToken ct);
  Task PauseAsync(string spoolerId, CancellationToken ct);
  Task ResumeAsync(string spoolerId, CancellationToken ct);
  Task CancelAsync(string spoolerId, CancellationToken ct);
}
```

Implementations:

- `WindowsSpoolerAdapter` — production (System.Printing / Win32)
- `MockPrinterAdapter` — development only

## Capabilities model

```text
name, driver, port, isDefault
supportsColor, supportsDuplex, paperSizes[], maxCopies
status: Ready | Printing | Paused | Offline | Error | PaperOut | TonerLow | Unknown
```

## Routing algorithm (v1)

Input: required color, paper, duplex, roles, queue lengths, priorities.

1. Filter printers that **fully** support settings (no silent downgrade).  
2. Filter `Ready` / `Printing` (configurable).  
3. Prefer role match (bw / color / A3 / fast / bulk).  
4. Prefer lowest queue depth, then configured priority.  
5. If empty → `NO_COMPATIBLE_PRINTER` → order `needs_review`.

## Completion detection

- Prefer spooler job completion notifications.
- Fallback: poll until job leaves queue + grace period.
- If driver cannot signal completion reliably → document printer family limitation; mark `PRINTED` only after best-effort confirmation + employee override option.

## Technical risks (Windows printing)

| Risk | Mitigation |
|------|------------|
| Drivers lie about duplex/color | Capability probe + test print; unsupported → human review |
| Completion never reported | Polling + timeout → `PRINT_FAILED` or manual confirm |
| XPS/GDI path differences | Prefer print-ready PDF; one printing pipeline |
| Ghostscript/Adobe popups | Use silent PDF print library / Windows print API; ban interactive tools |
| Service vs user session printers | Service runs in session 0 carefully; prefer user-mode worker if needed — **document choice in implementation ADR** |
| Antivirus locks temp PDFs | Retry download/open; exclusive file ACLs under ProgramData |
| Duplicate WS events | SQLite unique `cloud_job_id` |
| UI crash mid-print | Service owns job; UI resubscribes on start |

## Session 0 note

Windows Services in Session 0 may not see user-installed printers the same way. Preferred approach for Phase 1:

**Print Worker** as a tray-adjacent background process started by Tauri (or per-user Startup), not classic Session 0 service — still separate from UI process for resilience.

Document final choice in `PRINT_SERVICE.md` update when scaffolding.
