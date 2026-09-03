import type { ReactNode } from 'react';

export function PageHeading({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {icon ? <span className="shrink-0 text-[var(--admin-primary)]">{icon}</span> : null}
          <h1 className="text-xl font-semibold text-[var(--admin-text)]">{title}</h1>
        </div>
        {description ? (
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
