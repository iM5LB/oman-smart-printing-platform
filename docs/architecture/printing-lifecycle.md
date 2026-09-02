# Printing Lifecycle

## Print Job States

| Internal | Arabic UI |
|----------|-----------|
| `queued` | في قائمة الانتظار |
| `preparing` | جاري التحضير |
| `downloading` | جاري التحميل |
| `printing` | جاري الطباعة |
| `completed` | اكتملت الطباعة |
| `failed` | فشلت الطباعة |
| `paused` | متوقفة |
| `cancelled` | ملغاة |

---

## End-to-End Print Dispatch

```
Order paid (webhook confirmed) OR submitted (pay-at-pickup + auto policy)
        │
        ▼
Backend: validate document (page count, conversion status, corruption check)
        │
        ▼
Printer Routing Engine
  - Match: paper_size, color_mode, duplex, orientation
  - Filter: online/available printers for this store
  - Prefer: lower queue length, configured role match
        │
        ├─ No compatible printer ──► order.status = needs_review
        │                              Notify employee (Arabic alert)
        ▼
Create PrintJob (unique print_job_id, idempotency key)
        │
        ▼
WebSocket → Desktop: print.dispatch
  {
    print_job_id,
    order_id,
    document_signed_url (short TTL),
    settings: { copies, color, size, duplex, page_range, orientation },
    printer_hint_id (optional)
  }
        │
        ▼
Desktop Background Service:
  1. Verify idempotency (skip if print_job_id already processed)
  2. Download document to temp directory
  3. Validate printer capabilities
  4. Apply OS print settings (NOT just visual — actual driver settings)
  5. Submit to Windows print spooler
  6. Monitor spooler until complete/failed
        │
        ├─ Success ──► report print.completed
        │              order → awaiting_finishing OR ready
        │
        └─ Failure ──► report print.failed { reason }
                       order → needs_review
                       NO duplicate job created
```

---

## Printer Capability Model

Each registered printer has:

```typescript
interface PrinterCapabilities {
  name: string;                    // OS printer name
  status: 'online' | 'offline' | 'error' | 'busy';
  supports_color: boolean;
  supports_duplex: boolean;
  supported_paper_sizes: PaperSize[];  // A4, A3, A5
  roles: PrinterRole[];            // bw_a4, color_a4, photo
  queue_length: number;
}
```

### Auto-Routing Rules

1. **Hard filter:** paper size must be supported
2. **Hard filter:** color job → color-capable printer only
3. **Hard filter:** duplex requested → duplex-capable printer
4. **Soft prefer:** printer with matching role (e.g. `bw_a4`)
5. **Soft prefer:** lower queue length
6. **If tie:** store-configured default for that role

### Validation Before Print

Never send unsupported configuration. If validation fails:
- Pause order
- Status → `needs_review`
- Message: "لا توجد طابعة متوافقة مع إعدادات هذا الطلب."

---

## OS Print Settings Mapping

Customer selections MUST map to actual Windows print driver settings:

| Customer Option | Arabic | Windows Setting |
|-----------------|--------|-----------------|
| A4 | A4 | PaperSize = A4 |
| Color | ألوان | Color = true |
| B&W | أبيض وأسود | Color = false |
| Single | وجه واحد | Duplex = Simplex |
| Double | وجهين | Duplex = Vertical/Horizontal |
| Long edge flip | قلب من الحافة الطويلة | Duplex = Vertical |
| Short edge flip | قلب من الحافة القصيرة | Duplex = Horizontal |
| Copies | عدد النسخ | Copies = N |
| Page range | 1-5, 8, 12-20 | PageRange parsed |

---

## Duplicate Print Protection

Every print job has:
- `print_job_id` (UUID, globally unique)
- `idempotency_key` = `{order_id}:{attempt_number}`

Rules:
1. Desktop checks local idempotency store before printing
2. Backend rejects duplicate dispatch with same idempotency_key
3. Network reconnect → sync status, never re-dispatch completed jobs
4. Reprint requires explicit employee action → new print_job_id, audit logged

---

## Offline Resilience

When shop loses internet:
- Already-downloaded documents may continue printing
- Local SQLite stores job status
- On reconnect:
  - Push completed/failed statuses to backend
  - Pull any missed orders
  - Idempotency prevents double-print

---

## Finishing Workflow

If order includes finishing services (stapling, binding, etc.):
- After print completes → order status `awaiting_finishing`
- Employee performs manual work
- Clicks "جاهز للاستلام" → `ready`
- Trigger customer notification

If no finishing services:
- After print completes → `ready` directly
- Trigger customer notification

---

## Manual Override

Employee can:
- Change selected printer
- Adjust queue priority (عاجل / عادي / منخفض)
- Override print settings

All overrides logged in audit trail with employee ID and reason.

---

## Reprint Workflow

1. Employee clicks "إعادة المحاولة" or "طباعة"
2. System prompts for reason (optional)
3. New `print_job_id` created (not reuse of old)
4. Audit log: who, when, reason, printer
5. Old failed job marked, not deleted

---

## Local File Cleanup

Desktop temp files deleted after:
- Print job completes (success or failure)
- Configurable delay (default: immediately)

Never permanently store customer documents on desktop unless explicitly configured.

---

## Queue Priority

| Priority | Arabic | Typical Use |
|----------|--------|-------------|
| `urgent` | عاجل | Paid online orders (configurable) |
| `normal` | عادي | Standard orders |
| `low` | منخفض | Bulk/batch jobs |

Store configures whether paid-online orders auto-elevate to urgent.
