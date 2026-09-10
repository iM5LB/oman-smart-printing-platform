import type { ReactNode } from "react";

/** Prominent count chip for page headers (not shy corner text). */
export function CountPill({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  return (
    <div className="inline-flex items-baseline gap-2 rounded-xl border border-border-default bg-bg-elevated px-3.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <span className="text-title font-semibold tabular-nums leading-none text-text-primary">
        {value}
      </span>
      <span className="text-body text-text-secondary">{label}</span>
    </div>
  );
}

/**
 * RTL header: title on start/right, actions on end/left.
 * Filters sit on a full-width second row so titles/counts are never cramped.
 */
export function PageHeading({
  icon,
  title,
  description,
  filters,
  actions,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  /** Search / status chips — full-width row under the title. */
  filters?: ReactNode;
  actions?: ReactNode;
}) {
  const titleBlock = (
    <div className="min-w-0">
      <div className="flex items-center gap-2.5">
        <span className="shrink-0 text-primary">{icon}</span>
        <h1 className="text-title text-text-primary">{title}</h1>
      </div>
      {description ? (
        <p className="mt-1 text-meta text-text-muted">{description}</p>
      ) : null}
    </div>
  );

  const actionsBlock = actions ? (
    <div className="flex shrink-0 items-center gap-2">{actions}</div>
  ) : null;

  return (
    <div className="flex shrink-0 flex-col gap-2.5">
      <div className="flex items-start justify-between gap-4">
        {titleBlock}
        {actionsBlock}
      </div>
      {filters ? (
        <div className="flex w-full min-w-0 items-center">{filters}</div>
      ) : null}
    </div>
  );
}
