import { TopBar } from '@/components/layout/TopBar';
import { Badge, Button, Panel, StatusDot } from '@/components/ui';
import { PRINTERS } from '@/data/mock';

const label = {
  ready: 'جاهزة',
  printing: 'جاري الطباعة',
  offline: 'غير متصلة',
  paper: 'لا يوجد ورق',
  error: 'خطأ',
} as const;

const tone = {
  ready: 'ok' as const,
  printing: 'accent' as const,
  offline: 'danger' as const,
  paper: 'warn' as const,
  error: 'danger' as const,
};

export function PrintersPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title="الطابعات" hint="اكتشاف Windows · الأدوار والتوجيه" />
      <div className="min-h-0 flex-1 overflow-y-auto p-4 animate-fade-up">
        <div className="mb-3 flex justify-end">
          <Button variant="secondary" size="sm">
            إعادة اكتشاف الطابعات
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {PRINTERS.map((p) => (
            <Panel
              key={p.id}
              className="group relative overflow-hidden p-4 transition-colors hover:border-line-strong"
            >
              <div className="absolute inset-y-0 start-0 w-0.5 bg-line-strong group-hover:bg-accent" />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink" dir="ltr">
                    {p.name}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <StatusDot tone={tone[p.status]} pulse={p.status === 'printing'} />
                    <span className="text-xs text-ink-2">{label[p.status]}</span>
                  </div>
                </div>
                <Badge tone="neutral">{p.queue} طابور</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.caps.map((c) => (
                  <Badge key={c} tone="neutral">
                    {c}
                  </Badge>
                ))}
              </div>
              {p.job && (
                <p className="mt-3 truncate rounded-md bg-accent-dim px-2 py-1.5 font-mono text-[10px] text-accent">
                  {p.job}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1">
                  تفاصيل
                </Button>
                <Button variant="ghost" size="sm">
                  اختبار
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
