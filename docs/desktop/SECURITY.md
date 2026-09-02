# Security

## Transport
- Cloud: HTTPS + WSS only in production.
- IPC: Named pipe with ACL limited to interactive user + LocalSystem/OMSP identity; HMAC on payload.

## Secrets
- Device token: OS credential store (Tauri plugin), never plain JSON config.
- IPC HMAC: installed at setup, rotatable.
- No passwords / full tokens / document contents in logs.

## Files
- Signed short-lived download URLs.
- SHA-256 verify before print.
- Store under `%ProgramData%\OMSP\jobs\{jobId}\` with restrictive ACLs.
- Retention default 24h; wipe on startup for expired orphans.
- Diagnostic export excludes customer PDFs by default.

## AuthZ
- Device token for machine.
- Employee session for UI actions (Phase 2 RBAC).
- Dangerous actions (refund, reprint, cancel) require elevated role when RBAC lands.

## Updates
- Signed Tauri updater artifacts only.
- Refuse unsigned installers.
