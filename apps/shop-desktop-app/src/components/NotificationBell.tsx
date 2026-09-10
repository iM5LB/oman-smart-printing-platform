import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icons } from "./icons";
import { ToneIcon, useToast, type ToastTone } from "./Toast";

const PANEL_BG = "#0B1220";
const PANEL_SURFACE = "#121A28";
const PANEL_BORDER = "rgba(36, 48, 68, 0.95)";

function timeLabel(ts?: number) {
  if (!ts) return "";
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  return `منذ ${Math.floor(hours / 24)} ي`;
}

function panelWidth() {
  return Math.min(22 * 16, window.innerWidth - 24);
}

const toneSoft: Record<ToastTone, string> = {
  success: "bg-success/15 text-success",
  info: "bg-info/15 text-info",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
};

export function NotificationBell({ className = "" }: { className?: string }) {
  const {
    notifications,
    unreadCount,
    clearNotifications,
    removeNotification,
    markAllRead,
  } = useToast();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

      let left = isRtl ? r.right - width : r.left;
      left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
      setCoords({ top: r.bottom + 10, left });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, notifications.length]);

  useEffect(() => {
    if (!open) return;
    markAllRead();
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
  }, [open, markAllRead]);

  const panel =
    open && coords
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="الإشعارات"
            className="fixed z-[200] overflow-hidden rounded-2xl border shadow-[0_24px_64px_rgba(0,0,0,0.72)]"
            style={{
              top: coords.top,
              left: coords.left,
              width: panelWidth(),
              backgroundColor: PANEL_BG,
              borderColor: PANEL_BORDER,
              isolation: "isolate",
            }}
          >
            <div
              className="relative z-[1] flex items-center justify-between gap-3 border-b px-4 py-3"
              style={{ borderColor: PANEL_BORDER, backgroundColor: PANEL_BG }}
            >
              <div className="min-w-0 text-start">
                <p className="text-body font-semibold text-text-primary">
                  الإشعارات
                </p>
                <p className="text-caption text-text-muted">
                  {notifications.length === 0
                    ? "لا يوجد شيء جديد"
                    : unreadCount > 0
                      ? `${unreadCount} غير مقروء`
                      : `${notifications.length} إشعار`}
                </p>
              </div>
              {notifications.length > 0 ? (
                <button
                  type="button"
                  className="shrink-0 rounded-lg px-2.5 py-1.5 text-meta text-text-muted transition-colors hover:bg-white/5 hover:text-text-secondary"
                  onClick={clearNotifications}
                >
                  مسح الكل
                </button>
              ) : null}
            </div>

            {notifications.length === 0 ? (
              <div
                className="relative z-[1] flex min-h-[15rem] flex-col items-center justify-center gap-3 px-6 py-10 text-center"
                style={{ backgroundColor: PANEL_BG }}
              >
                <div
                  className="flex size-14 items-center justify-center rounded-2xl text-text-muted"
                  style={{ backgroundColor: PANEL_SURFACE }}
                >
                  {Icons.bell({ size: 24 })}
                </div>
                <div>
                  <p className="text-body font-medium text-text-secondary">
                    لا إشعارات بعد
                  </p>
                  <p className="mt-1 max-w-[15rem] text-meta leading-relaxed text-text-muted">
                    تنبيهات الطلبات الجديدة تظهر هنا وفي شريط Windows
                  </p>
                </div>
              </div>
            ) : (
              <ul
                className="relative z-[1] max-h-[min(380px,50vh)] overflow-y-auto overscroll-contain py-1"
                style={{ backgroundColor: PANEL_BG }}
              >
                {notifications.map((n) => {
                  const tone = (n.tone ?? "success") as ToastTone;
                  return (
                    <li key={`${n.id}-${n.createdAt ?? 0}`} className="px-2">
                      <div
                        className={`group relative flex items-start gap-3 rounded-xl px-3 py-3 transition-colors ${
                          n.read
                            ? "hover:bg-white/[0.03]"
                            : "bg-primary/10 hover:bg-primary/[0.14]"
                        }`}
                      >
                        {!n.read ? (
                          <span
                            className="absolute top-4 start-1.5 size-1.5 rounded-full bg-primary"
                            aria-hidden
                          />
                        ) : null}
                        <div
                          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${toneSoft[tone]}`}
                        >
                          <ToneIcon tone={tone} size={14} />
                        </div>
                        <div className="min-w-0 flex-1 text-start">
                          <p className="text-body font-medium leading-snug text-text-primary">
                            {n.title}
                          </p>
                          {n.detail ? (
                            <p className="mt-0.5 text-meta leading-relaxed text-text-muted">
                              {n.detail}
                            </p>
                          ) : null}
                          <p className="mt-1.5 text-caption text-text-muted/80">
                            {timeLabel(n.createdAt)}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="إزالة الإشعار"
                          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-text-muted opacity-0 transition-opacity hover:bg-white/5 hover:text-text-secondary group-hover:opacity-100 focus:opacity-100"
                          onClick={() => removeNotification(n.id)}
                        >
                          {Icons.x({ size: 14 })}
                        </button>
                      </div>
                    </li>
                  );
                })}
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
        className={`relative flex size-9 items-center justify-center rounded-xl transition-colors ${
          open
            ? "bg-bg-hover text-text-primary"
            : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
        }`}
        aria-label={
          unreadCount > 0
            ? `الإشعارات — ${unreadCount} غير مقروء`
            : "الإشعارات"
        }
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {Icons.bell({ size: 18 })}
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -start-0.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-white ring-2 ring-bg-surface">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
      {panel}
    </div>
  );
}
