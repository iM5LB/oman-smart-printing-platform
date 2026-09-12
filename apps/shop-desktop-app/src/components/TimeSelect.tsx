import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icons } from "./icons";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_STEPS = [0, 15, 30, 45];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseHm(value: string) {
  const match = /^(\d{1,2}):(\d{1,2})/.exec(value || "");
  const hour = Math.min(23, Math.max(0, Number(match?.[1] ?? 8)));
  const minute = Math.min(59, Math.max(0, Number(match?.[2] ?? 0)));
  return { hour, minute };
}

function minuteOptions(current: number) {
  const set = new Set([...MINUTE_STEPS, current]);
  return [...set].sort((a, b) => a - b);
}

export function TimeSelect({
  value,
  disabled,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: string;
  disabled?: boolean;
  onChange: (next: string) => void;
  "aria-label"?: string;
}) {
  const { hour, minute } = parseHm(value);
  const display = `${pad(hour)}:${pad(minute)}`;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLButtonElement>(null);
  const minuteRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 196 });

  const place = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(196, rect.width);
    const height = 236;
    const padEdge = 8;
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - padEdge) {
      top = Math.max(padEdge, rect.top - height - 6);
    }
    let left = rect.right - width;
    if (left < padEdge) left = padEdge;
    if (left + width > window.innerWidth - padEdge) {
      left = window.innerWidth - width - padEdge;
    }
    setPos({ top, left, width });
  };

  useEffect(() => {
    if (!open) return;
    place();
    hourRef.current?.scrollIntoView({ block: "center" });
    minuteRef.current?.scrollIntoView({ block: "center" });
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
  }, [open]);

  const setTime = (nextHour: number, nextMinute: number) => {
    onChange(`${pad(nextHour)}:${pad(nextMinute)}`);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`flex w-full cursor-pointer items-center justify-between gap-1.5 rounded-lg border px-2 py-1 text-meta tabular-nums outline-none transition-colors focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-45 ${
          open
            ? "border-primary bg-bg-elevated text-text-primary"
            : "border-border-default bg-bg-elevated text-text-primary hover:border-primary/50"
        }`}
        dir="ltr"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-text-muted">{Icons.clock({ size: 13 })}</span>
          {display}
        </span>
        <span className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          {Icons.chevron({ size: 12, className: "-rotate-90" })}
        </span>
      </button>
      {open
        ? createPortal(
            <div
              ref={popRef}
              role="dialog"
              aria-label={ariaLabel ?? "اختيار الوقت"}
              className="fixed z-[80] overflow-hidden rounded-xl border border-border-default bg-bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              <div className="grid grid-cols-2 border-b border-border-default bg-bg-elevated px-2 py-1.5 text-center text-[10px] font-semibold text-text-muted">
                <span>ساعة</span>
                <span>دقيقة</span>
              </div>
              <div className="grid h-52 grid-cols-2">
                <div className="scroll-y border-e border-border-default">
                  {HOURS.map((h) => {
                    const active = h === hour;
                    return (
                      <button
                        key={h}
                        ref={active ? hourRef : undefined}
                        type="button"
                        onClick={() => setTime(h, minute)}
                        className={`flex w-full justify-center px-2 py-1.5 text-meta tabular-nums transition-colors ${
                          active
                            ? "bg-primary text-white"
                            : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                        }`}
                      >
                        {pad(h)}
                      </button>
                    );
                  })}
                </div>
                <div className="scroll-y">
                  {minuteOptions(minute).map((m) => {
                    const active = m === minute;
                    return (
                      <button
                        key={m}
                        ref={active ? minuteRef : undefined}
                        type="button"
                        onClick={() => {
                          setTime(hour, m);
                          setOpen(false);
                        }}
                        className={`flex w-full justify-center px-2 py-1.5 text-meta tabular-nums transition-colors ${
                          active
                            ? "bg-primary text-white"
                            : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                        }`}
                      >
                        {pad(m)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
