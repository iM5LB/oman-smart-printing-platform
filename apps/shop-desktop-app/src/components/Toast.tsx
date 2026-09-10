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
import {
  notifyOs,
  prefetchOsNotificationPermission,
} from "../lib/osNotifications";

export type ToastTone = "success" | "info" | "warning" | "danger";

export type ToastItem = {
  id: string;
  title: string;
  detail?: string;
  tone?: ToastTone;
  durationMs?: number;
  createdAt?: number;
  read?: boolean;
  /** When false, skip Windows OS toast (in-app only). Default true. */
  osNotify?: boolean;
};

type ToastContextValue = {
  push: (toast: Omit<ToastItem, "id"> & { id?: string }) => void;
  dismiss: (id: string) => void;
  notifications: ToastItem[];
  unreadCount: number;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
  markAllRead: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneBar: Record<ToastTone, string> = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  danger: "bg-danger",
};

const toneIconBg: Record<ToastTone, string> = {
  success: "bg-success text-white",
  info: "bg-info text-white",
  warning: "bg-warning text-white",
  danger: "bg-danger text-white",
};

export function ToneIcon({
  tone,
  size = 15,
}: {
  tone: ToastTone;
  size?: number;
}) {
  if (tone === "warning" || tone === "danger") {
    return Icons.alert({ size });
  }
  if (tone === "info") return Icons.info({ size });
  return Icons.check({ size });
}

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
      <div className={`absolute inset-y-0 start-0 w-[5px] ${toneBar[tone]}`} />

      <div
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${toneIconBg[tone]}`}
      >
        <ToneIcon tone={tone} size={15} />
      </div>

      <div className="min-w-0 flex-1 pt-0.5 text-start">
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
        {Icons.x({ size: 14 })}
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [notifications, setNotifications] = useState<ToastItem[]>([]);

  useEffect(() => {
    prefetchOsNotificationPermission();
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => (n.read ? n : { ...n, read: true })),
    );
  }, []);

  const push = useCallback((toast: Omit<ToastItem, "id"> & { id?: string }) => {
    const id =
      toast.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const full: ToastItem = {
      tone: "success",
      durationMs: 5500,
      osNotify: true,
      read: false,
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
      return [full, ...prev].slice(0, 50);
    });

    if (full.osNotify !== false) {
      void notifyOs({
        title: full.title,
        body: full.detail,
      });
    }
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = useMemo(
    () => ({
      push,
      dismiss,
      notifications,
      unreadCount,
      clearNotifications,
      removeNotification,
      markAllRead,
    }),
    [
      push,
      dismiss,
      notifications,
      unreadCount,
      clearNotifications,
      removeNotification,
      markAllRead,
    ],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined"
        ? createPortal(
            <div className="pointer-events-none fixed start-4 top-4 z-[100] flex max-h-[min(70vh,520px)] flex-col gap-2 overflow-y-auto pe-1 xl:start-[calc(340px+1.5rem)]">
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
