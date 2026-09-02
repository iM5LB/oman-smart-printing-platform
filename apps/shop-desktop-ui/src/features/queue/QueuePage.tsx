import type { ReactNode } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Badge, Panel, StatusDot } from '@/components/ui';
import { PRINTERS, QUEUE } from '@/data/mock';

export function QueuePage() {
  const printing = QUEUE.filter((q) => q.state === 'printing');
  const next = QUEUE.filter((q) => q.state === 'next');
  const failed = QUEUE.filter((q) => q.state === 'failed');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title="قائمة الطباعة" hint="مراقبة الطابور والحالة مباشرة" />
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 animate-fade-up">
        <Section title="جاري الطباعة">
          {printing.map((q) => (
            <Panel key={q.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold text-accent">{q.order}</p>
                  <p className="mt-0.5 text-sm text-ink">{q.file}</p>
                  <p className="mt-1 text-xs text-ink-3" dir="ltr">
                    {q.printer}
                  </p>
                </div>
                <Badge tone="accent">جاري الطباعة</Badge>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-hover">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-accent via-brand to-ok"
                  style={{ width: `${q.progress}%` }}
                />
              </div>
              <p className="mt-1.5 text-end font-mono text-[11px] text-ink-3">{q.progress}%</p>
            </Panel>
          ))}
        </Section>

        <Section title="التالي">
          {next.map((q, i) => (
            <Panel key={q.id} className="flex items-center gap-3 p-3.5">
              <span className="flex size-7 items-center justify-center rounded-md bg-hover font-mono text-xs text-ink-2">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs font-bold text-accent">{q.order}</p>
                <p className="truncate text-sm text-ink">{q.file}</p>
              </div>
              <Badge tone="neutral">عادي</Badge>
            </Panel>
          ))}
        </Section>

        <Section title="فشلت">
          {failed.map((q) => (
            <Panel key={q.id} className="flex items-center gap-3 border-danger/30 p-3.5">
              <StatusDot tone="danger" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs font-bold text-accent">{q.order}</p>
                <p className="truncate text-sm text-ink">{q.file}</p>
              </div>
              <Badge tone="danger">فشل</Badge>
            </Panel>
          ))}
        </Section>

        <Section title="حالة الطابعات">
          <div className="grid gap-2 sm:grid-cols-2">
            {PRINTERS.map((p) => (
              <Panel key={p.id} className="flex items-center gap-2 p-3">
                <StatusDot
                  tone={
                    p.status === 'ready'
                      ? 'ok'
                      : p.status === 'printing'
                        ? 'accent'
                        : p.status === 'paper'
                          ? 'warn'
                          : 'danger'
                  }
                  pulse={p.status === 'printing'}
                />
                <span className="truncate text-sm" dir="ltr">
                  {p.name}
                </span>
              </Panel>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-bold tracking-wide text-ink-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
