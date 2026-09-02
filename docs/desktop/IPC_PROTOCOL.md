# IPC protocol — Desktop ↔ Print Service (v1)

Transport: **Windows Named Pipe**  
Name: `\\.\pipe\omsp-print-service-v1`  
Auth: local process ACL + shared HMAC secret in OS credential store (rotated on install)  
Encoding: length-prefixed JSON UTF-8  
Schema version field: `v: 1`

## Message envelope

```json
{
  "v": 1,
  "id": "uuid",
  "type": "command.print | event.job.updated | …",
  "ts": "2026-09-02T16:00:00.000Z",
  "payload": {}
}
```

Request/response correlated by `id`. Events are unsolicited (`id` new).

## Commands (UI/Tauri → Service)

| type | payload | response |
|------|---------|----------|
| `command.ping` | `{}` | `{ ok: true, serviceVersion }` |
| `command.printers.list` | `{}` | `{ printers: PrinterInfo[] }` |
| `command.printers.refresh` | `{}` | same |
| `command.print` | `PrintCommand` | `{ localJobId, accepted: true }` or error |
| `command.job.pause` | `{ localJobId }` | ack |
| `command.job.resume` | `{ localJobId }` | ack |
| `command.job.cancel` | `{ localJobId, reason }` | ack |
| `command.queue.list` | `{}` | queue snapshot |
| `command.test_print` | `{ printerId }` | ack |
| `command.diagnostics.export` | `{}` | `{ path }` |

## Events (Service → UI/Tauri)

| type | meaning |
|------|---------|
| `event.service.state` | running / degraded |
| `event.printers.changed` | discovery update |
| `event.job.updated` | state machine transition |
| `event.queue.changed` | queue snapshot hint |
| `event.error` | structured error code + Arabic message |

## PrintCommand (v1)

```json
{
  "cloudJobId": "job_uuid",
  "idempotencyKey": "job_uuid",
  "orderId": "order_uuid",
  "orderNumber": "#124",
  "filePath": "C:\\ProgramData\\OMSP\\jobs\\…\\doc.pdf",
  "checksumSha256": "…",
  "printerId": "windows-printer-name-or-id",
  "copies": 2,
  "color": false,
  "paperSize": "A4",
  "duplex": "long-edge",
  "orientation": "auto",
  "pages": "1-20",
  "collate": true
}
```

Validation: reject unknown enums; never silently downgrade color/duplex → `UNSUPPORTED_SETTINGS`.

## Errors

```json
{
  "code": "PRINTER_OFFLINE",
  "message_ar": "تعذر الاتصال بالطابعة. تحقق من أنها متصلة ثم حاول مرة أخرى.",
  "details": { "printerId": "…" }
}
```

Codes: see STATE_MACHINES.md / PRINT_SERVICE.md.
