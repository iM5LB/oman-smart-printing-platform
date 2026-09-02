import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../lib/auth";
import { shopApi } from "../lib/api";
import { Icons } from "./icons";
import { NotificationBell } from "./NotificationBell";
import { useToast } from "./Toast";

const nav = [
  { to: "/", label: "الرئيسية", end: true, icon: Icons.home },
  { to: "/orders", label: "الطلبات", icon: Icons.orders },
  { to: "/queue", label: "قائمة الطباعة", icon: Icons.queue },
  { to: "/printers", label: "الطابعات", icon: Icons.printer },
  { to: "/payments", label: "المدفوعات", icon: Icons.payments },
  { to: "/customers", label: "العملاء", icon: Icons.customers },
  { to: "/pricing", label: "الأسعار", icon: Icons.pricing },
  { to: "/reports", label: "التقارير", icon: Icons.reports },
  { to: "/settings", label: "الإعدادات", icon: Icons.settings },
];

function formatOrderLabel(raw: string) {
  return raw.startsWith("#") ? raw : `#${raw}`;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { me, logout, token } = useAuth();
  const navigate = useNavigate();
  const { push: pushToast } = useToast();
  const [online, setOnline] = useState(true);
  const knownOrderIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        navigate("/pickup");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const ping = async () => {
      try {
        await shopApi.me(token);
        if (!cancelled) setOnline(true);
      } catch {
        if (!cancelled) setOnline(false);
      }
    };
    void ping();
    const id = window.setInterval(ping, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const orders = await shopApi.orders(token, "active");
        if (cancelled || !Array.isArray(orders)) return;

        const ids = new Set(orders.map((o) => o.id));

        if (knownOrderIds.current == null) {
          knownOrderIds.current = ids;
          return;
        }

        for (const order of orders) {
          if (knownOrderIds.current.has(order.id)) continue;
          const raw =
            order.order_number || order.display_number || order.id.slice(0, 6);
          const label = formatOrderLabel(raw);
          pushToast({
            id: `order-${order.id}`,
            tone: "success",
            title: `${label} طلب جديد`,
            detail: "تم استلام طلب جديد من العميل",
            durationMs: 6000,
          });
        }

        knownOrderIds.current = ids;
      } catch {
        /* ignore */
      }
    };

    void poll();
    const id = window.setInterval(poll, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token, pushToast]);

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-bg-base text-text-primary">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 40% at 80% 0%, rgba(31,111,235,0.14), transparent 55%), radial-gradient(ellipse 40% 30% at 10% 100%, rgba(34,197,94,0.06), transparent 50%)",
        }}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1">
        <aside className="z-10 flex w-[260px] shrink-0 flex-col border-e border-border-default bg-bg-surface">
          <div className="relative z-20 flex items-center gap-3 px-4 py-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_8px_24px_rgba(31,111,235,0.35)]">
              {Icons.printer({ size: 20 })}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-title leading-tight">منصة الطباعة</p>
              <p className="truncate text-meta text-text-muted">سلطنة عُمان</p>
            </div>
            <NotificationBell className="shrink-0" />
          </div>

          <nav className="flex flex-1 flex-col gap-1.5 overflow-auto px-2.5 pb-3">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3.5 py-3 text-section font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-primary text-white shadow-[0_6px_18px_rgba(31,111,235,0.35)]"
                      : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={
                        isActive
                          ? "text-white"
                          : "text-text-secondary group-hover:text-text-primary"
                      }
                    >
                      {item.icon({ size: 20 })}
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-2 border-t border-border-default p-3">
            <div
              className="flex items-center gap-2 px-1 py-0.5"
              aria-label={online ? "متصل بالإنترنت" : "غير متصل"}
            >
              <span
                className={`size-2 shrink-0 rounded-full ${online ? "bg-success animate-pulse-dot" : "bg-danger"}`}
                aria-hidden
              />
              <span
                className={`text-meta ${online ? "text-success" : "text-danger"}`}
              >
                {online ? "متصل بالإنترنت" : "غير متصل"}
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl border border-border-default bg-bg-elevated px-3 py-2.5 text-start transition-colors hover:bg-bg-hover"
            >
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/20 text-meta font-semibold text-primary">
                {(me?.device.name ?? me?.store.name ?? "م").slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium">
                  {me?.device.name ?? me?.store.name ?? "الجهاز"}
                </p>
                <p className="truncate text-meta text-text-muted">
                  {me?.store.name ?? "المكتبة"}
                </p>
              </div>
              <span className="text-text-muted">{Icons.chevron({ size: 16 })}</span>
            </button>
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden p-4 animate-fade-up">
            <div className="h-full min-h-0">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
