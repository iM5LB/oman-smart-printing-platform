# File Privacy Lifecycle

## Principles

1. Customer files may contain IDs, assignments, certificates — treat as highly sensitive
2. Files NEVER have permanent public URLs
3. Access requires signed URL + permission validation
4. Automatic deletion is default behavior
5. Customer can opt for immediate deletion after order ready

---

## Upload Flow

```
Customer uploads file
        │
        ▼
API validates:
  - MIME type (magic bytes, not just extension)
  - File size limit (store-configurable, default 50MB)
  - Reject executables, scripts, archives with executables
        │
        ▼
Store in private object storage:
  Key: stores/{store_id}/uploads/{upload_id}/{filename}
  ACL: private (no public access)
        │
        ▼
Queue background job: document.convert
  - DOCX/PPTX/XLSX → PDF
  - Images → PDF page
  - Keep original if needed
        │
        ▼
Queue background job: document.preview
  - Generate page thumbnails
  - Count pages
  - Store preview assets (also private)
        │
        ▼
Return upload_id + page_count to customer
```

---

## Access Control

### Signed URLs

- Generated on-demand with 5-minute TTL (configurable)
- Includes HMAC signature with server secret
- Scoped to: store_id + file_id + action (read)
- Desktop device must present valid device token to request signed URL

### Who Can Access

| Actor | Access |
|-------|--------|
| Customer (during order) | Via order session token |
| Desktop device | Via device auth + order assignment |
| Employee (dashboard) | Via RBAC + store scope |
| Public | NEVER |

---

## File States

```
uploading → processing → ready → attached_to_order → printed → scheduled_deletion → deleted
                                              ↓
                                         deleted (customer opt-in immediate)
```

---

## Deletion Policy

Store-configurable `file_retention_policy`:

| Policy | Arabic | When files deleted |
|--------|--------|-------------------|
| `immediate` | فوراً | After order marked completed |
| `1_hour` | بعد ساعة | 1 hour after completion |
| `24_hours` | بعد 24 ساعة | 24 hours (default) |
| `3_days` | بعد 3 أيام | 3 days |
| `7_days` | بعد 7 أيام | 7 days |

Customer checkbox option: "احذف ملفاتي مباشرة بعد تجهيز الطلب" → delete on `ready` status.

### Deletion Process

1. Background job `file.cleanup` runs on schedule
2. Delete from object storage (original + converted + previews)
3. Null out file references in DB (keep metadata: filename, page_count, size)
4. Log deletion in audit trail
5. Desktop temp files deleted immediately after print (local cleanup)

---

## Desktop Local Files

- Download to `%TEMP%/OmanPrint/{print_job_id}/`
- Delete temp directory after print completes (success or failure)
- Never copy to permanent local storage
- Background service handles cleanup even if UI is closed

---

## Security Validations

| Threat | Mitigation |
|--------|-----------|
| Executable upload | MIME validation, extension blocklist |
| Fake extension (.pdf.exe) | Magic byte check |
| Path traversal | Sanitize filenames, UUID-based paths |
| Oversized files | Size limit per store |
| Public URL guessing | Signed URLs with short TTL |
| Cross-tenant access | store_id in every query + URL scope |
| Stale file access | TTL expiration, order status check |

---

## Audit Trail

Log for every file operation:
- Upload (who, when, size, mime)
- Access (device/user, signed URL issued)
- Conversion (success/failure)
- Deletion (policy triggered, manual, customer opt-in)

Metadata retained after deletion:
- Original filename
- Page count
- File size
- Upload timestamp
- Order association
