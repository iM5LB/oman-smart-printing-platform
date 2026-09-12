import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icons } from "./icons";

export function AppSelect({
  value,
  options,
  disabled,
  onChange,
  "aria-label": ariaLabel,
  className = "",
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
  "aria-label"?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 180 });
  const current = options.find((o) => o.value === value)?.label ?? value;

  const place = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 180);
    const height = Math.min(280, options.length * 36 + 8);
    const padEdge = 8;
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - padEdge) {
      top = Math.max(padEdge, rect.top - height - 6);
    }
    let left = rect.left;
    if (document.documentElement.dir === "rtl" || document.body.dir === "rtl") {
      left = rect.right - width;
    }
    if (left < padEdge) left = padEdge;
    if (left + width > window.innerWidth - padEdge) {
      left = window.innerWidth - width - padEdge;
    }
    setPos({ top, left, width });
  };

  useEffect(() => {
    if (!open) return;
    place();
    activeRef.current?.scrollIntoView({ block: "nearest" });
    const onReposition = () => place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, options.length]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-start text-meta text-text-primary outline-none transition-colors focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-45 ${
          open
            ? "border-primary bg-bg-elevated"
            : "border-border-default bg-bg-elevated hover:border-primary/50"
        } ${className}`}
      >
        <span className="min-w-0 truncate">{current}</span>
        <span className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          {Icons.chevron({ size: 13, className: "-rotate-90" })}
        </span>
      </button>
      {open
        ? createPortal(
            <div
              ref={popRef}
              role="listbox"
              aria-label={ariaLabel}
              className="fixed z-[80] max-h-72 overflow-auto rounded-xl border border-border-default bg-bg-surface p-1 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              {options.map((opt) => {
                const active = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    ref={active ? activeRef : undefined}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-start text-meta transition-colors ${
                      active
                        ? "bg-primary/15 text-text-primary"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    }`}
                  >
                    <span className="min-w-0 truncate">{opt.label}</span>
                    {active ? (
                      <span className="shrink-0 text-primary">{Icons.check({ size: 13 })}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
