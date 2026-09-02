import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Icons } from "./icons";

export type ToastItem = {
  id: string;
  title: string;
  detail?: string;
  tone?: "success" | "info" | "warning" | "danger";
  durationMs?: number;
  createdAt?: number;
};

type ToastContextValue = {
  push: (toast: Omit<ToastItem, "id"> & { id?: string }) => void;
  dismiss: (id: string) => void;
  /** Persistent list for the notifications panel */
  notifications: ToastItem[];
  clearNotifications: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneBar: Record<NonNullable<ToastItem["tone"]>, string> = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  danger: "bg-danger",
};

function ToastCard({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: () => void;
}) {
  const tone = item.tone ?? "success";

  useEffect(() => {
    const ms = item.durationMs ?? 5500;
    if (ms <= 0) return;
    const t = window.setTimeout(onClose, ms);
    return () => window.clearTimeout(t);
  }, [item.durationMs, onClose]);

  return (
    <div
      role="status"
      className="animate-toast-in pointer-events-auto relative flex w-[min(360px,calc(100vw-2rem))] items-start gap-3 overflow-hidden rounded-xl border border-border-default bg-[#0f1520] py-3.5 pe-3 ps-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
    >
      <div className={`absolute inset-y-0 left-0 w-[5px] ${toneBar[tone]}`} />

      <div
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-white ${toneBar[tone]}`}
      >
        {Icons.check({ size: 15 })}
      </div>

      <div className="min-w-0 flex-1 pt-0.5 text-right">
        <p className="text-[14px] font-semibold leading-snug text-white">
          {item.title}
        </p>
        {item.detail ? (
          <p className="mt-1 text-[12px] leading-snug text-[#A0AEC0]">
            {item.detail}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-[#8B9CB3] transition-colors hover:bg-white/5 hover:text-white"
      >
        <span className="text-[18px] leading-none">×</span>
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [notifications, setNotifications] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const push = useCallback((toast: Omit<ToastItem, "id"> & { id?: string }) => {
    const id =
      toast.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const full: ToastItem = {
      tone: "success",
      durationMs: 5500,
      ...toast,
      id,
      createdAt: Date.now(),
    };

    setItems((prev) => {
      if (toast.id && prev.some((t) => t.id === toast.id)) {
        return prev.map((t) => (t.id === toast.id ? { ...t, ...full } : t));
      }
      return [...prev, full];
    });

    setNotifications((prev) => {
      if (toast.id && prev.some((t) => t.id === toast.id)) {
        return prev.map((t) => (t.id === toast.id ? { ...t, ...full } : t));
      }
      return [full, ...prev].slice(0, 40);
    });
  }, []);

  const value = useMemo(
    () => ({ push, dismiss, notifications, clearNotifications }),
    [push, dismiss, notifications, clearNotifications],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined"
        ? createPortal(
            // Near order-details column (physical left) — not over the nav
            // Near order-details column (physical left) — not over the nav
            <div className="pointer-events-none fixed left-4 top-4 z-[100] flex max-h-[min(70vh,520px)] flex-col gap-2 overflow-y-auto pe-1 xl:left-[calc(340px+1.5rem)]">
              {items.map((item) => (
                <ToastCard
                  key={item.id}
                  item={item}
                  onClose={() => dismiss(item.id)}
                />
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast outside ToastProvider");
  return ctx;
}
