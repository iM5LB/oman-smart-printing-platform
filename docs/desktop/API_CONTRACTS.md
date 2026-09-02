# Cloud API contracts (desktop)

Base: `HTTPS {API_URL}/api/v1`  
Auth: header `X-Device-Token: <device_token>`  
Money: integer **baisa** on wire; UI displays `X.XXX ر.ع` (3 decimals).

## Existing shop endpoints (reuse / extend)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/shop/me` | Store + device profile |
| GET | `/shop/stats` | Dashboard KPIs |
| GET | `/shop/orders` | Paginated orders (+ items) |
| GET | `/shop/orders/:id` | *(add if missing)* Full order detail |
| POST | `/shop/orders/:id/dispatch` | Queue for print |
| POST | `/shop/orders/:id/retry` | Retry print |
| POST | `/shop/orders/:id/ready` | Mark ready |
| POST | `/shop/orders/:id/collected` | Delivered |
| POST | `/shop/orders/:id/pay` | Pay at pickup |
| GET | `/shop/payments` | Payments list |
| GET | `/shop/customers` | Customers |
| GET | `/shop/pricing` | Rules + finishing |
| PATCH | `/shop/pricing/...` | Update prices |
| GET | `/shop/printers` | Cloud printer mappings |
| PATCH | `/shop/printers/:id` | Update mapping/roles |

## Required additions (Phase 1 gaps)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/shop/orders/:orderId` | Single order + items + timeline events |
| GET | `/shop/print-jobs` | Active/pending jobs for device |
| POST | `/shop/print-jobs/:jobId/ack` | Ack receive (idempotent) |
| POST | `/shop/print-jobs/:jobId/events` | Status transitions from device |
| GET | `/shop/files/:fileId/download` | Short-lived signed URL + checksum |
| POST | `/shop/sync` | Full resync cursor payload |
| GET | `/shop/settings` | Auto-print policy, retention, routing |

Employee login endpoints land in Phase 2; Phase 1 may use device token + local PIN lock stub.

## WebSocket (`/ws/shop`)

Events (v1):

```text
order.created
order.updated
order.cancelled
payment.confirmed
print_job.created
print_job.cancelled
settings.updated
printer_mapping.updated
```

Client must:

- Heartbeat + exponential backoff reconnect  
- Store last event cursor / `updated_at`  
- On reconnect: REST full resync (active orders + pending jobs)  
- Treat duplicate `print_job.created` as no-op if local job exists  

## Order DTO (conceptual)

```ts
type ShopOrderDto = {
  id: string;
  order_number: string;          // display "#124" / "AL-124"
  status: string;
  payment_status: string;
  payment_method: string;
  customer_name: string | null;
  customer_phone: string;        // E.164 +968…
  total_baisa: number;
  total_display: string;         // "1.700 ر.ع"
  created_at: string;
  notes: string | null;
  items: ShopOrderItemDto[];
  print_jobs?: PrintJobDto[];
};
```

## Print job DTO (conceptual)

```ts
type PrintJobDto = {
  id: string;                    // cloud job id (idempotency key)
  order_id: string;
  item_id: string;
  status: string;
  printer_id: string | null;
  settings: PrintSettingsDto;
  file: {
    file_key: string;
    filename: string;
    page_count: number;
    checksum_sha256: string;
  };
  priority: 'urgent' | 'normal' | 'low';
  idempotency_key: string;
};
```
