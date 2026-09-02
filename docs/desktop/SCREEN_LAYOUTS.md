# Priority screen layouts (Phase 1)

Shell (all screens):

```text
┌──────────────────────────────────────────────┐
│ Top: title · Ctrl+K search · alerts · user   │
├────────────┬─────────────────────────────────┤
│ Sidebar    │ Main                            │
│ RTL nav    │                                 │
│ compact/   │                                 │
│ icons      │                                 │
├────────────┴─────────────────────────────────┤
│ Status: net · API · print service · sync · v │
└──────────────────────────────────────────────┘
```

## 1. Login
Centered card: branding, اسم المستخدم, كلمة المرور, تذكر الجهاز, تسجيل الدخول, connection + version. No marketing fluff.

## 2. Dashboard
- Row of compact KPIs: طلبات اليوم · الإيرادات · قيد الطباعة · جاهزة · غير مدفوعة · تحتاج مراجعة  
- Live orders table (click → drawer)  
- Printer strip + print queue column  
- Alerts list  

## 3. Orders
- Tabs with counts: الكل / جديدة / مراجعة / انتظار / طباعة / تجهيز / جاهزة / مكتملة / ملغية / فاشلة  
- Filters: search, payment, printer, date  
- Dense table: number, customer, phone, files, pages, type, payment, status, total, time, printer, actions  
- Row click → quick drawer; “فتح التفاصيل كاملة”

## 4. Order details
Header (number, status, payment, total, time) · Customer · Payment panel · Files+preview · Print config · Notes · Jobs · Timeline · contextual actions only.

## 5. Print queue
Sections: جاري الطباعة · التالي · متوقفة · فشلت · مكتملة مؤخراً  
Current job: progress, spool status, pause/cancel/open order.

## 6. Printers
Card/table toggle · status+capabilities · roles · queue size · detail drawer (diagnostics, test print).

## 7. Pickup (F2)
Fullscreen-ish counter: search field → paid path (تم التسليم) or unpaid (نقداً/بطاقة → تأكيد الدفع والتسليم).

## 8. Settings (MVP subset)
بيانات المكتبة · الطباعة التلقائية · خصوصية الملفات · الجهاز · حول.

Shared patterns: same badges, table density toggle, drawer width token, empty/skeleton states.
