# Arabic UX Design Guidelines

## Design Principles

1. **Arabic-first** — design for RTL from the start, not flipped English
2. **Mobile-first** — majority of customers order from phones
3. **Task-focused** — customer wants to print quickly, minimize friction
4. **Trustworthy** — clean, professional, not generic AI aesthetic
5. **Price always visible** — sticky bottom summary on mobile

---

## Typography

- Primary font: **IBM Plex Sans Arabic** or **Noto Sans Arabic**
- Fallback: system Arabic fonts
- Base size: 16px mobile, 15px desktop
- Line height: 1.6 for body text
- Numbers: Arabic-Indic numerals (٠١٢٣) or Western (123) — consistent per context
- Currency always: `{amount} ر.ع` with 3 decimals

---

## Layout

- `dir="rtl"` on `<html>`
- Logical properties: `margin-inline-start` not `margin-left`
- Navigation flows right-to-left
- Icons that imply direction must be mirrored (arrows, chevrons)
- Form labels above inputs (Arabic convention)

---

## Color Palette

```
Primary:     #1B4D3E  (deep Omani green — trust, professionalism)
Primary-light: #2A6B55
Accent:      #C8952E  (warm gold — Omani cultural touch)
Background:  #FAFAF8  (warm white)
Surface:     #FFFFFF
Text:        #1A1A1A
Text-muted:  #6B7280
Success:     #16A34A
Warning:     #D97706
Error:       #DC2626
Border:      #E5E7EB
```

Avoid: excessive gradients, glass effects, giant icons, huge rounded cards.

---

## Customer Website Pages

### Store Landing (`/shop/{slug}`)

```
┌─────────────────────────────┐
│  [Logo]  مكتبة النور        │
│  📍 مسقط · 🟢 مفتوح الآن    │
├─────────────────────────────┤
│                             │
│  اطبع ملفاتك بسهولة         │
│  ارفع ملفاتك، اختر إعدادات  │
│  الطباعة، وراح تكون جاهزة   │
│  عند وصولك.                 │
│                             │
│  ┌─────────────────────┐    │
│  │    رفع الملفات      │    │
│  └─────────────────────┘    │
│                             │
│  أوقات العمل                │
│  السبت – الخميس 8ص – 10م   │
│  📞 +968 9123 4567          │
└─────────────────────────────┘
```

### Order Flow (Mobile)

Step wizard with progress indicator:

1. **رفع الملفات** — drag/drop or file picker
2. **معاينة** — document preview with page count
3. **إعدادات الطباعة** — per-document options
4. **الملخص والدفع** — summary + checkout

Sticky bottom bar on steps 3-4:

```
┌─────────────────────────────┐
│  الإجمالي    1.700 ر.ع      │
│  ┌─────────────────────┐    │
│  │      متابعة         │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

### Print Options (Simple View)

Default visible options only:
- عدد النسخ
- نوع الطباعة (أبيض وأسود / ألوان)
- حجم الورق (A4 / A3 / A5)
- وجه الطباعة (وجه واحد / وجهين)
- الصفحات المطلوبة

Hidden under "خيارات إضافية":
- اتجاه الصفحة
- نوع الورق
- صفحات لكل ورقة

---

## Desktop Application UX

- Information-dense tables for orders
- Sidebar navigation (RTL)
- Keyboard shortcuts for common actions
- Order search prominently placed (pickup workflow)
- Real-time updates without manual refresh
- Toast notifications for new orders

### Navigation

```
الرئيسية | الطلبات | قائمة الطباعة | الطابعات | المدفوعات
العملاء | التقارير | الأسعار | الإعدادات
```

---

## Error Messages

Always Arabic, always actionable:

| Bad | Good |
|-----|------|
| HTTP 500 | تعذر معالجة الملف. حاول رفعه مرة أخرى. |
| Invalid phone | رقم الهاتف غير صحيح. أدخل رقم عماني (مثال: 91234567) |
| Payment failed | لم تكتمل عملية الدفع. [إعادة المحاولة] [الدفع عند الاستلام] |
| Network error | انقطع الاتصال. سنحاول إكمال الرفع عند عودة الاتصال. |

---

## Accessibility

- Minimum touch target: 44×44px
- Focus visible states on all interactive elements
- Proper `aria-label` in Arabic
- Color contrast ratio ≥ 4.5:1
- Screen reader friendly order status updates
