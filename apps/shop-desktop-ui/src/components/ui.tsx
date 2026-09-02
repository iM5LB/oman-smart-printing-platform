import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ok';
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <button
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-base',
        'disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-9 px-3.5 text-sm',
        size === 'lg' && 'h-11 px-5 text-sm',
        variant === 'primary' && 'bg-brand text-white hover:bg-blue-600 active:scale-[0.98]',
        variant === 'secondary' &&
          'border border-line bg-elevated text-ink hover:border-line-strong hover:bg-hover',
        variant === 'ghost' && 'text-ink-2 hover:bg-hover hover:text-ink',
        variant === 'danger' && 'bg-danger text-white hover:bg-red-600',
        variant === 'ok' && 'bg-ok text-white hover:bg-green-600',
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-transparent text-ink-2 transition-colors duration-150',
        'hover:border-line hover:bg-hover hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg border border-line bg-elevated px-3 text-sm text-ink outline-none transition-colors',
        'placeholder:text-ink-3 focus:border-accent/50 focus:ring-2 focus:ring-accent/20',
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'accent' | 'brand';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide',
        tone === 'neutral' && 'bg-hover text-ink-2',
        tone === 'ok' && 'bg-ok-dim text-ok',
        tone === 'warn' && 'bg-warn-dim text-warn',
        tone === 'danger' && 'bg-danger-dim text-danger',
        tone === 'accent' && 'bg-accent-dim text-accent',
        tone === 'brand' && 'bg-blue-500/15 text-blue-400',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({
  tone = 'ok',
  pulse = false,
}: {
  tone?: 'ok' | 'warn' | 'danger' | 'accent' | 'muted';
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-block size-2 rounded-full',
        pulse && 'animate-pulse-dot',
        tone === 'ok' && 'bg-ok',
        tone === 'warn' && 'bg-warn',
        tone === 'danger' && 'bg-danger',
        tone === 'accent' && 'bg-accent',
        tone === 'muted' && 'bg-ink-3',
      )}
    />
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface/90 backdrop-blur-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  delta,
  tone = 'accent',
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: 'accent' | 'ok' | 'warn' | 'danger';
}) {
  return (
    <Panel className="group relative overflow-hidden p-3.5 transition-colors hover:border-line-strong">
      <div
        className={cn(
          'absolute inset-y-0 start-0 w-0.5 opacity-80',
          tone === 'accent' && 'bg-accent',
          tone === 'ok' && 'bg-ok',
          tone === 'warn' && 'bg-warn',
          tone === 'danger' && 'bg-danger',
        )}
      />
      <p className="text-[11px] font-medium text-ink-3">{label}</p>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <p className="text-xl font-bold tracking-tight text-ink">{value}</p>
        {delta ? (
          <span className="font-mono text-[10px] text-ok">{delta}</span>
        ) : null}
      </div>
    </Panel>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm font-semibold text-ink-2">{title}</p>
      {hint ? <p className="mt-1 text-xs text-ink-3">{hint}</p> : null}
    </div>
  );
}
