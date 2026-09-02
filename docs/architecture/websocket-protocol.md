# WebSocket Protocol — Desktop ↔ API

## Connection

```
wss://api.example.om/ws/shop?device_token={token}
```

- Device authenticates with long-lived device token (issued at registration)
- Token revocable by store admin
- Heartbeat every 30s; disconnect after 3 missed heartbeats
- Reconnect with exponential backoff (1s → 2s → 4s → max 60s)

---

## Message Envelope

All messages use JSON:

```typescript
interface WsMessage {
  type: string;
  payload: unknown;
  timestamp: string;  // ISO 8601
  message_id: string; // UUID for ack tracking
}
```

---

## Server → Desktop Events

| Type | Description |
|------|-------------|
| `order.created` | New customer order |
| `order.updated` | Status/payment change |
| `order.cancelled` | Order cancelled |
| `print.dispatch` | Send document to printer |
| `print.cancel` | Cancel in-progress print job |
| `config.updated` | Store settings changed |
| `device.revoked` | Force disconnect |

### `order.created`

```json
{
  "type": "order.created",
  "payload": {
    "order_id": "uuid",
    "order_number": "124",
    "customer_name": "أحمد",
    "customer_phone": "+96891234567",
    "payment_status": "paid",
    "total_baisa": 1300,
    "item_count": 1,
    "total_pages": 20,
    "summary": "24 صفحة — أبيض وأسود — وجهين"
  }
}
```

### `print.dispatch`

```json
{
  "type": "print.dispatch",
  "payload": {
    "print_job_id": "uuid",
    "order_id": "uuid",
    "order_item_id": "uuid",
    "idempotency_key": "order_uuid:1",
    "document_url": "https://signed-url...",
    "document_expires_at": "2026-09-02T12:00:00Z",
    "settings": {
      "copies": 2,
      "color_mode": "bw",
      "paper_size": "A4",
      "sides": "duplex_long",
      "orientation": "auto",
      "page_range": "all"
    },
    "suggested_printer_id": "uuid",
    "priority": "urgent"
  }
}
```

---

## Desktop → Server Events

| Type | Description |
|------|-------------|
| `device.hello` | Initial handshake with capabilities |
| `device.heartbeat` | Keep-alive |
| `printer.sync` | Report installed printers + status |
| `print.status` | Print job progress update |
| `print.completed` | Job finished successfully |
| `print.failed` | Job failed with reason |
| `order.action` | Employee action (ready, delivered, etc.) |

### `device.hello`

```json
{
  "type": "device.hello",
  "payload": {
    "device_id": "uuid",
    "app_version": "1.0.0",
    "os_version": "Windows 11",
    "printers": [
      {
        "os_name": "HP LaserJet M428",
        "status": "online",
        "capabilities": {
          "supports_color": false,
          "supports_duplex": true,
          "paper_sizes": ["A4", "A5"]
        }
      }
    ]
  }
}
```

### `print.completed`

```json
{
  "type": "print.completed",
  "payload": {
    "print_job_id": "uuid",
    "order_id": "uuid",
    "printer_os_name": "HP LaserJet M428",
    "pages_printed": 20,
    "copies": 2,
    "duration_ms": 45000
  }
}
```

### `print.failed`

```json
{
  "type": "print.failed",
  "payload": {
    "print_job_id": "uuid",
    "order_id": "uuid",
    "reason_code": "printer_offline",
    "reason_message": "الطابعة غير متصلة"
  }
}
```

---

## Acknowledgment

Desktop must ack critical messages within 10s:

```json
{
  "type": "ack",
  "payload": { "message_id": "original-message-uuid" }
}
```

Unacked `print.dispatch` messages are retried up to 3 times with backoff.

---

## Offline Sync Protocol

On reconnect, desktop sends:

```json
{
  "type": "device.sync",
  "payload": {
    "last_sync_at": "2026-09-02T10:00:00Z",
    "pending_statuses": [
      { "print_job_id": "uuid", "status": "completed", "completed_at": "..." }
    ],
    "processed_job_ids": ["uuid1", "uuid2"]
  }
}
```

Server responds with missed events since `last_sync_at`, excluding already-processed job IDs.
