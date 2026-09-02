import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icons } from "./icons";
import { useToast } from "./Toast";

/** Solid opaque panel fill — do not rely on theme tokens that may composite oddly. */
const PANEL_BG = "#0B1220";
const PANEL_SURFACE = "#121826";

function timeLabel(ts?: number) {
  if (!ts) return "";
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  return `منذ ${Math.floor(mins / 60)} س`;
}

function panelWidth() {
  return Math.min(26 * 16, window.innerWidth - 32);
}

export function NotificationBell({ className = "" }: { className?: string }) {
  const { notifications, clearNotifications } = useToast();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const unread = notifications.length;

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setCoords(null);
      return;
    }

    const place = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const width = panelWidth();
      const isRtl =
        document.documentElement.dir === "rtl" ||
        getComputedStyle(document.documentElement).direction === "rtl";

      // Align panel start with button start (logical), then clamp to viewport.
      let left = isRtl ? r.right - width : r.left;
      left = Math.max(16, Math.min(left, window.innerWidth - width - 16));

      setCoords({ top: r.bottom + 8, left });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || panelRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panel =
    open && coords
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="كل الإشعارات"
            className="fixed z-[200] overflow-hidden rounded-2xl border border-[#243044] shadow-[0_20px_56px_rgba(0,0,0,0.75)]"
            style={{
              top: coords.top,
              left: coords.left,
              width: panelWidth(),
              backgroundColor: PANEL_BG,
              isolation: "isolate",
            }}
          >
            {/* Opaque paint layer — guarantees a solid rectangle over page content */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ backgroundColor: PANEL_BG }}
            />

            <div
              className="relative z-[1] flex items-center justify-between gap-3 border-b border-[#243044] px-5 py-3.5"
              style={{ backgroundColor: PANEL_BG }}
            >
              <p className="text-section font-semibold text-text-primary">
                كل الإشعارات
              </p>
              {notifications.length > 0 ? (
                <button
                  type="button"
                  className="text-meta text-text-muted hover:text-text-secondary"
                  onClick={clearNotifications}
                >
                  مسح الكل
                </button>
              ) : null}
            </div>

            {notifications.length === 0 ? (
              <div
                className="relative z-[1] flex min-h-[16rem] flex-col items-center justify-center px-6 py-10 text-center"
                style={{ backgroundColor: PANEL_BG }}
              >
                <div
                  className="mb-4 flex size-16 items-center justify-center rounded-full text-text-muted"
                  style={{ backgroundColor: PANEL_SURFACE }}
                >
                  {Icons.bell({ size: 28 })}
                </div>
                <p className="text-section font-medium text-text-secondary">
                  لا إشعارات بعد
                </p>
                <p className="mt-1.5 max-w-[16rem] text-meta text-text-muted">
                  ستظهر هنا تنبيهات الطلبات والتحديثات الجديدة
                </p>
              </div>
            ) : (
              <ul
                className="relative z-[1] min-h-[12rem] max-h-[min(420px,52vh)] overflow-y-auto"
                style={{ backgroundColor: PANEL_BG }}
              >
                {notifications.map((n) => (
                  <li
                    key={`${n.id}-${n.createdAt ?? 0}`}
                    className="border-b border-[#243044]/70 px-5 py-4 last:border-b-0 hover:bg-[#1e2738]"
                    style={{ backgroundColor: PANEL_BG }}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
                        {Icons.check({ size: 14 })}
                      </div>
                      <div className="min-w-0 flex-1 text-start">
                        <p className="text-body font-medium leading-snug text-text-primary">
                          {n.title}
                        </p>
                        {n.detail ? (
                          <p className="mt-1 text-meta leading-relaxed text-text-muted">
                            {n.detail}
                          </p>
                        ) : null}
                        <p className="mt-1.5 text-caption text-text-muted">
                          {timeLabel(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        className="relative flex size-9 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
        aria-label="الإشعارات"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {Icons.bell({ size: 18 })}
        {unread > 0 ? (
          <span className="absolute -top-0.5 -start-0.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {panel}
    </div>
  );
}
