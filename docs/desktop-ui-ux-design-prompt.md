# Professional UI/UX Design Prompt — Oman Smart Printing Desktop Application

Design a complete, production-ready desktop application UI/UX for a smart printing platform used by printing shops, libraries, stationery stores, copy centers, and university printing centers in the Sultanate of Oman.

This prompt is specifically for the **print shop desktop application**, not the customer website.

The application is installed on the shop's Windows computer and is responsible for receiving customer printing orders, controlling printers, monitoring print queues, handling payments, preparing orders, and managing pickup.

The design must cover the entire application, including every major page, modal, state, empty state, notification, and workflow.

---

# 1. Core Product Goal

The application should allow a print shop employee to manage the entire printing operation from one place.

The key workflow is:

Customer submits an order from the website

↓

Order appears instantly in the desktop app

↓

System checks payment and print settings

↓

System selects a compatible printer

↓

Order is sent to print automatically or waits for approval

↓

Employee monitors progress

↓

Employee performs manual finishing if required

↓

Order is marked ready

↓

Customer receives notification

↓

Customer arrives and provides the order number

↓

Employee confirms payment if required

↓

Order is handed to customer

The desktop app should make this entire workflow extremely fast and easy.

---

# 2. Target Platform

Primary platform:

Windows 10

Windows 11

Desktop monitors

Laptop screens

Typical resolutions:

1366 × 768

1440 × 900

1920 × 1080

2560 × 1440

4K displays

The layout must remain usable across all these sizes.

The application should adapt responsively when the window is resized.

---

# 3. Language

The application is designed for Oman.

Primary language:

Arabic

Entire layout:

RTL

All navigation, tables, dialogs, buttons, forms, notifications, and statuses must be Arabic-first.

Use natural Arabic UI wording.

Do not design an English interface and simply mirror it.

The UI must feel natively designed for Arabic users.

---

# 4. Currency

Use Omani Rial.

Display:

0.500 ر.ع

1.250 ر.ع

12.750 ر.ع

Always use three decimal places where appropriate.

---

# 5. Overall Visual Direction

Create a premium professional business application.

The design should feel:

- Modern
- Reliable
- Clean
- Fast
- Operational
- Professional
- Dense enough for real business use
- Easy to scan quickly

Avoid generic AI dashboard appearance.

Do not overuse:

- Gradients
- Glassmorphism
- Huge rounded cards
- Excessive glow
- Neon effects
- Decorative animations
- Oversized icons
- Large empty areas

The app should feel similar in quality to professional POS, logistics, productivity, or business-management software.

The user is working, not browsing a marketing website.

Prioritize operational speed.

---

# 6. Visual Theme

Use a premium dark theme as the primary desktop theme.

Suggested direction:

Background:
Very dark navy / graphite

Panels:
Slightly lighter dark surfaces

Primary accent:
Professional blue

Success:
Green

Warning:
Amber

Danger:
Red

Inactive:
Neutral gray

Do not make colors overly saturated.

Use subtle borders instead of heavy shadows.

Support light mode in the future, but design dark mode first.

---

# 7. Application Shell

Use a persistent desktop layout.

Main structure:

Left sidebar

Top header

Main content area

Optional right-side contextual panel

Bottom connection/status bar

Because the interface is RTL, ensure navigation direction is handled naturally.

Do not blindly mirror layouts where usability is worse.

---

# 8. Sidebar Navigation

Main sections:

- الرئيسية
- الطلبات
- قائمة الطباعة
- الطابعات
- المدفوعات
- العملاء
- الأسعار والخدمات
- التقارير
- الموظفون
- الإشعارات
- سجل العمليات
- الإعدادات

Bottom section:

Current employee profile

Store/branch name

Logout

Connection status

App version

---

# 9. Sidebar Behavior

Desktop:

Full sidebar with icons and labels.

Smaller window:

Allow compact collapsed sidebar with icons only.

Hover shows tooltips.

Active section should be obvious.

Avoid oversized navigation items.

---

# 10. Top Header

Include:

Page title

Optional subtitle

Global search

Notifications

Printer alerts

Current time

Branch selector if multi-branch exists

Employee avatar/profile menu

Example:

"لوحة التحكم"

"نظرة عامة على عمليات اليوم"

---

# 11. Global Search

Prominent but compact search.

Search:

- Order number
- Customer name
- Phone number
- Printer
- Payment reference

Keyboard shortcut:

Ctrl + K

Example placeholder:

"ابحث برقم الطلب، الاسم أو رقم الهاتف..."

Search results should appear immediately.

---

# 12. Dashboard — الرئيسية

Design a powerful operations dashboard.

Top KPI cards:

طلبات اليوم

الإيرادات اليوم

قيد الطباعة

جاهزة للاستلام

غير مدفوعة

طلبات تحتاج مراجعة

Cards must remain compact.

Do not use giant cards.

---

# 13. Dashboard KPI Example

طلبات اليوم

27

+15% عن أمس

---

الإيرادات

42.350 ر.ع

---

قيد الطباعة

8

---

جاهزة للاستلام

6

---

# 14. Dashboard — Live Orders Table

Main table:

"الطلبات المباشرة"

Columns:

رقم الطلب

اسم العميل

رقم الهاتف

الخدمة

الحالة

الدفع

السعر

وقت الطلب

الطابعة

Actions

Statuses use clear colored badges.

Example:

#124

سعيد الحارثي

+968 9876 5432

طباعة مستندات

جاري الطباعة

مدفوع

1.700 ر.ع

10:32 ص

HP M404dn

---

# 15. Dashboard — Printer Overview

Section:

"حالة الطابعات"

Display compact printer cards/list.

Each printer:

Printer name

Model

Status

Queue count

Current job

Capability badges

Examples:

HP LaserJet M404dn

● متصلة

A4

أبيض وأسود

وجهين

3 طلبات

---

Brother HL-L8360CDW

● جاري الطباعة

ألوان

A4

5 طلبات

---

Epson L8050

● غير متصلة

---

# 16. Dashboard — Current Print Queue

Section:

"قائمة الطباعة الآن"

Display current job with:

File icon

File name

Order number

Customer

Pages

Progress bar

Printer

Percentage

Estimated completion

Example:

تقرير المشروع.pdf

#124

40%

HP LaserJet M404dn

---

Below:

"التالي في الطابور"

Compact upcoming jobs.

---

# 17. Dashboard — Alerts

Critical alerts should be visible but not intrusive.

Examples:

"الطابعة Brother غير متصلة"

"نفد الورق من طابعة HP"

"هناك 3 طلبات تحتاج مراجعة"

"فشل إرسال إشعار للطلب #142"

Use alert center or compact cards.

---

# 18. Orders Page — الطلبات

Create a professional order-management page.

Top controls:

Search

Filters

Status

Payment

Date

Printer

Employee

Service

Sort

Export

New manual order

---

# 19. Order Status Tabs

Tabs:

الكل

جديدة

تحتاج مراجعة

بانتظار الطباعة

جاري الطباعة

بانتظار التجهيز

جاهزة للاستلام

مكتملة

ملغية

فاشلة

Show counts.

Example:

جاهزة للاستلام 12

---

# 20. Orders Table

Columns:

رقم الطلب

العميل

الهاتف

الملفات

الصفحات

نوع الطباعة

الدفع

الحالة

الإجمالي

وقت الطلب

Actions

Allow:

Column resizing

Sorting

Pagination

Row selection

Bulk actions when safe

---

# 21. Order Row Quick Actions

On hover or action menu:

فتح الطلب

طباعة

إعادة الطباعة

تغيير الحالة

تغيير الطابعة

اتصال بالعميل

نسخ رقم الهاتف

إرسال إشعار

إلغاء

---

# 22. Order Detail Page

This is one of the most important screens.

Design it carefully.

Suggested structure:

Main content:
Order/file details

Right contextual panel:
Customer, payment, status, actions

---

# 23. Order Detail Header

Display:

#124

Status badge

Payment badge

Order creation time

Customer name

Phone number

Actions

Example:

طلب #124

جاري الطباعة

مدفوع

تم إنشاؤه اليوم 10:32 ص

---

# 24. File Information

Section:

"الملفات"

Display each file separately.

For each:

File icon

File name

File type

File size

Pages

Preview button

Download/open button if permitted

Example:

تقرير المشروع.pdf

25 صفحة

2.4 MB

[معاينة]

---

# 25. Document Preview

Provide professional document preview.

Large center page

Page thumbnails

Zoom

Previous/next

Rotate

Selected pages highlighted

Fullscreen preview

Do not make employees open another external app unless necessary.

---

# 26. Print Configuration Card

Display exact customer selections.

Fields:

عدد النسخ

نوع الطباعة

حجم الورق

وجه الطباعة

اتجاه الصفحة

الصفحات المطلوبة

نوع الورق

خدمة إضافية

Example:

عدد النسخ
2

اللون
أبيض وأسود

الحجم
A4

الطباعة على الوجهين
نعم

الصفحات
الكل

التدبيس
نعم

---

# 27. Customer Notes

Separate visible card:

"ملاحظات العميل"

Example:

"يرجى تدبيس الأوراق من الأعلى."

Do not hide notes.

---

# 28. Customer Information Panel

Display:

الاسم

رقم الهاتف

Previous order count if customer already exists

Optional customer notes

Buttons:

اتصال

نسخ الرقم

إرسال رسالة

---

# 29. Payment Information Panel

Display prominently:

حالة الدفع

طريقة الدفع

الإجمالي

Payment reference if online

Payment timestamp

Examples:

مدفوع

دفع إلكتروني

1.700 ر.ع

or

غير مدفوع

الدفع عند الاستلام

1.700 ر.ع

---

# 30. Main Order Actions

Buttons should change according to state.

Possible actions:

طباعة الآن

إيقاف الطباعة

إعادة المحاولة

اختيار طابعة أخرى

بانتظار التجهيز

جاهز للاستلام

تسجيل الدفع

تم التسليم

إلغاء الطلب

Do not show irrelevant actions.

---

# 31. Print Button

Primary printing button.

Example:

"طباعة الآن"

Include printer icon.

If automatic printing is enabled, display:

"تمت جدولة الطباعة تلقائياً"

---

# 32. Print Confirmation Modal

When manual print is clicked:

Display:

Order

Printer

Pages

Copies

Color

Duplex

Paper size

Estimated sheets

Buttons:

إلغاء

تأكيد الطباعة

For sensitive reprints show stronger confirmation.

---

# 33. Reprint Modal

Title:

"إعادة طباعة الطلب"

Require:

Printer selection

Reason

Optional pages

Copies

Clearly warn:

"سيتم إنشاء مهمة طباعة إضافية."

Button:

"تأكيد إعادة الطباعة"

Log employee identity.

---

# 34. Cancel Order Modal

Ask:

سبب الإلغاء

Options:

طلب العميل

مشكلة في الملف

تعذر الطباعة

تعذر الدفع

سبب آخر

Text field when needed.

Button:

إلغاء الطلب

Use red danger style.

---

# 35. Print Queue Page — قائمة الطباعة

Design like a real production queue.

Columns:

الترتيب

رقم الطلب

الملف

الطابعة

الصفحات

النسخ

الأولوية

الحالة

التقدم

وقت الانتظار

Actions

---

# 36. Queue Sections

Separate:

جاري الطباعة

التالي

متوقفة

فشلت

مكتملة مؤخراً

---

# 37. Current Printing Card

Highlight current job.

Example:

#124

تقرير المشروع.pdf

HP LaserJet M404dn

صفحة 14 من 25

56%

الوقت المتبقي: دقيقة تقريباً

Buttons:

إيقاف مؤقت

إلغاء

فتح الطلب

---

# 38. Queue Reordering

Employees with permission can change job priority.

Options:

عاجل

عادي

منخفض

Drag and drop may be supported if reliable.

Do not make queue reordering too easy to trigger accidentally.

---

# 39. Failed Print Job

Display:

#130

تعذر الطباعة

Reason:

"الطابعة غير متصلة"

Actions:

إعادة المحاولة

اختيار طابعة أخرى

فتح الطلب

---

# 40. Printers Page — الطابعات

Display all printers.

Use both card and table view options.

Each printer:

Name

Model

Connection status

Current status

Queue

Paper size

Color

Duplex

Default role

Last activity

---

# 41. Printer Status Visuals

States:

جاهزة

جاري الطباعة

متوقفة

غير متصلة

خطأ

لا يوجد ورق

حبر منخفض

Use consistent status colors.

---

# 42. Printer Detail Page

Header:

Printer name

Online status

Test print

Pause queue

Settings

---

Sections:

Current status

Current job

Queue

Capabilities

Statistics

Configuration

Diagnostics

---

# 43. Printer Capabilities

Display:

A4

A3

ألوان

أبيض وأسود

وجهين

طباعة صور

سرعة الطباعة

Driver

Connection type

---

# 44. Printer Role Configuration

Allow assigning role:

طابعة أبيض وأسود

طابعة ألوان

طابعة صور

طابعة A3

طابعة عالية الكمية

Allow multiple roles.

---

# 45. Printer Routing Settings

Configure:

Automatic routing

Priority

Maximum queue

Supported sizes

Allowed job types

Allow auto fallback

Example:

"استخدم هذه الطابعة تلقائياً لطلبات A4 أبيض وأسود"

---

# 46. Test Print

Button:

"طباعة صفحة اختبار"

Show result toast:

"تم إرسال صفحة الاختبار للطابعة."

or error.

---

# 47. Payments Page — المدفوعات

Display payment transactions.

Filters:

Today

Date range

Payment method

Status

Employee

Order

---

# 48. Payments Table

Columns:

رقم العملية

رقم الطلب

العميل

المبلغ

طريقة الدفع

الحالة

وقت العملية

الموظف

---

Statuses:

مدفوع

غير مدفوع

مسترد

فشل

ملغي

---

# 49. Record Pay-at-Pickup Payment

Modal:

Order #124

Amount:

1.700 ر.ع

Payment method:

نقداً

بطاقة

Other allowed options

Buttons:

إلغاء

تأكيد الدفع

---

# 50. Refund Modal

Show:

Original payment

Refund amount

Reason

Employee

Buttons:

إلغاء

تنفيذ الاسترداد

Use clear warnings.

---

# 51. Customers Page — العملاء

Customer list.

Columns:

الاسم

رقم الهاتف

عدد الطلبات

إجمالي الإنفاق

آخر طلب

آخر زيارة

---

# 52. Customer Detail Page

Show:

Name

Phone

Order history

Total orders

Total spending

Most used service

Notes

Actions:

Call

Send notification

Create order

---

# 53. Pricing Page — الأسعار والخدمات

This page must be easy for shop owners.

Tabs:

أسعار الطباعة

الخدمات الإضافية

خصومات الكمية

---

# 54. Print Pricing Table

Example:

A4

أبيض وأسود

0.020 ر.ع

A4

ألوان

0.100 ر.ع

A3

أبيض وأسود

0.050 ر.ع

Editable inline or via modal.

---

# 55. Price Edit Modal

Fields:

Paper size

Print type

Single/duplex

Price

Quantity tier

Active

Button:

حفظ

---

# 56. Services Page

Cards/table for:

تدبيس

تجليد

تغليف حراري

قص

تخريم

Other

Display:

Price

Estimated preparation time

Active status

---

# 57. Add Service Modal

Fields:

اسم الخدمة

الوصف

السعر

وقت التجهيز

متاحة

Optional icon

---

# 58. Reports Page — التقارير

Create a business analytics page.

Top metrics:

مبيعات اليوم

مبيعات الشهر

عدد الطلبات

عدد الصفحات

متوسط قيمة الطلب

---

# 59. Reports Charts

Use meaningful charts only.

Charts:

الإيرادات حسب اليوم

الطلبات حسب اليوم

أكثر أنواع الطباعة

المدفوعات حسب الطريقة

استخدام الطابعات

Do not use decorative meaningless charts.

---

# 60. Reports Filters

Date range

Branch

Employee

Printer

Payment method

Service

Export:

PDF

Excel

CSV

---

# 61. Employees Page — الموظفون

Display:

Name

Role

Status

Last login

Orders handled

Permissions

---

# 62. Employee Roles

مالك

مدير

كاشير

موظف طباعة

موظف

---

# 63. Employee Detail

Fields:

Name

Phone

Username

Role

Permissions

Account status

Last login

Actions:

Reset password

Suspend

Edit permissions

---

# 64. Employee Permissions UI

Permission groups:

الطلبات

الطباعة

المدفوعات

الأسعار

التقارير

الموظفون

الإعدادات

Use toggles/checklists.

---

# 65. Notifications Center — الإشعارات

Tabs:

الكل

طلبات

طابعات

مدفوعات

النظام

---

Example notifications:

"طلب جديد #124"

"تم الدفع للطلب #125"

"الطابعة HP غير متصلة"

"الطلب #121 جاهز للاستلام"

---

# 66. Notification Detail

Display:

Type

Time

Related order

Message

Actions

Mark read

---

# 67. Audit Log — سجل العمليات

For administrators.

Columns:

الموظف

الإجراء

القسم

التفاصيل

التاريخ

IP/device when relevant

Example:

أحمد

غيّر سعر A4 أبيض وأسود

0.020 → 0.025 ر.ع

10:15 ص

---

# 68. Settings Page — الإعدادات

Use grouped sections.

Navigation inside settings:

بيانات المكتبة

الفروع

الطباعة

الدفع

الإشعارات

الطلبات

الملفات والخصوصية

الحسابات

الأمان

الجهاز

المظهر

حول البرنامج

---

# 69. Store Settings

Fields:

اسم المكتبة

الشعار

رقم الهاتف

المحافظة

الولاية

المنطقة

الموقع

أوقات العمل

---

# 70. Printing Settings

Settings:

الطباعة التلقائية للطلبات المدفوعة

طباعة طلبات الدفع عند الاستلام

Require employee approval

Automatic printer routing

Fallback printer

Queue behavior

Default print settings

---

# 71. Pay-at-Pickup Policy

Radio options:

طباعة تلقائياً

تحتاج موافقة الموظف

انتظار وصول العميل

Explain each briefly.

---

# 72. Payment Settings

Configure:

Online payment

Pay at pickup

Cash

Physical card payment

Payment provider

Store payment credentials

Test connection

---

# 73. Notification Settings

Configure:

SMS

WhatsApp

Notification templates

Send when:

Order received

Payment confirmed

Ready for pickup

Cancelled

---

# 74. Privacy Settings

File retention:

حذف فوراً

بعد ساعة

بعد 24 ساعة

بعد 3 أيام

بعد 7 أيام

Default:

24 hours

Also:

Delete local cached files after printing

---

# 75. Device Settings

Display:

Computer name

Device ID

Windows version

App version

Last sync

Connection status

Connected printers

Actions:

Reconnect

Sync now

Restart print service

---

# 76. Appearance Settings

Dark mode

Light mode

System mode

Font size

Compact table mode

---

# 77. Application Update Screen

Display:

Current version

Latest version

Release channel

Stable

Beta

Button:

Check for updates

Install update

Restart application

---

# 78. Onboarding — First Launch

Design a polished setup wizard.

---

# 79. Onboarding Step 1

"مرحباً بك"

Explain:

"سنساعدك في إعداد المكتبة خلال دقائق."

Button:

ابدأ الإعداد

---

# 80. Onboarding Step 2

Store information.

---

# 81. Onboarding Step 3

Set basic prices.

---

# 82. Onboarding Step 4

Detect printers.

Display discovered printers.

Allow selecting printers to connect.

---

# 83. Onboarding Step 5

Printer roles.

Example:

HP LaserJet

أبيض وأسود

Brother

ألوان

---

# 84. Onboarding Step 6

Choose order behavior.

Online paid:

Print automatically?

Pay at pickup:

Print automatically / approve / wait

---

# 85. Onboarding Step 7

Notifications.

Phone/SMS/WhatsApp integration.

---

# 86. Onboarding Step 8

Test order.

Provide:

"إنشاء طلب تجريبي"

Then:

Print test.

---

# 87. Onboarding Complete

Show:

"أصبحت مكتبتك جاهزة لاستقبال الطلبات"

Display:

Customer URL

QR code

Button:

فتح لوحة التحكم

---

# 88. Pickup Mode

Create a special fast screen designed for counter pickup.

Shortcut:

F2 or dedicated navigation.

Large search:

"أدخل رقم الطلب"

Example:

124

Display result immediately.

---

# 89. Pickup Result

Order #124

سعيد الحارثي

1.700 ر.ع

Status:

جاهز للاستلام

Payment:

مدفوع

Large button:

"تم التسليم"

---

# 90. Unpaid Pickup

Display:

غير مدفوع

Amount:

1.700 ر.ع

Buttons:

دفع نقدي

دفع بالبطاقة

Then:

تم التسليم

This workflow should be extremely fast.

---

# 91. Manual Order Creation

Employees can create orders for walk-in customers.

Button:

"طلب جديد"

Workflow:

Customer info

Upload/select file

Printing options

Price

Payment

Print

---

# 92. Manual Order Wizard

Step 1:
العميل

Step 2:
الملفات

Step 3:
خيارات الطباعة

Step 4:
السعر

Step 5:
الدفع والطباعة

---

# 93. Empty States

Design every important empty state.

Examples:

No orders:

"لا توجد طلبات حالياً"

"ستظهر الطلبات الجديدة هنا فور وصولها."

No printers:

"لم يتم العثور على طابعات"

Button:

"إضافة طابعة"

No payments:

"لا توجد عمليات دفع"

No customers:

"لم يتم تسجيل عملاء بعد"

---

# 94. Loading States

Use skeleton loading.

Avoid large spinners covering the entire app.

For tables:

Skeleton rows.

For order details:

Skeleton content blocks.

---

# 95. Error States

Example:

"تعذر تحميل الطلبات"

"تحقق من اتصال الإنترنت وحاول مرة أخرى."

Buttons:

إعادة المحاولة

---

# 96. Offline State

When internet connection is lost:

Persistent but subtle banner:

"غير متصل بالإنترنت"

"سيستمر تنفيذ مهام الطباعة التي تم تنزيلها مسبقاً."

Bottom status bar should show red/offline state.

---

# 97. Reconnecting State

Banner:

"جاري إعادة الاتصال..."

When restored:

Toast:

"تم استعادة الاتصال."

---

# 98. Toast Notifications

Use compact toast system.

Examples:

Success:

"تم تحديث الطلب."

Warning:

"الطابعة غير متصلة."

Error:

"فشلت عملية الطباعة."

Information:

"تم استلام طلب جديد #124."

---

# 99. Critical Modal

For serious issues:

"لا توجد طابعة متوافقة"

Request:

A3

ألوان

وجهين

Options:

اختيار طابعة يدوياً

إبقاء الطلب معلقاً

---

# 100. Printer Error Modal

Example:

"تعذر إكمال الطباعة"

Printer:

HP LaserJet

Error:

نفد الورق

Buttons:

إعادة المحاولة

اختيار طابعة أخرى

إلغاء المهمة

---

# 101. Automatic Printing Indicator

For orders printed automatically, clearly show:

"طباعة تلقائية"

This allows employees to distinguish automated and manual jobs.

---

# 102. Order Timeline

Inside order details display timeline:

10:30
تم استلام الطلب

10:31
تم الدفع

10:31
أرسل للطباعة

10:32
بدأت الطباعة

10:34
تمت الطباعة

10:35
جاهز للاستلام

Useful for debugging and customer service.

---

# 103. Right-Side Detail Drawer

For fast workflows, allow clicking an order row to open a side drawer instead of navigating away.

Drawer shows:

Basic customer info

Print configuration

Price

Status

Quick actions

Button:

"فتح التفاصيل كاملة"

---

# 104. Context Menus

Use right-click context menu where useful.

Example order context:

فتح

طباعة

إعادة الطباعة

تغيير الحالة

نسخ رقم الطلب

إرسال إشعار

---

# 105. Keyboard Shortcuts

Support professional employee workflows.

Ctrl + K
Search

Ctrl + N
New order

F2
Pickup screen

P
Print selected order where safe

R
Refresh/retry

Esc
Close dialog

Show shortcuts in tooltips.

---

# 106. Tables

Tables must support:

RTL

Sticky headers

Sorting

Filters

Pagination

Hover state

Row selection

Compact density

Do not make tables excessively tall.

---

# 107. Arabic Typography

Use a clean professional Arabic typeface.

Requirements:

Good readability at small sizes

Strong numerals

Clear weights

No overly decorative Arabic font

Maintain correct mixed Arabic/English rendering for:

PDF filenames

Printer names

Phone numbers

Order IDs

---

# 108. Spacing

Use consistent spacing system.

Avoid giant padding.

Dashboard should comfortably fit useful information on a 1080p monitor.

---

# 109. Buttons

Primary:
Blue

Success:
Green

Danger:
Red

Secondary:
Dark neutral

Use icons where useful.

Examples:

طباعة

جاهز للاستلام

تم التسليم

---

# 110. Status Badge System

Design consistent badges.

Order statuses:

جديد

قيد المراجعة

في الانتظار

جاري الطباعة

بانتظار التجهيز

جاهز للاستلام

مكتمل

ملغي

فشل

Payment statuses:

مدفوع

غير مدفوع

مسترد

---

# 111. Iconography

Use one clean icon library.

Use simple line icons.

Avoid mixed icon styles.

Icons should support concepts:

Orders

Print

Printer

Payment

Customer

Reports

Settings

Search

Notifications

---

# 112. Accessibility

Ensure:

Readable contrast

Keyboard navigation

Focus states

Tooltips

Large enough click targets

Do not communicate status using only color.

Include icon/text.

---

# 113. Responsive Desktop Behavior

At 1920×1080:

Show sidebar, main content, and contextual panel.

At 1366×768:

Reduce padding.

Collapse secondary information.

Allow contextual panel to become drawer.

Never horizontally overflow critical pages.

---

# 114. Fullscreen Queue Mode

Optional useful feature.

Allow print queue page to enter fullscreen mode.

Designed for shop operational monitor.

Display:

Current jobs

Printer statuses

Failed jobs

Ready orders

---

# 115. Customer Waiting Screen

Optional display mode.

Show only order numbers.

Example:

جاهز للاستلام

124

130

134

Do not show customer personal information.

---

# 116. Notification Sending Modal

For manual notification.

Order:

#124

Channel:

SMS

WhatsApp

Message preview:

"طلبك رقم #124 جاهز للاستلام."

Button:

إرسال

---

# 117. Customer Contact Privacy

Do not expose full customer phone numbers unnecessarily in screenshots or public waiting displays.

Inside employee app, full number can be shown according to permissions.

---

# 118. Security UX

If user attempts restricted action:

Display:

"ليس لديك صلاحية لتنفيذ هذا الإجراء."

Do not show confusing technical errors.

---

# 119. Session Lock Screen

If employee session locks:

Show:

Store logo

Employee

PIN/password input

Button:

تسجيل الدخول

Allow switching employee.

Useful for shared counter computers.

---

# 120. Login Screen

Arabic RTL.

Fields:

اسم المستخدم

كلمة المرور

Button:

تسجيل الدخول

Optional:

تذكر هذا الجهاز

Connection status

App version

Avoid unnecessary marketing content.

---

# 121. First Login After Update

Compact release notes modal.

"تم تحديث التطبيق"

Version number

Important changes

Button:

متابعة

---

# 122. Design Components Required

Create reusable components:

Sidebar

Topbar

Search

Buttons

Inputs

Select

Checkbox

Radio

Switch

Tabs

Status badges

Tables

Cards

Metric cards

Printer status card

Order row

Modal

Drawer

Toast

Tooltip

Dropdown

Pagination

Progress bar

File preview

Timeline

Empty state

Error state

Skeleton

---

# 123. Design System

Create a consistent design system including:

Color tokens

Typography scale

Spacing scale

Border radius

Border colors

Shadows

Icons

Button states

Input states

Status colors

Table density

---

# 124. Interaction States

Design:

Default

Hover

Pressed

Focused

Disabled

Loading

Error

Success

For every interactive component.

---

# 125. Do Not Use Fake Data Only

Mockups should use realistic Oman-specific operational examples.

Example names:

سعيد الحارثي

أحمد البلوشي

فاطمة الزدجالية

خالد السعدي

Oman phone numbers:

+968 9876 5432

+968 9441 2233

Example amounts:

0.500 ر.ع

1.700 ر.ع

12.350 ر.ع

---

# 126. Example Printer Models

Use realistic models where needed:

HP LaserJet Pro M404dn

Brother HL-L8360CDW

Epson L8050

Canon imageRUNNER

But do not make the design dependent on one manufacturer.

---

# 127. Main Dashboard Reference Layout

Preferred dashboard composition:

Left:

Sidebar

Center:

Page header

KPI row

Live orders table

Printer overview + print queue

Right:

Selected order detail panel

Bottom:

Connectivity/status bar

This structure should feel like a real operational control center.

---

# 128. Design All Important States

Every major screen must include:

Normal state

Loading

Empty

Error

Offline

No permission where relevant

This is mandatory.

Do not design only the happy path.

---

# 129. High-Fidelity Requirement

Create production-level UI, not wireframes.

The design should include:

Real typography

Spacing

Icons

Tables

Forms

States

Interactions

Realistic data

Proper Arabic hierarchy

Responsive behavior

---

# 130. Required Screens

At minimum, create high-fidelity designs for:

1. Login
2. Dashboard
3. Orders
4. Order Details
5. Document Preview
6. Print Confirmation
7. Reprint
8. Print Queue
9. Failed Print Job
10. Printers
11. Printer Details
12. Printer Configuration
13. Payments
14. Payment Confirmation
15. Refund
16. Customers
17. Customer Details
18. Pricing
19. Services
20. Reports
21. Employees
22. Employee Details
23. Permissions
24. Notifications
25. Audit Log
26. Settings
27. Store Settings
28. Printing Settings
29. Payment Settings
30. Notification Settings
31. Privacy Settings
32. Device Settings
33. Appearance
34. App Update
35. Onboarding
36. Pickup Mode
37. Manual Order Creation
38. Offline Mode
39. Empty States
40. Error States

---

# 131. Priority Screens

Spend the most design effort on:

Dashboard

Orders

Order Detail

Print Queue

Printers

Pickup Mode

These pages will be used most frequently.

---

# 132. UX Priority

The employee should be able to answer these questions instantly:

What needs to be printed?

What is printing now?

Which printer has a problem?

Which orders are ready?

Which customer is waiting?

Has this customer paid?

What action should I take next?

If the interface makes these difficult to determine, redesign it.

---

# 133. Speed Principle

Common operations should require as few clicks as possible.

Examples:

Order pickup:
Search number → confirm payment if required → hand over → complete.

Printing:
Open order → verify → print.

Printer failure:
See alert → choose another printer → retry.

---

# 134. Avoid Dashboard Clutter

Do not fill the application with unnecessary business statistics.

Operational information has higher priority than decorative analytics.

Employees need:

Orders

Printers

Queue

Payments

Problems

Ready pickups

---

# 135. Final Product Feeling

The result should look like a premium commercial Windows application that an Omani print shop owner would confidently use every day.

It should feel purpose-built for managing real printing operations.

Not like:

A generic admin template

A web dashboard copied into a desktop window

A student project

An AI-generated concept

The interface should communicate reliability, speed, control, and professionalism.

---

# 136. Final Design Deliverable

Produce a complete design system and all application pages.

For each important screen provide:

Desktop design

Responsive smaller-window design where relevant

Modal/dialog states

Loading state

Empty state

Error state

Interactive behavior notes

The complete design must follow one consistent visual language across the application.

Use Arabic RTL throughout.

Prioritize workflow efficiency above decoration.