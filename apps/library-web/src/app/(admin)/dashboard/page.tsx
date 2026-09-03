'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchMe, fetchOrders, fetchStats, LibraryOrder, LibraryStats, listDevices, MeResponse } from '@/lib/api';

export default function DashboardHomePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [orders, setOrders] = useState<LibraryOrder[]>([]);
  const [devices, setDevices] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [m, s, o, d] = await Promise.all([
        fetchMe(),
        fetchStats(),
        fetchOrders('active'),
        listDevices(),
      ]);
      setMe(m);
      setStats(s);
      setOrders(Array.isArray(o) ? o.slice(0, 8) : []);
      setDevices(d.devices.filter((x) => x.status !== 'revoked').length);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر التحميل');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="animate-fade-in-up space-y-5">
      <div>
        <h1 className="text-xl font-semibold">نظرة عامة</h1>
        <p className="mt-1 text-sm text-text-muted">{me?.store.name ?? 'لوحة المكتبة'}</p>
      </div>

      {error && <div className="card px-4 py-3 text-sm text-danger">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-text-muted">طلبات اليوم</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{stats?.today_orders ?? '—'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted">إيراد اليوم</p>
          <p className="mt-1 text-2xl font-semibold">{stats?.today_revenue_display ?? '—'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted">قيد الطباعة</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{stats?.printing_count ?? '—'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted">أجهزة نشطة</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{devices}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
          <h2 className="font-semibold">طلبات نشطة</h2>
          <Link href="/orders" className="text-sm text-info hover:underline">
            الكل
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-text-muted">لا طلبات نشطة</p>
        ) : (
          <ul className="divide-y divide-border-default">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <span className="font-medium" dir="ltr">
                  #{o.order_number || o.id.slice(0, 6)}
                </span>
                <span>{o.customer_name || '—'}</span>
                <span className="text-text-muted">{o.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
