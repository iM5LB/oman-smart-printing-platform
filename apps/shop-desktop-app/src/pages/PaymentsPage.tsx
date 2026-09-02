import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { shopApi, type ShopPayment } from "../lib/api";
import { Badge, EmptyState, Panel } from "../components/ui";
import { CountPill, PageHeading } from "../components/PageHeading";
import { Icons } from "../components/icons";
import {
  paymentMethodAr,
  paymentStatusAr,
  paymentStatusTone,
} from "../lib/labels";

function methodLabel(p: ShopPayment) {
  return paymentMethodAr(p.in_store_method || p.method);
}

export function PaymentsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<ShopPayment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await shopApi.payments(token);
        if (!cancelled) {
          setRows(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "تعذر التحميل");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="page-fit">
      <PageHeading
        icon={Icons.payments({ size: 22 })}
        title="المدفوعات"
        description="سجل المدفوعات داخل المكتبة والإلكترونية"
        actions={<CountPill value={rows.length} label="عملية" />}
      />

      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <EmptyState title="جاري التحميل..." />
        ) : error ? (
          <EmptyState title="تعذر التحميل" detail={error} />
        ) : rows.length === 0 ? (
          <EmptyState title="لا توجد مدفوعات بعد" />
        ) : (
          <div className="scroll-y min-h-0 flex-1">
            <table className="w-full text-right text-body">
              <thead className="sticky top-0 z-10 bg-bg-elevated text-meta text-text-muted">
                <tr className="border-b border-border-default">
                  <th className="px-3.5 py-2.5 font-medium">الطلب</th>
                  <th className="px-3.5 py-2.5 font-medium">العميل</th>
                  <th className="px-3.5 py-2.5 font-medium">المبلغ</th>
                  <th className="px-3.5 py-2.5 font-medium">الطريقة</th>
                  <th className="px-3.5 py-2.5 font-medium">الحالة</th>
                  <th className="px-3.5 py-2.5 font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border-default/60 hover:bg-bg-hover/40"
                  >
                    <td className="px-3.5 py-2.5 font-medium" dir="ltr">
                      {p.order_number}
                    </td>
                    <td className="px-3.5 py-2.5">{p.customer_name || "—"}</td>
                    <td className="px-3.5 py-2.5 tabular-nums">{p.amount_display}</td>
                    <td className="px-3.5 py-2.5 text-text-secondary">{methodLabel(p)}</td>
                    <td className="px-3.5 py-2.5">
                      <Badge tone={paymentStatusTone(p.status)}>
                        {paymentStatusAr(p.status)}
                      </Badge>
                    </td>
                    <td className="px-3.5 py-2.5 text-meta text-text-muted" dir="ltr">
                      {(p.paid_at || p.created_at).slice(0, 16).replace("T", " ")}
                    </td>
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
