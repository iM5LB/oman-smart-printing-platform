import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { shopApi, type ShopOrder, type ShopPayment, type ShopStats } from "../lib/api";
import { Badge, Button, EmptyState, Panel } from "../components/ui";
import { StatCard, StatMoney } from "../components/StatCard";
import { Icons } from "../components/icons";
import { PageHeading } from "../components/PageHeading";
import { useToast } from "../components/Toast";
import { exportExcelCsv, exportPdfHtml } from "../lib/reportExport";
import {
  orderStatusAr,
  paymentMethodAr,
  paymentStatusAr,
} from "../lib/labels";

function orderLabel(o: ShopOrder) {
  const raw = o.order_number || o.display_number || o.id.slice(0, 8);
  return raw.startsWith("#") ? raw : `#${raw}`;
}

function money(o: ShopOrder) {
  if (o.total_display) return o.total_display;
  const baisa = o.total_baisa ?? o.total;
  if (typeof baisa === "number") return `${(baisa / 1000).toFixed(3)} ر.ع`;
  return "—";
}

export function ReportsPage() {
  const { token, me } = useAuth();
  const { push: pushToast } = useToast();
  const [stats, setStats] = useState<ShopStats | null>(null);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [payments, setPayments] = useState<ShopPayment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [s, o, p] = await Promise.all([
        shopApi.stats(token),
        shopApi.orders(token, "active"),
        shopApi.payments(token),
      ]);
      setStats(s);
      setOrders(Array.isArray(o) ? o : []);
      setPayments(Array.isArray(p) ? p : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر التحميل");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const buildSummary = () => [
    { label: "طلبات اليوم", value: String(stats?.today_orders ?? "—") },
    {
      label: "إيراد اليوم",
      value: String(stats?.today_revenue_display ?? "—"),
    },
    {
      label: "طلبات الأسبوع",
      value: String(stats?.week_orders ?? "—"),
    },
    {
      label: "إيراد الأسبوع",
      value: String(stats?.week_revenue_display ?? "—"),
    },
    {
      label: "قيد الطباعة",
      value: String(stats?.printing_count ?? "—"),
    },
    {
      label: "جاهز للاستلام",
      value: String(stats?.ready_count ?? "—"),
    },
  ];

  const orderHeaders = ["الطلب", "العميل", "الهاتف", "الحالة", "الدفع", "المبلغ", "الوقت"];
  const orderRows = orders.map((o) => [
    orderLabel(o),
    o.customer_name || "—",
    o.customer_phone || "—",
    orderStatusAr(o.status),
    paymentStatusAr(o.payment_status),
    money(o),
    new Date(o.created_at).toLocaleString("ar-OM"),
  ]);

  const paymentHeaders = ["الطلب", "العميل", "المبلغ", "الحالة", "الطريقة", "التاريخ"];
  const paymentRows = payments.map((p) => [
    p.order_number || "—",
    p.customer_name || "—",
    p.amount_display,
    paymentStatusAr(p.status),
    paymentMethodAr(p.in_store_method || p.method),
    p.paid_at
      ? new Date(p.paid_at).toLocaleString("ar-OM")
      : new Date(p.created_at).toLocaleString("ar-OM"),
  ]);

  const onExcel = async () => {
    setExporting("excel");
    try {
      const result = await exportExcelCsv("تقرير-المكتبة", [
        {
          name: "الملخص",
          headers: ["البند", "القيمة"],
          rows: buildSummary().map((s) => [s.label, s.value]),
        },
        {
          name: "الطلبات النشطة",
          headers: orderHeaders,
          rows: orderRows,
        },
        {
          name: "المدفوعات",
          headers: paymentHeaders,
          rows: paymentRows,
        },
      ]);
      if (result === "saved") {
        pushToast({ title: "تم حفظ ملف Excel", tone: "success" });
      }
    } catch (e) {
      pushToast({
        title: "فشل تصدير Excel",
        detail: e instanceof Error ? e.message : String(e),
        tone: "danger",
      });
    } finally {
      setExporting(null);
    }
  };

  const onPdf = async () => {
    setExporting("pdf");
    try {
      const result = await exportPdfHtml({
        title: "تقرير تشغيل المكتبة",
        storeName: me?.store.name,
        summary: buildSummary(),
        tables: [
          {
            title: "الطلبات النشطة",
            headers: orderHeaders,
            rows: orderRows.map((r) => r.map(String)),
          },
          {
            title: "المدفوعات",
            headers: paymentHeaders,
            rows: paymentRows.map((r) => r.map(String)),
          },
        ],
      });
      if (result === "opened") {
        pushToast({
          title: "تم فتح التقرير",
          detail: "استخدم طباعة / حفظ PDF من نافذة المتصفح",
          tone: "success",
        });
      } else if (result === "saved") {
        pushToast({ title: "تم حفظ ملف التقرير", tone: "success" });
      }
    } catch (e) {
      pushToast({
        title: "فشل تصدير PDF",
        detail: e instanceof Error ? e.message : String(e),
        tone: "danger",
      });
    } finally {
      setExporting(null);
    }
  };

  if (loading) return <EmptyState title="جاري التحميل..." />;
  if (error) return <EmptyState title="تعذر التحميل" detail={error} />;

  const delta =
    typeof stats?.orders_delta_percent === "number" ? stats.orders_delta_percent : null;

  const cards = [
    {
      label: "طلبات اليوم",
      value: stats?.today_orders ?? "—",
      hint:
        delta != null ? (
          <>
            <span aria-hidden className="text-[11px] leading-none">
              {delta >= 0 ? "↑" : "↓"}
            </span>
            <span>{Math.abs(delta)}% عن أمس</span>
          </>
        ) : (
          "—"
        ),
      icon: Icons.bag({ size: 20 }),
      tone: "primary" as const,
      hintPositive: delta != null && delta >= 0,
    },
    {
      label: "إيراد اليوم",
      value: <StatMoney amount={stats?.today_revenue_display ?? "—"} />,
      hint: `أمس: ${stats?.yesterday_revenue_display ?? "—"}`,
      icon: Icons.wallet({ size: 20 }),
      tone: "success" as const,
      hintPositive: false,
    },
    {
      label: "طلبات الأسبوع",
      value: stats?.week_orders ?? "—",
      hint: stats?.week_revenue_display ?? "—",
      icon: Icons.reports({ size: 20 }),
      tone: "info" as const,
      hintPositive: false,
    },
    {
      label: "قيد الطباعة",
      value: stats?.printing_count ?? "—",
      hint: `جاهز: ${stats?.ready_count ?? 0}`,
      icon: Icons.printer({ size: 20 }),
      tone: "warning" as const,
      hintPositive: false,
    },
  ];

  return (
    <div className="page-fit">
      <PageHeading
        icon={Icons.reports({ size: 22 })}
        title="التقارير"
        description="ملخص تشغيلي من السحابة — صدّر تقريراً تفصيلياً PDF أو Excel"
        actions={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={exporting != null}
              onClick={() => void onExcel()}
            >
              {Icons.file({ size: 15 })}
              {exporting === "excel" ? "جاري التصدير…" : "تصدير Excel"}
            </Button>
            <Button type="button" disabled={exporting != null} onClick={() => void onPdf()}>
              {Icons.reports({ size: 15 })}
              {exporting === "pdf" ? "جاري التصدير…" : "تصدير PDF"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => void load()}>
              {Icons.refresh({ size: 14 })}
              تحديث
            </Button>
          </>
        }
      />

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

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-border-default px-3.5 py-2.5">
            <h2 className="text-section">الطلبات النشطة</h2>
            <Badge tone="info">{orders.length}</Badge>
          </div>
          <div className="scroll-y min-h-0 flex-1">
            {orders.length === 0 ? (
              <EmptyState title="لا طلبات نشطة" />
            ) : (
              <table className="w-full text-right text-body">
                <thead className="sticky top-0 bg-bg-elevated text-meta text-text-muted">
                  <tr className="border-b border-border-default">
                    <th className="px-3 py-2 font-medium">الطلب</th>
                    <th className="px-3 py-2 font-medium">العميل</th>
                    <th className="px-3 py-2 font-medium">الحالة</th>
                    <th className="px-3 py-2 font-medium">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 40).map((o) => (
                    <tr key={o.id} className="border-b border-border-default/60">
                      <td className="whitespace-nowrap px-3 py-2" dir="ltr">
                        {orderLabel(o)}
                      </td>
                      <td className="max-w-[8rem] truncate px-3 py-2">
                        {o.customer_name || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-meta">
                        {orderStatusAr(o.status)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                        {money(o)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>

        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-border-default px-3.5 py-2.5">
            <h2 className="text-section">المدفوعات</h2>
            <Badge tone="success">{payments.length}</Badge>
          </div>
          <div className="scroll-y min-h-0 flex-1">
            {payments.length === 0 ? (
              <EmptyState title="لا مدفوعات" />
            ) : (
              <table className="w-full text-right text-body">
                <thead className="sticky top-0 bg-bg-elevated text-meta text-text-muted">
                  <tr className="border-b border-border-default">
                    <th className="px-3 py-2 font-medium">الطلب</th>
                    <th className="px-3 py-2 font-medium">المبلغ</th>
                    <th className="px-3 py-2 font-medium">الحالة</th>
                    <th className="px-3 py-2 font-medium">الطريقة</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 40).map((p) => (
                    <tr key={p.id} className="border-b border-border-default/60">
                      <td className="whitespace-nowrap px-3 py-2" dir="ltr">
                        {p.order_number || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                        {p.amount_display}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-meta">
                        {paymentStatusAr(p.status)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-meta">
                        {paymentMethodAr(p.in_store_method || p.method)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
