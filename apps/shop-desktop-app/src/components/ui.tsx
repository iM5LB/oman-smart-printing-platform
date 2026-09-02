import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-body font-medium transition-colors duration-150 disabled:opacity-45 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover",
    secondary:
      "bg-bg-elevated text-text-primary border border-border-default hover:bg-bg-hover",
    danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
    ghost: "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-bg-hover text-text-secondary border-border-default",
    success: "bg-success/15 text-success border-success/25",
    warning: "bg-warning/15 text-warning border-warning/25",
    danger: "bg-danger/15 text-danger border-danger/25",
    info: "bg-info/15 text-info border-info/25",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-meta font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[10px] border border-border-default bg-bg-surface ${className}`}
    >
      {children}
    </div>
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`rounded-lg border border-border-default bg-bg-elevated px-3 py-2.5 text-body text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-primary ${
        className.includes("w-") || className.includes("!w-") ? "" : "w-full"
      } ${className}`}
      {...props}
    />
  );
}

export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <p className="text-section text-text-secondary">{title}</p>
      {detail ? <p className="max-w-sm text-meta text-text-muted">{detail}</p> : null}
    </div>
  );
}
