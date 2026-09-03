import type { ReactNode } from "react";
import type { ShopOrder } from "../lib/api";
import { Badge, Button, EmptyState } from "./ui";
import { Icons } from "./icons";
import {
  colorModeAr,
  isPaymentPaid,
  orderStatusAr,
  orderStatusTone,
  paymentMethodAr,
  paymentStatusAr,
  sidesAr,
} from "../lib/labels";

type OrderItem = {
  filename?: string;
  page_count?: number;
  copies?: number;
  color_mode?: string;
  paper_size?: string;
  sides?: string;
  finishing?: string | string[] | null;
};

function orderLabel(o: ShopOrder) {
  const raw = o.order_number || o.display_number || o.id.slice(0, 8);
  return raw.startsWith("#") ? raw : `#${raw.replace(/^#/, "")}`;
}

function money(o: ShopOrder) {
  if (o.total_display) return o.total_display;
  const baisa = o.total_baisa ?? o.total;
  if (typeof baisa === "number") return `${(baisa / 1000).toFixed(3)} ر.ع`;
  return "—";
}

function formatOrderTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString("ar-OM", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (sameDay) return `اليوم ${time}`;
  return `${d.toLocaleDateString("ar-OM")} ${time}`;
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex shrink-0 items-center gap-2 text-body text-text-secondary">
        <span className="text-text-secondary">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="flex min-w-0 items-center justify-end gap-2 text-body font-medium text-text-primary">
        {children}
      </div>
    </div>
  );
}

export function OrderDetailPanel({
  order,
  storeName,
  busy,
  message,
  onPrint,
  onRetry,
  onReady,
  onCollected,
}: {
  order: ShopOrder | null;
  storeName?: string;
  busy?: boolean;
  message?: string | null;
  onPrint: () => void;
  onRetry: () => void;
  onReady: () => void;
  onCollected: () => void;
}) {
  if (!order) {
    return (
      <EmptyState
        title="اختر طلباً"
        detail={`من جدول ${storeName ?? "المكتبة"}`}
      />
    );
  }

  const item = ((order.items as OrderItem[]) ?? [])[0];
  const paid = isPaymentPaid(order.payment_status);
  const finishing = Array.isArray(item?.finishing)
    ? item.finishing.join("، ")
    : item?.finishing || null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-default px-4 py-3">
        <p className="text-section text-text-primary">تفاصيل الطلب</p>
        <p className="text-title text-text-primary" dir="ltr">
          {orderLabel(order)}
        </p>
      </div>

      <div className="scroll-y min-h-0 flex-1 px-4 py-2.5">
        <div className="mb-2.5 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-elevated text-text-secondary">
            {Icons.user({ size: 18 })}
          </div>
          <div className="min-w-0">
            <p className="text-body text-text-secondary">اسم العميل</p>
            <p className="text-section font-semibold">
              {order.customer_name || "—"}
            </p>
          </div>
        </div>

        <div className="divide-y divide-border-default/80 border-y border-border-default/80">
          <DetailRow icon={Icons.phone({ size: 15 })} label="الهاتف">
            <a
              href={order.customer_phone ? `tel:${order.customer_phone}` : undefined}
              className="unicode-bidi-isolate truncate text-primary"
              dir="ltr"
            >
              {order.customer_phone || "—"}
            </a>
          </DetailRow>

          <DetailRow icon={Icons.file({ size: 15 })} label="حالة الطلب">
            <Badge tone={orderStatusTone(order.status)}>
              {orderStatusAr(order.status)}
            </Badge>
          </DetailRow>

          <DetailRow icon={Icons.checkCircle({ size: 15 })} label="حالة الدفع">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-meta font-medium ${
                paid
                  ? "border-success/30 bg-success/15 text-success"
                  : "border-warning/30 bg-warning/15 text-warning"
              }`}
            >
              {paid ? Icons.check({ size: 12 }) : null}
              {paymentStatusAr(order.payment_status)}
            </span>
          </DetailRow>

          <DetailRow icon={Icons.payments({ size: 15 })} label="طريقة الدفع">
            <span className="text-text-secondary">
              {paymentMethodAr(order.payment_method)}
            </span>
          </DetailRow>

          <DetailRow icon={Icons.clock({ size: 15 })} label="وقت الطلب">
            <span className="text-text-secondary">
              {formatOrderTime(order.created_at)}
            </span>
          </DetailRow>
        </div>

        <p className="mb-1 mt-3 text-section">تفاصيل الطلب</p>
        <div className="divide-y divide-border-default/70">
          <DetailRow icon={Icons.file({ size: 15 })} label="اسم الملف">
            <span className="truncate" dir="ltr" title={item?.filename}>
              {item?.filename || "—"}
            </span>
          </DetailRow>
          <DetailRow icon={Icons.pages({ size: 15 })} label="عدد الصفحات">
            <span>
              {item?.page_count != null ? `${item.page_count} صفحة` : "—"}
            </span>
          </DetailRow>
          <DetailRow icon={Icons.copies({ size: 15 })} label="عدد النسخ">
            <span>{item?.copies ?? 1}</span>
          </DetailRow>
          <DetailRow icon={Icons.color({ size: 15 })} label="اللون">
            <span>{colorModeAr(item?.color_mode)}</span>
          </DetailRow>
          <DetailRow icon={Icons.pages({ size: 15 })} label="حجم الورق">
            <span dir="ltr">{item?.paper_size || "A4"}</span>
          </DetailRow>
          <DetailRow icon={Icons.duplex({ size: 15 })} label="الطباعة على الوجهين">
            <span>
              {item?.sides && !["single", "simplex"].includes(item.sides)
                ? "نعم"
                : "لا"}
              {item?.sides ? ` (${sidesAr(item.sides)})` : ""}
            </span>
          </DetailRow>
          {finishing ? (
            <DetailRow icon={Icons.staple({ size: 15 })} label="خدمة إضافية">
              <span>{finishing}</span>
            </DetailRow>
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-elevated px-3.5 py-2.5">
          <p className="text-body text-text-secondary">السعر الإجمالي</p>
          <p className="text-display tabular-nums text-primary">{money(order)}</p>
        </div>

        {message ? (
          <p className="mt-2 text-center text-meta text-text-muted">{message}</p>
        ) : null}
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border-default p-3">
        <Button
          className="gap-2 py-2.5"
          type="button"
          disabled={busy}
          onClick={onPrint}
        >
          {Icons.printer({ size: 15 })}
          طباعة
        </Button>
        <Button
          className="gap-2 py-2.5"
          variant="secondary"
          type="button"
          disabled={busy}
          onClick={onRetry}
        >
          {Icons.refresh({ size: 15 })}
          إعادة
        </Button>
        <button
          type="button"
          disabled={busy}
          onClick={onReady}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-success/90 px-3.5 py-2.5 text-body font-medium text-white transition-colors hover:bg-success disabled:opacity-45"
        >
          {Icons.checkCircle({ size: 15 })}
          جاهز
        </button>
        <Button
          className="gap-2 py-2.5"
          variant="secondary"
          type="button"
          disabled={busy}
          onClick={onCollected}
        >
          {Icons.package({ size: 15 })}
          تسليم
        </Button>
      </div>
    </div>
  );
}
