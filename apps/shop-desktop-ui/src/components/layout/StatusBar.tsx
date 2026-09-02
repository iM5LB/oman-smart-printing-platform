import { StatusDot } from '@/components/ui';

export function StatusBar() {
  return (
    <footer className="flex h-8 shrink-0 items-center justify-between gap-3 border-t border-line bg-surface/80 px-3 text-[11px] text-ink-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <StatusDot tone="ok" pulse />
          متصل بالإنترنت
        </span>
        <span className="inline-flex items-center gap-1.5">
          <StatusDot tone="ok" />
          خدمة الطباعة تعمل
        </span>
        <span>آخر مزامنة: الآن</span>
      </div>
      <span className="font-mono text-ink-3">v0.1.0-desktop</span>
    </footer>
  );
}
