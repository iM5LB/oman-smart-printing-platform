import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Badge, Button, Panel } from '@/components/ui';
import { ORDERS, PAYMENT_AR, STATUS_AR, type OrderStatus, type MockOrder } from '@/data/mock';
import { cn, formatOmr, formatPhone } from '@/lib/utils';
import { useUiStore } from '@/stores/ui-store';

const TABS: { key: 'all' | OrderStatus; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'review_pending', label: 'جديدة' },
  { key: 'needs_review', label: 'مراجعة' },
  { key: 'queued', label: 'انتظار' },
  { key: 'printing', label: 'طباعة' },
  { key: 'ready', label: 'جاهزة' },
  { key: 'collected', label: 'مكتملة' },
];

function count(status?: OrderStatus) {
  if (!status) return ORDERS.length;
  return ORDERS.filter((o) => o.status === status).length;
}

export function OrdersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all');
  const selectedId = useUiStore((s) => s.selectedOrderId);
  const setSelected = useUiStore((s) => s.setSelectedOrderId);

  const rows = useMemo(
    () => (tab === 'all' ? ORDERS : ORDERS.filter((o) => o.status === tab)),
    [tab],
  );
  const selected = ORDERS.find((o) => o.id === selectedId) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title="الطلبات" hint={`${ORDERS.length} طلب · عرض تشغيلي كثيف`} />
      <div className="flex min-h-0 flex-1 animate-fade-up">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  'cursor-pointer whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
                  tab === t.key
                    ? 'bg-accent-dim text-accent'
                    : 'text-ink-3 hover:bg-hover hover:text-ink-2',
                )}
              >
                {t.label}
                <span className="ms-1.5 font-mono opacity-70">
                  {t.key === 'all' ? count() : count(t.key)}
                </span>
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur">
                <tr className="border-b border-line text-[11px] text-ink-3">
                  <th className="px-4 py-2.5 text-start font-medium">الطلب</th>
                  <th className="px-3 py-2.5 text-start font-medium">العميل</th>
                  <th className="px-3 py-2.5 text-start font-medium">الملفات</th>
                  <th className="px-3 py-2.5 text-start font-medium">الدفع</th>
                  <th className="px-3 py-2.5 text-start font-medium">الحالة</th>
                  <th className="px-3 py-2.5 text-start font-medium">الإجمالي</th>
                  <th className="px-3 py-2.5 text-start font-medium">الطابعة</th>
                  <th className="px-4 py-2.5 text-start font-medium">الوقت</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelected(o.id)}
                    className={cn(
                      'cursor-pointer border-b border-line/60 transition-colors hover:bg-hover/70',
                      selectedId === o.id && 'bg-accent-dim/40',
                    )}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-accent">{o.number}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{o.customer}</p>
                      <p className="font-mono text-[10px] text-ink-3" dir="ltr">
                        {formatPhone(o.phone)}
                      </p>
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-2.5 text-xs text-ink-2">
                      {o.files.join(' · ')}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone={o.payment === 'paid' ? 'ok' : o.payment === 'unpaid' ? 'danger' : 'warn'}>
                        {PAYMENT_AR[o.payment]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge tone="neutral">{STATUS_AR[o.status]}</Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">{formatOmr(o.totalBaisa)}</td>
                    <td className="px-3 py-2.5 text-xs text-ink-3" dir="ltr">
                      {o.printer ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink-3">{o.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected && <OrderDrawer order={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}

function OrderDrawer({ order, onClose }: { order: MockOrder; onClose: () => void }) {
  return (
    <aside className="flex w-full max-w-sm shrink-0 flex-col border-s border-line bg-surface animate-fade-up">
      <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <p className="font-mono text-lg font-bold text-accent">{order.number}</p>
          <p className="mt-0.5 text-sm font-semibold text-ink">{order.customer}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg p-1.5 text-ink-3 hover:bg-hover hover:text-ink"
          aria-label="إغلاق"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge tone={order.payment === 'paid' ? 'ok' : 'danger'}>{PAYMENT_AR[order.payment]}</Badge>
          <Badge tone="accent">{STATUS_AR[order.status]}</Badge>
        </div>

        <Panel className="space-y-2 p-3">
          <Row label="الهاتف" value={formatPhone(order.phone)} ltr />
          <Row label="الإجمالي" value={formatOmr(order.totalBaisa)} />
          <Row label="الصفحات" value={String(order.pages)} />
          <Row label="النسخ" value={String(order.copies)} />
          <Row label="اللون" value={order.color === 'bw' ? 'أبيض وأسود' : 'ألوان'} />
          <Row label="الوجهين" value={order.duplex ? 'نعم' : 'لا'} />
          <Row label="الطابعة" value={order.printer ?? 'غير معيّنة'} ltr />
        </Panel>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-ink-3">الملفات</p>
          <ul className="space-y-1.5">
            {order.files.map((f) => (
              <li key={f} className="rounded-lg border border-line bg-elevated px-3 py-2 text-xs">
                {f}
              </li>
            ))}
          </ul>
        </div>

        {order.notes && (
          <div className="rounded-lg border border-warn/30 bg-warn-dim px-3 py-2.5">
            <p className="text-[11px] font-semibold text-warn">ملاحظات العميل</p>
            <p className="mt-1 text-xs text-ink-2">{order.notes}</p>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-line p-3">
        {order.status === 'ready' && order.payment === 'unpaid' && (
          <Button variant="ok" className="w-full">
            تسجيل الدفع
          </Button>
        )}
        {['queued', 'review_pending'].includes(order.status) && (
          <Button className="w-full">طباعة الآن</Button>
        )}
        <Button variant="secondary" className="w-full">
          فتح التفاصيل كاملة
        </Button>
      </div>
    </aside>
  );
}

function Row({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-ink-3">{label}</span>
      <span className="font-medium text-ink" dir={ltr ? 'ltr' : undefined}>
        {value}
      </span>
    </div>
  );
}
