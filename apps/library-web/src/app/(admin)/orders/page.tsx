'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchOrders, LibraryOrder } from '@/lib/api';

export default function OrdersPage() {
  const [orders, setOrders] = useState<LibraryOrder[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await fetchOrders('active');
      setOrders(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التحميل');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="animate-fade-in-up space-y-4">
      <h1 className="text-xl font-semibold">الطلبات</h1>
      {error && <div className="card px-4 py-3 text-sm text-danger">{error}</div>}
      <div className="card overflow-hidden">
        {orders.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-text-muted">لا طلبات نشطة</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated text-text-muted">
              <tr>
                <th className="px-4 py-3 text-start font-medium">الطلب</th>
                <th className="px-4 py-3 text-start font-medium">العميل</th>
                <th className="px-4 py-3 text-start font-medium">الحالة</th>
                <th className="px-4 py-3 text-start font-medium">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border-default">
                  <td className="px-4 py-3 font-medium" dir="ltr">
                    #{o.order_number || o.id.slice(0, 6)}
                  </td>
                  <td className="px-4 py-3">{o.customer_name || '—'}</td>
                  <td className="px-4 py-3">{o.status}</td>
                  <td className="px-4 py-3">{o.total_display || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
