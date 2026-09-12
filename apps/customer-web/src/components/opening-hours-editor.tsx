'use client';

import { OMAN_WEEKDAYS } from '@/lib/weekdays';
import { TimeSelect } from '@/components/time-select';

export type HourRow = {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
};

export function defaultHours(): HourRow[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    day_of_week: day,
    open_time: day === 6 ? '09:00' : '08:00',
    close_time: day === 6 ? '18:00' : '22:00',
    is_closed: false,
  }));
}

function ClosedSwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-2 py-1 text-xs font-medium text-text-muted transition-colors hover:border-primary/30 disabled:opacity-50"
    >
      <span
        dir="ltr"
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'left-4' : 'left-0.5'
          }`}
        />
      </span>
      مغلق
    </button>
  );
}

export function OpeningHoursEditor({
  value,
  onChange,
  disabled,
}: {
  value: HourRow[];
  onChange: (next: HourRow[]) => void;
  disabled?: boolean;
}) {
  const update = (day: number, patch: Partial<HourRow>) => {
    onChange(
      value.map((row) => (row.day_of_week === day ? { ...row, ...patch } : row)),
    );
  };

  return (
    <div className="space-y-2">
      {value.map((row) => (
        <div
          key={row.day_of_week}
          className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${
            row.is_closed
              ? 'border-border bg-background'
              : 'border-border bg-surface'
          }`}
        >
          <span className="w-20 shrink-0 text-sm font-semibold text-text">
            {OMAN_WEEKDAYS[row.day_of_week]}
          </span>
          <ClosedSwitch
            checked={row.is_closed}
            disabled={disabled}
            label={`${OMAN_WEEKDAYS[row.day_of_week]} مغلق`}
            onChange={(is_closed) => update(row.day_of_week, { is_closed })}
          />
          {!row.is_closed ? (
            <div className="ms-auto flex items-center gap-1.5">
              <TimeSelect
                aria-label={`${OMAN_WEEKDAYS[row.day_of_week]} من`}
                value={row.open_time}
                disabled={disabled}
                onChange={(open_time) => update(row.day_of_week, { open_time })}
              />
              <span className="text-text-muted">–</span>
              <TimeSelect
                aria-label={`${OMAN_WEEKDAYS[row.day_of_week]} إلى`}
                value={row.close_time}
                disabled={disabled}
                onChange={(close_time) => update(row.day_of_week, { close_time })}
              />
            </div>
          ) : (
            <span className="ms-auto text-xs font-medium text-error">مغلق طوال اليوم</span>
          )}
        </div>
      ))}
    </div>
  );
}
