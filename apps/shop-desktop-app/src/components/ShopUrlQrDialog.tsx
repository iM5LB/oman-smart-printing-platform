import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { formatCleanUrl } from "../lib/api";
import { Button } from "./ui";

export function ShopUrlQrDialog({
  url,
  storeName,
  open,
  onClose,
}: {
  url: string;
  storeName?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !url) {
      setDataUrl(null);
      setError(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(url, {
      width: 240,
      margin: 2,
      color: { dark: "#0b0f19", light: "#ffffff" },
    })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) setError("تعذر إنشاء رمز QR");
      });
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-qr-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border-default bg-bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="shop-qr-title" className="text-title">
          رابط العملاء
        </h2>
        {storeName ? (
          <p className="mt-1 text-meta text-text-muted">{storeName}</p>
        ) : null}
        <div className="mt-4 flex justify-center rounded-xl bg-white p-4">
          {dataUrl ? (
            <img src={dataUrl} alt="QR code" className="size-[240px]" />
          ) : (
            <div className="flex size-[240px] items-center justify-center text-meta text-text-muted">
              {error ?? "…"}
            </div>
          )}
        </div>
        <p
          className="mt-3 break-all text-center text-meta text-info"
          dir="ltr"
        >
          {formatCleanUrl(url)}
        </p>
        <p className="mt-1 text-center text-caption text-text-muted">
          امسح الرمز لفتح صفحة المكتبة
        </p>
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}
