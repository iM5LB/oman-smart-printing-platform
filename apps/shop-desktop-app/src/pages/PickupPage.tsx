import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { shopApi, type ShopOrder } from "../lib/api";
import { Badge, Button, EmptyState, Input, Panel } from "../components/ui";
import { Icons } from "../components/icons";
import { PageHeading } from "../components/PageHeading";
import {
  isPaymentPaid,
  orderStatusAr,
  orderStatusTone,
} from "../lib/labels";

export function PickupPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const all = await shopApi.orders(token, "active");
      setOrders(Array.isArray(all) ? all : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر البحث");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const all = await shopApi.orders(token, "active");
        if (!cancelled) setOrders(Array.isArray(all) ? all : []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "تعذر البحث");
          setOrders([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    await load();
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders.filter((o) => o.status === "ready").slice(0, 30);
    return orders.filter((o) => {
      const num = (o.display_number || o.order_number || "").toLowerCase();
      const phone = (o.customer_phone || "").toLowerCase();
      const name = (o.customer_name || "").toLowerCase();
      return num.includes(q) || phone.includes(q) || name.includes(q) || o.id.includes(q);
    });
  }, [orders, query]);

  const markCollected = async (orderId: string) => {
    if (!token) return;
    setBusyId(orderId);
    try {
      await shopApi.markCollected(token, orderId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل التسليم");
    } finally {
      setBusyId(null);
    }
  };

  const payAndCollect = async (orderId: string) => {
    if (!token) return;
    setBusyId(orderId);
    try {
      await shopApi.payInStore(token, orderId, "cash");
      await shopApi.markCollected(token, orderId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الدفع/التسليم");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-fit">
      <PageHeading
        icon={Icons.pickup({ size: 22 })}
        title="الاستلام"
        description="ابحث برقم الطلب أو الهاتف وسلّم الطلبات الجاهزة (F2)"
      />

      <form onSubmit={onSearch} className="flex shrink-0 gap-2">
        <div className="relative min-w-0 flex-1 max-w-xl">
          <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-muted">
            {Icons.search({ size: 15 })}
          </span>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="رقم الطلب أو الهاتف"
            className="ps-9"
            autoFocus
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "..." : "بحث"}
        </Button>
      </form>

      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {error ? (
          <EmptyState title="خطأ" detail={error} />
        ) : matches.length === 0 ? (
          <EmptyState
            title={loading ? "جاري التحميل..." : "لا نتائج"}
            detail="ابحث برقم الطلب أو اعرض الطلبات الجاهزة."
          />
        ) : (
          <ul className="scroll-y min-h-0 flex-1 divide-y divide-border-default">
            {matches.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-body font-medium" dir="ltr">
                    {o.display_number || o.order_number || o.id.slice(0, 8)}
                  </p>
                  <p className="text-meta text-text-muted">
                    {o.customer_name || "—"} ·{" "}
                    <span className="unicode-bidi-isolate" dir="ltr">
                      {o.customer_phone}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge tone={orderStatusTone(o.status)}>
                    {orderStatusAr(o.status)}
                  </Badge>
                  {!isPaymentPaid(o.payment_status) ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busyId === o.id}
                      onClick={() => void payAndCollect(o.id)}
                    >
                      {busyId === o.id ? "..." : "دفع وتسليم"}
                    </Button>
                  ) : o.status === "ready" ? (
                    <Button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => void markCollected(o.id)}
                    >
                      {busyId === o.id ? "..." : "تسليم"}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
