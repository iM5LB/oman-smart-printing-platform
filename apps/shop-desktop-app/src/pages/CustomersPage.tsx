import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/auth";
import { shopApi, type ShopCustomer } from "../lib/api";
import { EmptyState, Input, Panel } from "../components/ui";
import { CountPill, PageHeading } from "../components/PageHeading";
import { Icons } from "../components/icons";

function formatOmr(baisa: number) {
  return `${(baisa / 1000).toFixed(3)} ر.ع`;
}

export function CustomersPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<ShopCustomer[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await shopApi.customers(token);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    );
  }, [rows, query]);

  return (
    <div className="page-fit">
      <PageHeading
        icon={Icons.customers({ size: 22 })}
        title="العملاء"
        description="سجل العملاء وعدد الطلبات والإجمالي"
        filters={
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف"
            className="w-full max-w-xl"
          />
        }
        actions={<CountPill value={filtered.length} label="عميل" />}
      />
      <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          <EmptyState title="جاري التحميل..." />
        ) : error ? (
          <EmptyState title="تعذر التحميل" detail={error} />
        ) : filtered.length === 0 ? (
          <EmptyState title="لا يوجد عملاء" />
        ) : (
          <div className="scroll-y min-h-0 flex-1">
            <table className="w-full text-right text-body">
              <thead className="sticky top-0 z-10 bg-bg-elevated text-meta text-text-muted">
                <tr className="border-b border-border-default">
                  <th className="px-3.5 py-2.5 font-medium">الاسم</th>
                  <th className="px-3.5 py-2.5 font-medium">الهاتف</th>
                  <th className="px-3.5 py-2.5 font-medium">الطلبات</th>
                  <th className="px-3.5 py-2.5 font-medium">الإجمالي</th>
                  <th className="px-3.5 py-2.5 font-medium">آخر طلب</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.phone}
                    className="border-b border-border-default/60 hover:bg-bg-hover/40"
                  >
                    <td className="px-3.5 py-2.5 font-medium">{c.name}</td>
                    <td className="px-3.5 py-2.5" dir="ltr">
                      {c.phone}
                    </td>
                    <td className="px-3.5 py-2.5 tabular-nums">{c.order_count}</td>
                    <td className="px-3.5 py-2.5 tabular-nums">
                      {c.total_display || formatOmr(c.total_baisa)}
                    </td>
                    <td className="px-3.5 py-2.5 text-meta text-text-muted" dir="ltr">
                      {c.last_order_at.slice(0, 10)}
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
