import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Badge, MetricCard, Panel, StatusDot } from '@/components/ui';
import { ALERTS, KPIS, ORDERS, PRINTERS, QUEUE, PAYMENT_AR, STATUS_AR } from '@/data/mock';
import { cn, formatOmr, formatPhone } from '@/lib/utils';
import { useUiStore } from '@/stores/ui-store';

const printerTone = {
  ready: 'ok' as const,
  printing: 'accent' as const,
  offline: 'danger' as const,
  paper: 'warn' as const,
  error: 'danger' as const,
};

const printerLabel = {
  ready: 'جاهزة',
  printing: 'جاري الطباعة',
  offline: 'غير متصلة',
  paper: 'لا ورق',
  error: 'خطأ',
};

export function DashboardPage() {
  const setSelected = useUiStore((s) => s.setSelectedOrderId);
  const live = ORDERS.filter((o) => !['collected', 'failed'].includes(o.status)).slice(0, 5);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title="لوحة التحكم" hint="مركز عمليات المكتبة — مباشر" />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 animate-fade-up">
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 xl:grid-cols-6">
          {KPIS.map((k) => (
            <MetricCard key={k.key} label={k.label} value={k.value} delta={k.delta} tone={k.tone} />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-12">
          <Panel className="xl:col-span-7 overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-bold text-ink">الطلبات الحية</h2>
              <Link to="/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                عرض الكل
                <ArrowLeft className="size-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-start text-sm">
                <thead>
                  <tr className="border-b border-line text-[11px] text-ink-3">
                    <th className="px-4 py-2.5 font-medium">الطلب</th>
                    <th className="px-3 py-2.5 font-medium">العميل</th>
                    <th className="px-3 py-2.5 font-medium">الدفع</th>
                    <th className="px-3 py-2.5 font-medium">الحالة</th>
                    <th className="px-3 py-2.5 font-medium">السعر</th>
                    <th className="px-4 py-2.5 font-medium">الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {live.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => setSelected(o.id)}
                      className="cursor-pointer border-b border-line/70 transition-colors hover:bg-hover/80"
                    >
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-accent">{o.number}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-ink">{o.customer}</p>
                        <p className="font-mono text-[10px] text-ink-3" dir="ltr">
                          {formatPhone(o.phone)}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={o.payment === 'paid' ? 'ok' : o.payment === 'unpaid' ? 'danger' : 'warn'}>
                          {PAYMENT_AR[o.payment]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          tone={
                            o.status === 'ready'
                              ? 'ok'
                              : o.status === 'printing'
                                ? 'accent'
                                : o.status === 'needs_review' || o.status === 'failed'
                                  ? 'danger'
                                  : 'neutral'
                          }
                        >
                          {STATUS_AR[o.status]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-ink-2">{formatOmr(o.totalBaisa)}</td>
                      <td className="px-4 py-2.5 text-xs text-ink-3">{o.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="flex flex-col gap-3 xl:col-span-5">
            <Panel className="overflow-hidden">
              <div className="border-b border-line px-4 py-3">
                <h2 className="text-sm font-bold text-ink">الطابعات</h2>
              </div>
              <div className="divide-y divide-line/80">
                {PRINTERS.map((p) => (
                  <div key={p.id} className="flex items-start gap-3 px-4 py-3">
                    <StatusDot tone={printerTone[p.status]} pulse={p.status === 'printing'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ink" dir="ltr">
                          {p.name}
                        </p>
                        <span className="shrink-0 text-[11px] text-ink-3">{printerLabel[p.status]}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-ink-3">{p.caps.join(' · ')}</p>
                      {p.job ? (
                        <p className="mt-1 truncate font-mono text-[10px] text-accent">{p.job}</p>
                      ) : (
                        <p className="mt-1 text-[10px] text-ink-3">{p.queue} في الطابور</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="overflow-hidden">
              <div className="border-b border-line px-4 py-3">
                <h2 className="text-sm font-bold text-ink">قائمة الطباعة</h2>
              </div>
              <div className="space-y-2 p-3">
                {QUEUE.map((q) => (
                  <div key={q.id} className="rounded-lg border border-line bg-elevated/50 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-accent">{q.order}</span>
                      <Badge
                        tone={q.state === 'printing' ? 'accent' : q.state === 'failed' ? 'danger' : 'neutral'}
                      >
                        {q.state === 'printing' ? 'جاري' : q.state === 'failed' ? 'فشل' : 'التالي'}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-xs text-ink-2">{q.file}</p>
                    {q.state === 'printing' && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hover">
                        <div
                          className="h-full rounded-full bg-gradient-to-l from-accent to-brand transition-all"
                          style={{ width: `${q.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                <AlertTriangle className="size-3.5 text-warn" />
                <h2 className="text-sm font-bold text-ink">تنبيهات</h2>
              </div>
              <ul className="divide-y divide-line/80">
                {ALERTS.map((a) => (
                  <li key={a.id} className="flex items-start gap-2 px-4 py-2.5 text-xs text-ink-2">
                    <StatusDot
                      tone={a.tone === 'danger' ? 'danger' : a.tone === 'warn' ? 'warn' : 'accent'}
                    />
                    <span className={cn(a.tone === 'danger' && 'text-danger')}>{a.text}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
