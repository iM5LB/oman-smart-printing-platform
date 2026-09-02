'use client';

import type { Step } from '@/components/order-flow-types';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'upload' as const, label: 'رفع الملفات', num: 1 },
  { key: 'options' as const, label: 'خيارات الطباعة', num: 2 },
  { key: 'checkout' as const, label: 'مراجعة ودفع', num: 3 },
  { key: 'done' as const, label: 'تأكيد', num: 4 },
];

const FLOW: Step[] = ['upload', 'options', 'checkout', 'done'];

export function StepIndicator({ current }: { current: Step }) {
  if (current === 'landing') return null;

  const currentIdx = Math.max(0, FLOW.indexOf(current));
  const progressPct = (currentIdx / (FLOW.length - 1)) * 100;

  return (
    <div className="step-track">
      <div className="step-track-inner" style={{ ['--step-count' as string]: FLOW.length }}>
        <div className="step-track-rail" aria-hidden>
          <div className="step-track-progress" style={{ width: `${progressPct}%` }} />
        </div>

        <ol className="step-track-list">
          {STEPS.map((s, i) => {
            const complete = currentIdx > i || current === 'done';
            const active = currentIdx === i && current !== 'done';

            return (
              <li key={s.key} className="step-track-item">
                <div
                  className={cn(
                    'step-track-dot',
                    complete && 'step-track-dot-done',
                    active && 'step-track-dot-active',
                  )}
                >
                  {complete ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{s.num}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'step-track-label',
                    (active || complete) && 'step-track-label-active',
                  )}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
