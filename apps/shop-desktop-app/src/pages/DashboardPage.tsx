import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { shopApi, type ShopOrder, type ShopStats } from "../lib/api";
import { Badge, EmptyState, Panel } from "../components/ui";
import { PageHeading } from "../components/PageHeading";
import { Icons } from "../components/icons";
import { OrderDetailPanel } from "../components/OrderDetailPanel";
import { StatCard, StatMoney } from "../components/StatCard";
import {
  SortHeader,
  compareNumber,
  compareText,
  toggleSort,
  type SortDir,
} from "../components/SortHeader";
import { orderStatusAr, orderStatusTone } from "../lib/labels";

function orderLabel(o: ShopOrder) {
  const raw = o.order_number || o.display_number || o.id.slice(0, 8);
  return raw.startsWith("#") ? raw : `#${raw}`;
}

function serviceLabel(o: ShopOrder) {
  const items = o.items as Array<{ color_mode?: string }> | undefined;
  if (!items?.length) return "طباعة مستندات";
  return items.some((i) => i.color_mode === "color") ? "طباعة ملونة" : "طباعة مستندات";
}

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  return `منذ ${Math.floor(mins / 60)} ساعة`;
}

export function DashboardPage() {
  const { token, me } = useAuth();
  const [stats, setStats] = useState<ShopStats | null>(null);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<
    "order" | "customer" | "phone" | "service" | "status" | "time"
  >("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [s, o] = await Promise.all([
        shopApi.stats(token),
        shopApi.orders(token, "active"),
      ]);
      setStats(s);
      const list = Array.isArray(o) ? o : [];
      setOrders(list);
      setSelectedId((prev) =>
        prev && list.some((x) => x.id === prev) ? prev : (list[0]?.id ?? null),
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر التحميل");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(id);
  }, [load]);

  const selected = useMemo(
    () => orders.find((o) => o.id === selectedId) ?? null,
    [orders, selectedId],
  );

  const sortedOrders = useMemo(() => {
    const list = [...orders];
    list.sort((a, b) => {
      switch (sortKey) {
        case "order":
          return compareText(orderLabel(a), orderLabel(b), sortDir);
        case "customer":
          return compareText(a.customer_name || "", b.customer_name || "", sortDir);
        case "phone":
          return compareText(a.customer_phone || "", b.customer_phone || "", sortDir);
        case "service":
          return compareText(serviceLabel(a), serviceLabel(b), sortDir);
        case "status":
          return compareText(orderStatusAr(a.status), orderStatusAr(b.status), sortDir);
        case "time":
        default:
          return compareNumber(
            new Date(a.created_at).getTime(),
            new Date(b.created_at).getTime(),
            sortDir,
          );
      }
    });
    return list;
  }, [orders, sortKey, sortDir]);

  const onSort = (
    key: "order" | "customer" | "phone" | "service" | "status" | "time",
  ) => {
    const next = toggleSort(sortKey, sortDir, key, key === "time" ? "desc" : "asc");
    setSortKey(next.key);
    setSortDir(next.dir);
  };

  const delta =
    typeof stats?.orders_delta_percent === "number" ? stats.orders_delta_percent : null;

  const runAction = async (
    kind: "dispatch" | "retry" | "ready" | "collected",
  ) => {
    if (!token || !selected) return;
    setActionBusy(true);
    setActionMsg(null);
    try {
      if (kind === "dispatch") await shopApi.dispatch(token, selected.id);
      if (kind === "retry") await shopApi.retry(token, selected.id);
      if (kind === "ready") await shopApi.markReady(token, selected.id);
      if (kind === "collected") await shopApi.markCollected(token, selected.id);
      setActionMsg("تم التنفيذ");
      await load();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "فشلت العملية");
    } finally {
      setActionBusy(false);
    }
  };

  const cards = [
    {
      label: "طلبات اليوم",
      value: typeof stats?.today_orders === "number" ? String(stats.today_orders) : "—",
      hint:
        delta != null ? (
          <>
            {delta >= 0 ? (
              <span aria-hidden className="text-[11px] leading-none">
                ↑
              </span>
            ) : (
              <span aria-hidden className="text-[11px] leading-none">
                ↓
              </span>
            )}
            <span>
              {Math.abs(delta)}% عن أمس
            </span>
          </>
        ) : (
          "—"
        ),
      icon: Icons.bag({ size: 20 }),
      tone: "primary" as const,
      hintPositive: delta != null && delta >= 0,
    },
    {
      label: "الإيرادات اليوم",
      value: (
        <StatMoney
          amount={
            typeof stats?.today_revenue_display === "string"
              ? stats.today_revenue_display
              : "—"
          }
        />
      ),
      hint: (
        <>
          <span aria-hidden className="text-[11px] leading-none">
            ↑
          </span>
          <span>مقارنة بأمس</span>
        </>
      ),
      icon: Icons.wallet({ size: 20 }),
      tone: "success" as const,
      hintPositive: true,
    },
    {
      label: "قيد الطباعة",
      value:
        typeof stats?.printing_count === "number" ? String(stats.printing_count) : "—",
      hint: "الطلبات الجارية الآن",
      icon: Icons.printer({ size: 20 }),
      tone: "info" as const,
      hintPositive: false,
    },
    {
      label: "جاهز للاستلام",
      value: typeof stats?.ready_count === "number" ? String(stats.ready_count) : "—",
      hint: "جاهزة في المكتبة",
      icon: Icons.tag({ size: 20 }),
      tone: "warning" as const,
      hintPositive: false,
    },
  ];

  if (loading) return <EmptyState title="جاري تحميل لوحة التحكم..." />;
  if (error) return <Panel className="p-4 text-body text-danger">{error}</Panel>;

  return (
    <div className="flex h-full min-h-0 gap-3">
      {/* Main column */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <PageHeading
          icon={Icons.home({ size: 22 })}
          title="لوحة التحكم"
          description={`مرحباً بك في ${me?.store.name ?? "منصة الطباعة"} — نظرة سريعة على التشغيل اليوم`}
        />

        {/* KPI row */}
        <div className="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">
          {cards.map((c) => (
            <StatCard
              key={c.label}
              label={c.label}
              value={c.value}
              hint={c.hint}
              icon={c.icon}
              tone={c.tone}
              hintPositive={c.hintPositive}
            />
          ))}
        </div>

        {/* Live orders */}
        <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-border-default px-4 py-3">
            <h2 className="text-section">الطلبات المباشرة</h2>
            <Link
              to="/orders"
              className="text-meta text-primary hover:underline"
            >
              عرض الكل
            </Link>
          </div>
          {orders.length === 0 ? (
            <EmptyState title="لا توجد طلبات نشطة" />
          ) : (
            <div className="scroll-y min-h-0 flex-1">
              <table className="w-full text-right text-body">
                <thead className="sticky top-0 z-10 bg-bg-elevated text-meta text-text-muted">
                  <tr className="border-b border-border-default">
                    <SortHeader
                      label="رقم الطلب"
                      active={sortKey === "order"}
                      dir={sortDir}
                      onClick={() => onSort("order")}
                    />
                    <SortHeader
                      label="اسم العميل"
                      active={sortKey === "customer"}
                      dir={sortDir}
                      onClick={() => onSort("customer")}
                    />
                    <SortHeader
                      label="الهاتف"
                      active={sortKey === "phone"}
                      dir={sortDir}
                      onClick={() => onSort("phone")}
                      className="hidden lg:table-cell"
                    />
                    <SortHeader
                      label="الخدمة"
                      active={sortKey === "service"}
                      dir={sortDir}
                      onClick={() => onSort("service")}
                      className="hidden md:table-cell"
                    />
                    <SortHeader
                      label="الحالة"
                      active={sortKey === "status"}
                      dir={sortDir}
                      onClick={() => onSort("status")}
                    />
                    <SortHeader
                      label="وقت الطلب"
                      active={sortKey === "time"}
                      dir={sortDir}
                      onClick={() => onSort("time")}
                    />
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.map((o) => {
                    const active = o.id === selectedId;
                    return (
                      <tr
                        key={o.id}
                        onClick={() => setSelectedId(o.id)}
                        className={`cursor-pointer border-b border-border-default/50 transition-colors ${
                          active ? "bg-primary/10" : "hover:bg-bg-hover/50"
                        }`}
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 font-medium" dir="ltr">
                          {orderLabel(o)}
                        </td>
                        <td className="max-w-[9rem] truncate px-3 py-2.5">
                          {o.customer_name || "—"}
                        </td>
                        <td
                          className="hidden whitespace-nowrap px-3 py-2.5 text-text-secondary lg:table-cell"
                          dir="ltr"
                        >
                          {o.customer_phone || "—"}
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-2.5 text-text-secondary md:table-cell">
                          {serviceLabel(o)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <Badge tone={orderStatusTone(o.status)}>
                            {orderStatusAr(o.status)}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-meta text-text-muted">
                          {timeAgo(o.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <aside className="hidden h-full w-[340px] shrink-0 xl:block">
        <Panel className="flex h-full min-h-0 w-full flex-col overflow-hidden shadow-[0_0_0_1px_rgba(36,48,68,0.6)]">
          <OrderDetailPanel
            order={selected}
            storeName={me?.store.name}
            busy={actionBusy}
            message={actionMsg}
            onPrint={() => void runAction("dispatch")}
            onRetry={() => void runAction("retry")}
            onReady={() => void runAction("ready")}
            onCollected={() => void runAction("collected")}
          />
        </Panel>
      </aside>
    </div>
  );
}
