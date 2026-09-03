'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Home, MonitorSmartphone, Printer, Receipt } from 'lucide-react';
import {
  fetchLibraryMe,
  fetchLibraryOrders,
  fetchLibraryStats,
  LibraryMe,
  LibraryOrder,
  LibraryStats,
  listLibraryDevices,
} from '@/lib/library-api';
import { PageHeading } from '@/components/library-admin/page-heading';
import { orderLabel, orderStatusAr } from '@/lib/library-labels';

export default function LibraryDashboardHomePage() {
  const [me, setMe] = useState<LibraryMe | null>(null);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [orders, setOrders] = useState<LibraryOrder[]>([]);
  const [deviceCount, setDeviceCount] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [meData, statsData, ordersData, devicesData] = await Promise.all([
        fetchLibraryMe(),
        fetchLibraryStats(),
        fetchLibraryOrders('active'),
        listLibraryDevices(),
      ]);
      setMe(meData);
      setStats(statsData);
      setOrders(Array.isArray(ordersData) ? ordersData.slice(0, 8) : []);
      setDeviceCount(devicesData.devices.filter((d) => d.status !== 'revoked').length);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر التحميل');
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <div>
      <PageHeading
        icon={<Home className="size-5" />}
        title="نظرة عامة"
        description={me ? `مرحباً — ${me.store.name}` : 'لوحة إدارة المكتبة'}
        actions={
          me ? (
            <a href={me.store.customer_shop_path} className="admin-btn-ghost" target="_blank" rel="noreferrer">
              فتح متجر العملاء
            </a>
          ) : null
        }
      />

      {error ? (
        <div className="admin-card mb-4 px-4 py-3 text-sm text-[var(--admin-danger)]">{error}</div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="طلبات اليوم"
          value={stats?.today_orders ?? '—'}
          hint={
            stats
              ? `${stats.orders_delta_percent >= 0 ? '+' : ''}${stats.orders_delta_percent}% عن أمس`
              : undefined
          }
          icon={<Receipt className="size-5" />}
        />
        <StatTile
          label="إيراد اليوم"
          value={stats?.today_revenue_display ?? '—'}
          hint={stats ? `الأسبوع: ${stats.week_revenue_display}` : undefined}
          icon={<Printer className="size-5" />}
          tone="success"
        />
        <StatTile
          label="قيد الطباعة"
          value={stats?.printing_count ?? '—'}
          hint={stats ? `${stats.ready_count} جاهز للاستلام` : undefined}
          icon={<Printer className="size-5" />}
          tone="warning"
        />
        <StatTile
          label="الأجهزة النشطة"
          value={deviceCount}
          hint="كاونتر سطح المكتب"
          icon={<MonitorSmartphone className="size-5" />}
          tone="info"
        />
      </div>

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-4 py-3">
          <h2 className="font-semibold text-[var(--admin-text)]">طلبات نشطة</h2>
          <Link href="/library/orders" className="text-sm text-[var(--admin-info)] hover:underline">
            عرض الكل
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--admin-text-muted)]">
            لا طلبات نشطة حالياً
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--admin-bg-elevated)] text-[var(--admin-text-muted)]">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">الطلب</th>
                <th className="px-4 py-2.5 text-start font-medium">العميل</th>
                <th className="px-4 py-2.5 text-start font-medium">الحالة</th>
                <th className="px-4 py-2.5 text-start font-medium">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-[var(--admin-border)]">
                  <td className="px-4 py-3 font-medium" dir="ltr">
                    {orderLabel(o)}
                  </td>
                  <td className="px-4 py-3">{o.customer_name || '—'}</td>
                  <td className="px-4 py-3">{orderStatusAr(o.status)}</td>
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

function StatTile({
  label,
  value,
  hint,
  icon,
  tone = 'primary',
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'info';
}) {
  const tones = {
    primary: 'bg-[#3b82f6]/15 text-[#60a5fa]',
    success: 'bg-[#22c55e]/15 text-[#4ade80]',
    warning: 'bg-[#f59e0b]/15 text-[#fbbf24]',
    info: 'bg-[#38bdf8]/15 text-[#7dd3fc]',
  };
  return (
    <div className="admin-card px-3.5 py-3.5">
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-[var(--admin-text-muted)]">{label}</p>
          <p className="mt-1.5 text-[26px] font-semibold tabular-nums leading-8 text-[var(--admin-text)]">
            {value}
          </p>
          {hint ? <p className="mt-1.5 text-xs text-[var(--admin-text-muted)]">{hint}</p> : null}
        </div>
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
