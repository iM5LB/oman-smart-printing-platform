import { useMemo, useState } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Badge, Button, Input, Panel } from '@/components/ui';
import { ORDERS, PAYMENT_AR, STATUS_AR } from '@/data/mock';
import { formatOmr, formatPhone } from '@/lib/utils';

export function PickupPage() {
  const [query, setQuery] = useState('');
  const [paidFlash, setPaidFlash] = useState(false);

  const order = useMemo(() => {
    const q = query.trim().replace(/^#/, '');
    if (!q) return null;
    return (
      ORDERS.find(
        (o) =>
          o.number.replace('#', '') === q ||
          o.phone.includes(q) ||
          o.customer.includes(q),
      ) ?? null
    );
  }, [query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title="استلام طلب" hint="F2 · بحث فوري برقم الطلب أو الهاتف" />
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto p-6 animate-fade-up">
        <div className="w-full max-w-lg space-y-4">
          <Panel className="p-5">
            <label className="block space-y-2">
              <span className="text-xs font-semibold text-ink-2">أدخل رقم الطلب</span>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-ink-3" />
                <Input
                  autoFocus
                  className="h-12 pe-3 ps-10 text-center font-mono text-lg tracking-wider"
                  placeholder="#124"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPaidFlash(false);
                  }}
                />
              </div>
            </label>
          </Panel>

          {query && !order && (
            <Panel className="p-6 text-center text-sm text-ink-3">لا توجد نتائج مطابقة</Panel>
          )}

          {order && (
            <Panel className="overflow-hidden">
              <div className="border-b border-line bg-elevated/40 px-5 py-4 text-center">
                <p className="font-mono text-3xl font-bold text-accent">{order.number}</p>
                <p className="mt-1 text-base font-semibold text-ink">{order.customer}</p>
                <p className="mt-0.5 font-mono text-xs text-ink-3" dir="ltr">
                  {formatPhone(order.phone)}
                </p>
              </div>

              <div className="space-y-3 px-5 py-4">
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge tone={order.status === 'ready' ? 'ok' : 'neutral'}>
                    {STATUS_AR[order.status]}
                  </Badge>
                  <Badge tone={order.payment === 'paid' ? 'ok' : 'danger'}>
                    {PAYMENT_AR[order.payment]}
                  </Badge>
                </div>
                <p className="text-center font-mono text-2xl font-bold text-ink">
                  {formatOmr(order.totalBaisa)}
                </p>

                {paidFlash && (
                  <div className="flex items-center justify-center gap-2 rounded-lg bg-ok-dim py-2 text-sm font-semibold text-ok">
                    <CheckCircle2 className="size-4" />
                    تم التسليم بنجاح
                  </div>
                )}

                {order.payment === 'paid' ? (
                  <Button
                    variant="ok"
                    size="lg"
                    className="w-full"
                    onClick={() => setPaidFlash(true)}
                  >
                    تم التسليم
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => setPaidFlash(true)}
                    >
                      نقداً
                    </Button>
                    <Button variant="secondary" size="lg" onClick={() => setPaidFlash(true)}>
                      بطاقة
                    </Button>
                    <Button
                      variant="ok"
                      size="lg"
                      className="col-span-2"
                      onClick={() => setPaidFlash(true)}
                    >
                      تأكيد الدفع والتسليم
                    </Button>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
