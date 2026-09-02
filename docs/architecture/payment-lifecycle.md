# Payment Lifecycle

## Currency Rules

- **Currency:** OMR (Omani Rial)
- **Display:** 3 decimal places — `1.700 ر.ع`
- **Storage:** Integer baisa (1 OMR = 1000 baisa)
  - `1.700 OMR` → stored as `1700` baisa
- **Never use floating-point** for calculations
- All arithmetic in integer baisa, divide by 1000 only for display

---

## Payment Methods

| Method | Arabic | When |
|--------|--------|------|
| `pay_at_pickup` | الدفع عند الاستلام | Customer pays at shop |
| `online` | الدفع الآن | Online payment before printing |

### In-Store Payment Recording (pickup completion)

| Method | Arabic |
|--------|--------|
| `cash` | نقداً |
| `card_pos` | بطاقة |

---

## Payment States

```
pending → processing → completed
                      → failed
                      → cancelled
                      → refunded
```

| State | Arabic (customer) |
|-------|-------------------|
| `pending` | بانتظار الدفع |
| `processing` | جاري معالجة الدفع |
| `completed` | مدفوع |
| `failed` | لم تكتمل عملية الدفع |
| `cancelled` | تم إلغاء الدفع |
| `refunded` | تم استرداد المبلغ |

For pay-at-pickup orders, payment status starts as `unpaid` until employee confirms at pickup.

---

## Online Payment Flow

```
Customer selects "الدفع الآن"
        │
        ▼
API creates Payment record (status: pending)
        │
        ▼
PaymentProvider.initialize(session)
  - amount_baisa
  - order_id
  - return_url
  - webhook_url
        │
        ▼
Customer redirected to provider payment page
        │
        ├──────────────────────────────────────┐
        ▼                                      ▼
Provider webhook (PRIMARY)              Customer return URL
POST /webhooks/payments/{provider}    (informational only)
        │
        ▼
Verify webhook signature
        │
        ▼
Idempotent update: payment.status = completed
        │
        ▼
order.payment_status = paid
order.status = paid (or queued if auto-print)
        │
        ▼
Extract phone/name from provider if available
        │
        ▼
Trigger print dispatch (if auto-print enabled)
        │
        ▼
Notify desktop via WebSocket
```

### Critical Rule

**Automatic printing MUST ONLY happen after webhook-confirmed payment from backend.**

Never trust:
- Browser redirect success
- Frontend callback
- Client-side payment token alone

---

## Payment Provider Abstraction

```typescript
interface PaymentProvider {
  name: string;
  initializePayment(params: InitPaymentParams): Promise<PaymentSession>;
  verifyWebhook(payload: unknown, signature: string): WebhookResult;
  getPaymentStatus(externalId: string): Promise<PaymentStatus>;
  refund(paymentId: string, amountBaisa: number): Promise<RefundResult>;
}

interface InitPaymentParams {
  orderId: string;
  amountBaisa: number;
  currency: 'OMR';
  customerPhone?: string;
  returnUrl: string;
  webhookUrl: string;
  metadata: Record<string, string>;
}
```

Providers can be added without changing order/print logic:
- Thawani (Oman)
- PayTabs
- Custom bank gateway
- Mock provider (development)

---

## Pricing Engine

Price calculated server-side on every option change. Client shows estimate; **server is source of truth** at checkout.

### Price Components

```
For each order item:
  pages_to_print = count from page_range
  base = per_page_rate(color, size, paper_type) × pages × copies
  sides_multiplier = duplex ? 0.5 pages billed per sheet (configurable)
  finishing = sum(service.price for each selected service)

Order total = sum(items) + tax (if configured)

Apply quantity discounts (tiered by total pages)
```

### Store Pricing Configuration

Each store configures:
- Per-page rates by (paper_size × color_mode)
- Paper type surcharges
- Finishing service prices
- Quantity discount tiers
- Tax rate (optional, store-configured)

---

## Pay-at-Pickup Policies

Store setting: `pay_at_pickup_print_policy`

| Mode | Behavior |
|------|----------|
| `auto_print` | Print immediately on order submission |
| `require_approval` | Employee must approve before print |
| `print_on_arrival` | Do not print until customer arrives |

---

## Refunds

- Manual refund via employee action (owner/manager role)
- Logged in audit trail
- Does not auto-reprint
- Refund amount in baisa, never float

---

## Receipt Generation

After in-store payment confirmation, optionally generate Arabic receipt:

```
مكتبة النور
طلب #124
─────────────────
طباعة          1.200 ر.ع
تجليد          0.500 ر.ع
─────────────────
الإجمالي       1.700 ر.ع
طريقة الدفع    نقداً
```

Stored as PDF in object storage with short TTL, or generated on-demand.
