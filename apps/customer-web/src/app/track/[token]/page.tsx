import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ORDER_STATUS_AR, PAYMENT_STATUS_AR } from '@omsp/types';
import { StatusTimeline } from '@/components/status-timeline';
import { TrackFiles, type TrackFileItem } from '@/components/track-files';
import { getApiBase } from '@/lib/api';

type TrackOrder = {
  order_number: string;
  status: string;
  payment_status: string;
  total_display: string;
  customer_name?: string;
  store_name: string;
  store_slug?: string;
  store_phone?: string | null;
  items: TrackFileItem[];
  created_at?: string;
};

async function getOrder(token: string): Promise<TrackOrder | null> {
  const apiUrl = getApiBase();
  try {
    const res = await fetch(`${apiUrl}/api/v1/orders/track/${token}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await getOrder(token);
  if (!order) notFound();

  const statusLabel = ORDER_STATUS_AR[order.status] ?? order.status;
  const paymentLabel = PAYMENT_STATUS_AR[order.payment_status] ?? order.payment_status;
  const homeHref = order.store_slug ? `/${order.store_slug}` : '/';

  return (
    <div className="page-shell">
      <div className="page-content animate-fade-in">
        <header className="track-page-head">
          <p className="track-page-kicker">تتبع الطلب</p>
          <h1 className="track-page-number">{order.order_number}</h1>
          <p className="track-page-status">{statusLabel}</p>
        </header>

        <StatusTimeline status={order.status} />

        <div className="track-page-body">
          <div className="card space-y-3 p-4">
            <p className="text-xs font-semibold text-text-muted">تفاصيل الطلب</p>
            <Row label="الحالة" value={statusLabel} />
            <Row label="الدفع" value={paymentLabel} />
            <Row label="الإجمالي" value={order.total_display} />
            <Row label="المكتبة" value={order.store_name} />
            {order.store_phone && (
              <Row label="هاتف المكتبة" value={order.store_phone} dir="ltr" />
            )}
            {order.created_at && (
              <Row
                label="تاريخ الطلب"
                value={new Date(order.created_at).toLocaleString('ar-OM')}
              />
            )}
          </div>

          {order.items?.length > 0 ? <TrackFiles items={order.items} /> : null}
        </div>

        <div className="fixed-bottom-cta">
          <Link href={homeHref} className="btn-primary btn-compact flex w-full items-center justify-center">
            العودة للصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <div className="summary-row">
      <span className="summary-row-muted">{label}</span>
      <span className={`font-semibold${dir === 'ltr' ? ' unicode-bidi-isolate' : ''}`} dir={dir}>
        {value}
      </span>
    </div>
  );
}
