# Offline sync & idempotency

## Goals

- Already-downloaded jobs keep printing offline.
- No double physical prints on reconnect / duplicate events.
- Local completions sync when network returns.

## Idempotency strategy

1. Cloud assigns `print_job.id` + `idempotency_key`.  
2. Local table unique on `cloud_job_id`.  
3. Before `SubmitAsync`, check local row state ∈ {QUEUED, PRINTING, PRINTED, …} → skip submit.  
4. Sync POSTs include `Idempotency-Key` header = `cloud_job_id + ":" + state`.  
5. Spooler id stored when available for diagnostics only (not primary key).

## Offline behavior

| Situation | Behavior |
|-----------|----------|
| Offline, file on disk, job QUEUED/PRINTING | Continue |
| Offline, need download | Stay DOWNLOADING/DOWNLOAD_FAILED; no print |
| Offline, completion | Write local state + `pending_sync_events` |
| Online again | Flush pending sync FIFO; then REST resync |

## Full resync (after reconnect)

1. `GET /shop/print-jobs?status=active`  
2. `GET /shop/orders?status=active` (paginated)  
3. Compare by ids:  
   - Missing local → create RECEIVED (do not auto-print if already PRINTED remotely)  
   - Local PRINTED / remote still QUEUED → push events  
   - Conflicts → prefer “more advanced” non-failure state; log audit  

## Never

- Reset a PRINTED job to PRINTING because of a duplicate event.  
- Delete pending_sync without server ack.
