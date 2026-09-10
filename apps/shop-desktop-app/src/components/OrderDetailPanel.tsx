import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { ShopOrder } from "../lib/api";
import { listPrinters } from "../lib/print";
import { Badge, Button, EmptyState } from "./ui";
import { Icons } from "./icons";
import { FilePreviewDialog } from "./FilePreviewDialog";
import {
  colorModeAr,
  isPaymentPaid,
  orderStatusAr,
  orderStatusTone,
  paymentMethodAr,
  paymentStatusAr,
  sidesAr,
} from "../lib/labels";

export type ShopOrderItem = {
  filename?: string;
  page_count?: number;
  copies?: number;
  color_mode?: string;
  paper_size?: string;
  sides?: string;
  orientation?: string;
  page_range?: string;
  mime_type?: string | null;
  finishing?: string | string[] | null;
  file_url?: string | null;
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

function orientationAr(value?: string) {
  switch (value) {
    case "portrait":
      return "عمودي";
    case "landscape":
      return "أفقي";
    case "auto":
    default:
      return "تلقائي";
  }
}

type PrimaryAction =
  | { kind: "print"; label: string }
  | { kind: "retry"; label: string }
  | { kind: "ready"; label: string }
  | { kind: "handover"; label: string; unpaid: boolean }
  | null;

function resolvePrimaryAction(order: ShopOrder): {
  action: PrimaryAction;
  hint: string | null;
} {
  const status = order.status;
  const paid = isPaymentPaid(order.payment_status);

  if (status === "ready") {
    return {
      action: {
        kind: "handover",
        unpaid: !paid,
        label: paid ? "تسليم" : "دفع وتسليم",
      },
      hint: null,
    };
  }

  if (status === "awaiting_finishing") {
    return {
      action: { kind: "ready", label: "جاهز" },
      hint: null,
    };
  }

  if (status === "needs_review" || status === "failed") {
    return {
      action: { kind: "retry", label: "إعادة" },
      hint: null,
    };
  }

  if (status === "printing" || status === "queued") {
    // Keep Print available — orders stick here when no Windows printer is installed.
    return {
      action: { kind: "print", label: "طباعة" },
      hint: null,
    };
  }

  if (["submitted", "paid", "review_pending"].includes(status)) {
    return {
      action: { kind: "print", label: "طباعة" },
      hint: null,
    };
  }

  if (!["collected", "completed", "cancelled"].includes(status)) {
    return {
      action: { kind: "print", label: "طباعة" },
      hint: null,
    };
  }

  return { action: null, hint: null };
}

type PreviewMode = "view" | "print" | "retry";

export function OrderDetailPanel({
  order,
  storeName,
  busy,
  message,
  onPrint,
  onRetry,
  onReady,
  onHandover,
}: {
  order: ShopOrder | null;
  storeName?: string;
  busy?: boolean;
  message?: string | null;
  onPrint: () => void;
  onRetry: () => void;
  onReady: () => void;
  /** Pay cash if unpaid, then mark collected. */
  onHandover: () => void;
}) {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<{
    open: boolean;
    index: number;
    mode: PreviewMode;
  }>({ open: false, index: 0, mode: "view" });
  const [printerCount, setPrinterCount] = useState<number | null>(null);

  useEffect(() => {
    if (!order) {
      setPrinterCount(null);
      setPreview({ open: false, index: 0, mode: "view" });
      return;
    }
    setPreview({ open: false, index: 0, mode: "view" });
    let cancelled = false;
    void listPrinters()
      .then((list) => {
        if (!cancelled) setPrinterCount(list.length);
      })
      .catch(() => {
        if (!cancelled) setPrinterCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [order?.id]);

  if (!order) {
    return (
      <EmptyState
        title="اختر طلباً"
        detail={`من جدول ${storeName ?? "المكتبة"}`}
      />
    );
  }

  const items = (order.items as ShopOrderItem[] | undefined) ?? [];
  const paid = isPaymentPaid(order.payment_status);
  const { action, hint } = resolvePrimaryAction(order);
  const previewItem = items[preview.index];
  const previewSrc = previewItem?.file_url ?? null;
  const noPrinter = printerCount === 0;

  const openPreview = (index: number, mode: PreviewMode = "view") => {
    setPreview({ open: true, index: Math.max(0, Math.min(index, items.length - 1)), mode });
  };

  const closePreview = () => setPreview((p) => ({ ...p, open: false }));

  const printBlocked = Boolean(
    noPrinter && action && (action.kind === "print" || action.kind === "retry"),
  );

  const runPrimary = () => {
    if (!action) return;
    if (action.kind === "print" || action.kind === "retry") {
      if (noPrinter) {
        navigate("/printers");
        return;
      }
      const firstWithFile = items.findIndex((it) => Boolean(it.file_url));
      openPreview(firstWithFile >= 0 ? firstWithFile : 0, action.kind);
      return;
    }
    if (action.kind === "ready") onReady();
    else onHandover();
  };

  const confirmPrintAction = () => {
    const mode = preview.mode;
    closePreview();
    if (mode === "retry") onRetry();
    else if (mode === "print") onPrint();
  };

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

          {order.notes ? (
            <DetailRow icon={Icons.orders({ size: 15 })} label="ملاحظات">
              <span className="text-end text-text-primary">{order.notes}</span>
            </DetailRow>
          ) : null}
        </div>

        {items.length === 0 ? (
          <p className="mt-3 text-meta text-text-muted">لا توجد ملفات في هذا الطلب</p>
        ) : (
          items.map((item, idx) => {
            const finishing = Array.isArray(item.finishing)
              ? item.finishing.join("، ")
              : item.finishing || null;
            return (
              <div key={`${item.filename ?? "item"}-${idx}`} className="mt-3">
                <p className="mb-1 text-section">
                  {items.length > 1 ? `ملف ${idx + 1}` : "تفاصيل الطلب"}
                </p>
                <div className="divide-y divide-border-default/70">
                  <DetailRow icon={Icons.file({ size: 15 })} label="اسم الملف">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate" dir="ltr" title={item.filename}>
                        {item.filename || "—"}
                      </span>
                      {item.file_url ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="shrink-0 !px-2 !py-1 text-meta"
                          disabled={busy}
                          onClick={() => openPreview(idx, "view")}
                          title="معاينة"
                        >
                          {Icons.eye({ size: 14 })}
                          معاينة
                        </Button>
                      ) : null}
                    </div>
                  </DetailRow>
                  <DetailRow icon={Icons.pages({ size: 15 })} label="عدد الصفحات">
                    <span>
                      {item.page_count != null ? `${item.page_count} صفحة` : "—"}
                    </span>
                  </DetailRow>
                  <DetailRow icon={Icons.copies({ size: 15 })} label="عدد النسخ">
                    <span>{item.copies ?? 1}</span>
                  </DetailRow>
                  <DetailRow icon={Icons.color({ size: 15 })} label="اللون">
                    <span>{colorModeAr(item.color_mode)}</span>
                  </DetailRow>
                  <DetailRow icon={Icons.pages({ size: 15 })} label="حجم الورق">
                    <span dir="ltr">{item.paper_size || "A4"}</span>
                  </DetailRow>
                  <DetailRow icon={Icons.duplex({ size: 15 })} label="الطباعة على الوجهين">
                    <span>
                      {item.sides && !["single", "simplex"].includes(item.sides)
                        ? "نعم"
                        : "لا"}
                      {item.sides ? ` (${sidesAr(item.sides)})` : ""}
                    </span>
                  </DetailRow>
                  <DetailRow icon={Icons.pages({ size: 15 })} label="الاتجاه">
                    <span>{orientationAr(item.orientation)}</span>
                  </DetailRow>
                  {item.page_range && item.page_range !== "all" ? (
                    <DetailRow icon={Icons.pages({ size: 15 })} label="نطاق الصفحات">
                      <span dir="ltr">{item.page_range}</span>
                    </DetailRow>
                  ) : null}
                  {finishing ? (
                    <DetailRow icon={Icons.staple({ size: 15 })} label="خدمات إضافية">
                      <span>{finishing}</span>
                    </DetailRow>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 border-t border-border-default bg-bg-surface p-3">
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-elevated px-3.5 py-3">
          <p className="text-body text-text-secondary">السعر الإجمالي</p>
          <p className="text-display tabular-nums text-primary">{money(order)}</p>
        </div>

        {message ? (
          <p className="mb-2 text-center text-meta text-text-muted">{message}</p>
        ) : null}

        {action ? (
          <Button
            type="button"
            className={`w-full gap-2 py-3 ${
              action.kind === "handover" && !action.unpaid
                ? "!bg-success hover:!bg-success/90"
                : ""
            }`}
            variant={printBlocked ? "secondary" : action.kind === "retry" ? "secondary" : "primary"}
            disabled={busy}
            onClick={runPrimary}
          >
            {printBlocked
              ? Icons.printer({ size: 16 })
              : action.kind === "print" || action.kind === "retry"
                ? Icons.printer({ size: 16 })
                : action.kind === "ready"
                  ? Icons.checkCircle({ size: 16 })
                  : Icons.package({ size: 16 })}
            {busy
              ? "..."
              : printBlocked
                ? "لا توجد طابعة — فتح الطابعات"
                : action.kind === "print" || action.kind === "retry"
                  ? `معاينة ثم ${action.label}`
                  : action.label}
          </Button>
        ) : hint ? (
          <p className="py-2 text-center text-meta text-text-muted">{hint}</p>
        ) : null}
      </div>

      <FilePreviewDialog
        open={preview.open}
        onClose={() => !busy && closePreview()}
        title={previewItem?.filename || "معاينة الملف"}
        src={previewSrc}
        mime={previewItem?.mime_type}
        footer={
          preview.mode === "view" ? (
            <>
              {items.length > 1 ? (
                <div className="me-auto flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-2.5 !py-1.5"
                    disabled={preview.index <= 0}
                    onClick={() => setPreview((p) => ({ ...p, index: p.index - 1 }))}
                  >
                    السابق
                  </Button>
                  <span className="shrink-0 text-meta text-text-muted tabular-nums">
                    {preview.index + 1} / {items.length}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-2.5 !py-1.5"
                    disabled={preview.index >= items.length - 1}
                    onClick={() => setPreview((p) => ({ ...p, index: p.index + 1 }))}
                  >
                    التالي
                  </Button>
                </div>
              ) : null}
              <Button type="button" variant="secondary" onClick={closePreview}>
                إغلاق
              </Button>
            </>
          ) : (
            <>
              {items.length > 1 ? (
                <div className="me-auto flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-2.5 !py-1.5"
                    disabled={preview.index <= 0 || busy}
                    onClick={() => setPreview((p) => ({ ...p, index: p.index - 1 }))}
                  >
                    السابق
                  </Button>
                  <span className="shrink-0 text-meta text-text-muted tabular-nums">
                    {preview.index + 1} / {items.length}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-2.5 !py-1.5"
                    disabled={preview.index >= items.length - 1 || busy}
                    onClick={() => setPreview((p) => ({ ...p, index: p.index + 1 }))}
                  >
                    التالي
                  </Button>
                </div>
              ) : null}
              <Button type="button" variant="secondary" disabled={busy} onClick={closePreview}>
                إلغاء
              </Button>
              <Button
                type="button"
                variant="primary"
                className="gap-2"
                disabled={busy}
                onClick={confirmPrintAction}
              >
                {Icons.printer({ size: 16 })}
                {busy
                  ? "..."
                  : preview.mode === "retry"
                    ? "تأكيد الإعادة"
                    : "تأكيد الطباعة"}
              </Button>
            </>
          )
        }
      />
    </div>
  );
}
