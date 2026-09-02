import { cn } from '@/lib/utils';

const TRACK_STEPS = [
  { key: 'received', label: 'استلام الطلب', num: 1 },
  { key: 'review', label: 'المراجعة', num: 2 },
  { key: 'printing', label: 'الطباعة', num: 3 },
  { key: 'ready', label: 'جاهز', num: 4 },
] as const;

/** Map API order status to tracking step index (0–3). Returns 4 when fully done. */
export function trackStepIndex(status: string): number {
  if (status === 'collected' || status === 'completed') return 4;
  if (status === 'ready') return 3;
  if (['queued', 'preparing', 'printing', 'awaiting_finishing'].includes(status)) return 2;
  if (['review_pending', 'needs_review'].includes(status)) return 1;
  if (status === 'cancelled' || status === 'failed') return 0;
  return 0; // submitted, paid, payment_pending, draft…
}

export function StatusTimeline({
  status,
  embedded = false,
}: {
  status?: string;
  /** When true, omit outer step-track chrome (for use inside a card). */
  embedded?: boolean;
}) {
  const failed = status === 'cancelled' || status === 'failed';
  const currentIdx = status ? trackStepIndex(status) : 1;
  const allDone = currentIdx >= TRACK_STEPS.length;
  const activeIdx = allDone ? -1 : Math.min(currentIdx, TRACK_STEPS.length - 1);
  const progressPct = allDone
    ? 100
    : (Math.max(0, activeIdx) / (TRACK_STEPS.length - 1)) * 100;

  const labels = failed
    ? (['ملغى', 'المراجعة', 'الطباعة', 'جاهز'] as const)
    : allDone
      ? (['استلام الطلب', 'المراجعة', 'الطباعة', 'تم الاستلام'] as const)
      : TRACK_STEPS.map((s) => s.label);

  const inner = (
    <div
      className="step-track-inner"
      style={{ ['--step-count' as string]: TRACK_STEPS.length }}
    >
      <div className="step-track-rail" aria-hidden>
        <div
          className={cn('step-track-progress', failed && 'step-track-progress-failed')}
          style={{ width: `${failed ? 0 : progressPct}%` }}
        />
      </div>

      <ol className="step-track-list">
        {TRACK_STEPS.map((s, i) => {
          const complete = !failed && (allDone || activeIdx > i);
          const active = !failed && !allDone && activeIdx === i;

          return (
            <li key={s.key} className="step-track-item">
              <div
                className={cn(
                  'step-track-dot',
                  complete && 'step-track-dot-done',
                  active && 'step-track-dot-active',
                  failed && i === 0 && 'step-track-dot-failed',
                )}
              >
                {complete || (failed && i === 0) ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
                    {failed && i === 0 ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    )}
                  </svg>
                ) : (
                  <span>{s.num}</span>
                )}
              </div>
              <span
                className={cn(
                  'step-track-label',
                  (active || complete) && 'step-track-label-active',
                  failed && i === 0 && 'step-track-label-failed',
                )}
              >
                {labels[i]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );

  if (embedded) {
    return <div className="step-track-embedded">{inner}</div>;
  }

  return <div className="step-track">{inner}</div>;
}
