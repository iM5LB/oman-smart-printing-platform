import { Search } from 'lucide-react';
import { StatusDot } from '@/components/ui';

export function TopBar({ title, hint }: { title: string; hint?: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface/60 px-4 backdrop-blur-md">
      <div className="min-w-0">
        <h1 className="truncate text-base font-bold text-ink">{title}</h1>
        {hint ? <p className="truncate text-[11px] text-ink-3">{hint}</p> : null}
      </div>

      <label className="relative hidden min-w-[220px] max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute top-1/2 start-3 size-3.5 -translate-y-1/2 text-ink-3" />
        <input
          className="h-9 w-full rounded-lg border border-line bg-elevated pe-16 ps-9 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
          placeholder="بحث عن طلب، عميل، طابعة…"
        />
        <kbd className="pointer-events-none absolute top-1/2 end-2 -translate-y-1/2 rounded border border-line bg-hover px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
          Ctrl K
        </kbd>
      </label>

      <div className="flex items-center gap-3 text-xs text-ink-2">
        <span className="hidden items-center gap-1.5 sm:inline-flex">
          <StatusDot tone="ok" pulse />
          متصل
        </span>
        <span className="hidden items-center gap-1.5 lg:inline-flex">
          <StatusDot tone="accent" />
          4 طابعات
        </span>
      </div>
    </header>
  );
}
