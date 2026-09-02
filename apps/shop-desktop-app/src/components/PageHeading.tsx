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
 * RTL header: title on start/right, optional filters filling the middle column,
 * actions (e.g. CountPill) on end/left.
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
  /** Search / status chips — full-width middle column between title and actions. */
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
    <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
      {actions}
    </div>
  ) : null;

  if (!filters) {
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        {titleBlock}
        {actionsBlock}
      </div>
    );
  }

  return (
    <div className="grid shrink-0 grid-cols-1 items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <div className="min-w-0 sm:justify-self-start">{titleBlock}</div>
      <div className="flex w-full min-w-0 max-w-full items-center justify-center sm:justify-self-stretch">
        {filters}
      </div>
      <div className="min-w-0 sm:justify-self-end">
        {actionsBlock}
      </div>
    </div>
  );
}
