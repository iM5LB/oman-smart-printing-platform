import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/auth";
import { shopApi, type ShopOrder } from "../lib/api";
import { Badge, EmptyState, Panel } from "../components/ui";
import { CountPill, PageHeading } from "../components/PageHeading";
import { Icons } from "../components/icons";
import {
  SortHeader,
  compareNumber,
  compareText,
  toggleSort,
  type SortDir,
} from "../components/SortHeader";
import {
  orderStatusAr,
  orderStatusTone,
  paymentStatusAr,
} from "../lib/labels";

function orderLabel(o: ShopOrder) {
  return o.order_number || o.display_number || o.id.slice(0, 8);
}

function money(o: ShopOrder) {
  if (o.total_display) return o.total_display;
  const baisa = o.total_baisa ?? o.total;
  if (typeof baisa === "number") return `${(baisa / 1000).toFixed(3)} ر.ع`;
  return "—";
}

function moneyValue(o: ShopOrder) {
  return o.total_baisa ?? o.total ?? 0;
}

const FILTERS = [
  { id: "all", label: "الكل" },
  { id: "printing", label: "طباعة" },
  { id: "ready", label: "جاهزة" },
  { id: "needs_review", label: "مراجعة" },
  { id: "review_pending", label: "بانتظار المراجعة" },
  { id: "payment_pending", label: "بانتظار الدفع" },
] as const;

type SortKey = "order" | "customer" | "status" | "payment" | "amount";

export function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [sortKey, setSortKey] = useState<SortKey>("order");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const load = async () => {
      try {
        const data = await shopApi.orders(token, "active");
        if (!cancelled) {
          setOrders(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "تعذر تحميل الطلبات");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const id = window.setInterval(load, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token]);

  const filtered = useMemo(() => {
    let list =
      filter === "all"
        ? [...orders]
        : filter === "printing"
          ? orders.filter((o) =>
              ["printing", "queued", "preparing"].includes(o.status),
            )
          : orders.filter((o) => o.status === filter);

    list.sort((a, b) => {
      switch (sortKey) {
        case "customer":
          return compareText(a.customer_name || "", b.customer_name || "", sortDir);
        case "status":
          return compareText(orderStatusAr(a.status), orderStatusAr(b.status), sortDir);
        case "payment":
          return compareText(
            paymentStatusAr(a.payment_status),
            paymentStatusAr(b.payment_status),
            sortDir,
          );
        case "amount":
          return compareNumber(moneyValue(a), moneyValue(b), sortDir);
        case "order":
        default:
          return compareText(String(orderLabel(a)), String(orderLabel(b)), sortDir);
      }
    });
    return list;
  }, [orders, filter, sortKey, sortDir]);

  const onSort = (key: SortKey) => {
    const next = toggleSort(sortKey, sortDir, key, key === "amount" ? "desc" : "asc");
    setSortKey(next.key);
    setSortDir(next.dir);
  };

  return (
    <div className="page-fit">
      <PageHeading
        icon={Icons.orders({ size: 22 })}
        title="الطلبات"
        description="إدارة الطلبات النشطة وفرزها حسب الحالة أو الوقت"
        filters={
          <div className="flex w-full items-center gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 text-center text-body transition-colors ${
                  filter === f.id
                    ? "bg-primary text-white"
                    : "bg-bg-elevated text-text-secondary hover:bg-bg-hover"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
        actions={<CountPill value={filtered.length} label="طلب" />}
      />

      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <EmptyState title="جاري التحميل..." />
        ) : error ? (
          <EmptyState title="تعذر التحميل" detail={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="لا توجد طلبات"
            detail="ستظهر الطلبات النشطة هنا فور وصولها."
          />
        ) : (
          <div className="scroll-y min-h-0 flex-1">
            <table className="w-full text-right text-body">
              <thead className="sticky top-0 z-10 bg-bg-elevated text-meta text-text-muted">
                <tr className="border-b border-border-default">
                  <SortHeader
                    label="الطلب"
                    active={sortKey === "order"}
                    dir={sortDir}
                    onClick={() => onSort("order")}
                    className="!px-3"
                  />
                  <SortHeader
                    label="العميل"
                    active={sortKey === "customer"}
                    dir={sortDir}
                    onClick={() => onSort("customer")}
                    className="!px-3"
                  />
                  <SortHeader
                    label="الحالة"
                    active={sortKey === "status"}
                    dir={sortDir}
                    onClick={() => onSort("status")}
                    className="!px-3"
                  />
                  <SortHeader
                    label="الدفع"
                    active={sortKey === "payment"}
                    dir={sortDir}
                    onClick={() => onSort("payment")}
                    className="!px-3"
                  />
                  <SortHeader
                    label="المبلغ"
                    active={sortKey === "amount"}
                    dir={sortDir}
                    onClick={() => onSort("amount")}
                    className="!px-3"
                  />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-border-default/60 hover:bg-bg-hover/50"
                  >
                    <td className="px-3 py-2.5 font-medium" dir="ltr">
                      {orderLabel(o)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div>{o.customer_name || "—"}</div>
                      <div className="unicode-bidi-isolate text-meta text-text-muted" dir="ltr">
                        {o.customer_phone}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Badge tone={orderStatusTone(o.status)}>
                        {orderStatusAr(o.status)}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">
                      {paymentStatusAr(o.payment_status)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{money(o)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
