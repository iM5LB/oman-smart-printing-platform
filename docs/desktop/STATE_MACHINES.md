# State machines

## Cloud order statuses (existing)

Align with `@omsp/types` / Prisma `OrderStatus`:

```text
submitted → payment_pending → paid → review_pending → queued
  → preparing → printing → awaiting_finishing → ready → collected|completed
```

Terminal failures: `cancelled`, `failed`, `needs_review`.

Desktop must not invent conflicting order statuses; it reports print-job events that the API maps into order transitions.

## Local / cloud print job machine

### Happy path

```text
RECEIVED
  → VALIDATING
  → DOWNLOADING
  → PREPARING
  → QUEUED
  → PRINTING
  → PRINTED
  → WAITING_FINISHING   (if finishing services)
  → READY                 (signals API: ready)
```

Delivery (`DELIVERED` / collected) is an **order** action after pickup, not a spooler state.

### Failure states

```text
DOWNLOAD_FAILED
INVALID_DOCUMENT
UNSUPPORTED_SETTINGS
NO_COMPATIBLE_PRINTER
PRINTER_OFFLINE
PRINT_FAILED
CANCELLED
```

### Illegal transitions (examples)

| From | To | Allowed? |
|------|-----|----------|
| PRINTING | RECEIVED | No |
| PRINT_FAILED | READY | No |
| PRINTED | DOWNLOADING | No (use reprint = new job) |
| any failure | PRINTING | Only via explicit retry → new attempt / same job reset rules |

### Reprint

Always creates a **new** cloud + local job with new ids. Prior job remains immutable history.

## Idempotency keys

| Layer | Key |
|-------|-----|
| Cloud print job | `print_jobs.id` / `idempotency_key` |
| Local job | `local_print_jobs.id` |
| Spooler | Windows job id when available |
| Dedup | Unique index on `cloud_job_id` in SQLite |

Duplicate `print_job.created` → lookup by `cloud_job_id` → ack without second print.
