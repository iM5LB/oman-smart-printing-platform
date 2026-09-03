'use client';

import { useCallback, useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { fetchLibraryOrders, LibraryOrder } from '@/lib/library-api';
import { PageHeading } from '@/components/library-admin/page-heading';
import { orderLabel, orderStatusAr } from '@/lib/library-labels';

type Filter = 'active' | 'all';

export default function LibraryOrdersPage() {
  const [orders, setOrders] = useState<LibraryOrder[]>([]);
  const [filter, setFilter] = useState<Filter>('active');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchLibraryOrders(filter === 'active' ? 'active' : undefined);
      setOrders(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر التحميل');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  return (
    <div>
      <PageHeading
        icon={<Receipt className="size-5" />}
        title="الطلبات"
        description="متابعة طلبات المكتبة من لوحة الإدارة"
        actions={
          <div className="flex gap-2">
            {(['active', 'all'] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={
                  filter === id
                    ? 'admin-btn-primary !py-2'
                    : 'admin-btn-ghost'
                }
              >
                {id === 'active' ? 'نشطة' : 'الكل'}
              </button>
            ))}
          </div>
        }
      />

      {error ? (
        <div className="admin-card mb-4 px-4 py-3 text-sm text-[var(--admin-danger)]">{error}</div>
      ) : null}

      <div className="admin-card overflow-hidden">
        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--admin-text-muted)]">جاري التحميل…</p>
        ) : orders.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--admin-text-muted)]">
            لا توجد طلبات في هذا التصفية
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--admin-bg-elevated)] text-[var(--admin-text-muted)]">
              <tr>
                <th className="px-4 py-3 text-start font-medium">الطلب</th>
                <th className="px-4 py-3 text-start font-medium">العميل</th>
                <th className="px-4 py-3 text-start font-medium">الهاتف</th>
                <th className="px-4 py-3 text-start font-medium">الحالة</th>
                <th className="px-4 py-3 text-start font-medium">المبلغ</th>
                <th className="px-4 py-3 text-start font-medium">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-[var(--admin-border)]">
                  <td className="px-4 py-3 font-medium" dir="ltr">
                    {orderLabel(o)}
                  </td>
                  <td className="px-4 py-3">{o.customer_name || '—'}</td>
                  <td className="unicode-bidi-isolate px-4 py-3" dir="ltr">
                    {o.customer_phone || '—'}
                  </td>
                  <td className="px-4 py-3">{orderStatusAr(o.status)}</td>
                  <td className="px-4 py-3 tabular-nums">{o.total_display || '—'}</td>
                  <td className="px-4 py-3 text-[var(--admin-text-muted)]" dir="ltr">
                    {new Date(o.created_at).toLocaleString('ar-OM')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
