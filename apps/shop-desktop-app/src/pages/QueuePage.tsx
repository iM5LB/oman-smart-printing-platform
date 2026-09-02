import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/auth";
import { shopApi, type ShopOrder } from "../lib/api";
import { Badge, EmptyState, Panel } from "../components/ui";
import { Icons } from "../components/icons";
import { CountPill, PageHeading } from "../components/PageHeading";
import {
  isPaymentPaid,
  orderStatusAr,
  orderStatusTone,
  paymentStatusAr,
} from "../lib/labels";

type OrderItem = {
  filename?: string;
  page_count?: number;
  color_mode?: string;
};

function orderLabel(o: ShopOrder) {
  const raw = o.order_number || o.display_number || o.id.slice(0, 8);
  return raw.startsWith("#") ? raw : `#${raw}`;
}

function fileKind(name?: string) {
  if (!name) return "DOC";
  const ext = name.split(".").pop()?.toUpperCase() ?? "DOC";
  if (ext.length > 4) return "DOC";
  return ext;
}

function firstItem(o: ShopOrder): OrderItem | undefined {
  return ((o.items as OrderItem[]) ?? [])[0];
}

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  return `منذ ${Math.floor(mins / 60)} س`;
}

const COL_ACCENT = {
  info: "bg-info",
  warning: "bg-warning",
  success: "bg-success",
} as const;

function QueueJobCard({
  order,
  active = false,
}: {
  order: ShopOrder;
  active?: boolean;
}) {
  const item = firstItem(order);
  const paid = isPaymentPaid(order.payment_status);

  return (
    <li
      className={`rounded-xl border p-3 transition-colors ${
        active
          ? "border-primary/35 bg-primary/8"
          : "border-border-default bg-bg-elevated hover:bg-bg-hover/60"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex size-11 shrink-0 items-center justify-center rounded-lg text-caption font-bold ${
            fileKind(item?.filename) === "PDF"
              ? "bg-danger/15 text-danger"
              : "bg-primary/15 text-primary"
          }`}
        >
          {fileKind(item?.filename)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-body font-semibold text-text-primary" dir="ltr">
              {item?.filename || orderLabel(order)}
            </p>
            <span className="shrink-0 text-caption tabular-nums text-text-muted" dir="ltr">
              {orderLabel(order)}
            </span>
          </div>

          <p className="mt-1 truncate text-meta text-text-secondary">
            {order.customer_name || "عميل"}
            {item?.page_count != null ? ` · ${item.page_count} صفحة` : ""}
            {order.created_at ? ` · ${timeAgo(order.created_at)}` : ""}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={orderStatusTone(order.status)}>
              {orderStatusAr(order.status)}
            </Badge>
            <Badge tone={paid ? "success" : "warning"}>
              {paymentStatusAr(order.payment_status)}
            </Badge>
          </div>

          {active ? (
            <>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-hover">
                <div className="animate-progress-indeterminate h-full w-2/5 rounded-full bg-primary" />
              </div>
              <p className="mt-1.5 text-caption text-text-muted">جاري الطباعة…</p>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function QueuePage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        if (!cancelled) setError(e instanceof Error ? e.message : "تعذر التحميل");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const id = window.setInterval(load, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token]);

  const sections = useMemo(() => {
    const printing = orders.filter((o) => o.status === "printing");
    const next = orders.filter((o) => ["queued", "preparing"].includes(o.status));
    const ready = orders.filter((o) => o.status === "ready");
    return { printing, next, ready };
  }, [orders]);

  const total =
    sections.printing.length + sections.next.length + sections.ready.length;

  const columns = [
    {
      title: "جاري الطباعة",
      subtitle: "المهام النشطة الآن",
      items: sections.printing,
      tone: "info" as const,
      icon: Icons.printer({ size: 16 }),
      active: true,
    },
    {
      title: "التالي في الطابور",
      subtitle: "بانتظار الدور",
      items: sections.next,
      tone: "warning" as const,
      icon: Icons.queue({ size: 16 }),
      active: false,
    },
    {
      title: "جاهز للاستلام",
      subtitle: "عند المكتب",
      items: sections.ready,
      tone: "success" as const,
      icon: Icons.tag({ size: 16 }),
      active: false,
    },
  ] as const;

  return (
    <div className="page-fit">
      <PageHeading
        icon={Icons.queue({ size: 22 })}
        title="قائمة الطباعة"
        description="تتبّع المهام حسب المرحلة — يُحدَّث كل ١٥ ثانية"
        actions={<CountPill value={total} label="مهمة" />}
      />

      {loading ? (
        <EmptyState title="جاري التحميل..." />
      ) : error ? (
        <EmptyState title="تعذر التحميل" detail={error} />
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-3">
          {columns.map((col) => (
            <Panel key={col.title} className="flex min-h-0 flex-col overflow-hidden">
              <div className="relative shrink-0 border-b border-border-default px-3.5 py-3">
                <div
                  className={`absolute inset-y-3 start-0 w-1 rounded-full ${COL_ACCENT[col.tone]}`}
                />
                <div className="flex items-center justify-between gap-2 ps-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className={`flex size-8 items-center justify-center rounded-full ${
                        col.tone === "info"
                          ? "bg-info/15 text-info"
                          : col.tone === "warning"
                            ? "bg-warning/15 text-warning"
                            : "bg-success/15 text-success"
                      }`}
                    >
                      {col.icon}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-section font-semibold">{col.title}</h2>
                      <p className="text-caption text-text-muted">{col.subtitle}</p>
                    </div>
                  </div>
                  <Badge tone={col.tone}>{col.items.length}</Badge>
                </div>
              </div>

              {col.items.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-bg-elevated text-text-muted">
                    {Icons.check({ size: 16 })}
                  </div>
                  <p className="text-meta text-text-muted">لا مهام في هذه المرحلة</p>
                </div>
              ) : (
                <ul className="scroll-y min-h-0 flex-1 space-y-2.5 p-3">
                  {col.items.map((o) => (
                    <QueueJobCard key={o.id} order={o} active={col.active} />
                  ))}
                </ul>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
