import { useEffect, type ReactNode } from "react";
import { Button } from "./ui";
import { Icons } from "./icons";

function isImage(nameOrType: string): boolean {
  return /\.(jpe?g|png|webp|gif)$/i.test(nameOrType) || nameOrType.startsWith("image/");
}

function isPdf(nameOrType: string): boolean {
  return /\.pdf$/i.test(nameOrType) || nameOrType === "application/pdf";
}

export function canPreviewFile(name: string, mime?: string | null): boolean {
  const key = mime || name;
  return isPdf(key) || isImage(key);
}

export function FilePreviewDialog({
  open,
  onClose,
  title,
  src,
  mime,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  src: string | null;
  mime?: string | null;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    // Browser PDF "Print" opens the system print dialog; Escape / focus return
    // must not dismiss our modal.
    let ignoreDismissUntil = 0;
    const bumpIgnore = (ms: number) => {
      ignoreDismissUntil = Math.max(ignoreDismissUntil, Date.now() + ms);
    };

    const onBeforePrint = () => bumpIgnore(5000);
    const onAfterPrint = () => bumpIgnore(800);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (Date.now() < ignoreDismissUntil) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      onClose();
    };

    // Some WebViews fire a click on the host when the print UI closes.
    const onPointerDown = (e: PointerEvent) => {
      if (Date.now() < ignoreDismissUntil) {
        e.stopPropagation();
      }
    };

    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, onClose]);

  if (!open) return null;

  const previewable = src ? canPreviewFile(title, mime) : false;
  const pdf = previewable && isPdf(mime || title);
  const image = previewable && isImage(mime || title);

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="file-preview-title"
      // PDF preview: only close via X / footer — backdrop clicks fight the
      // built-in viewer Print toolbar and system print dialog.
      onClick={pdf ? undefined : onClose}
    >
      <div
        className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border-default px-3 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-bg-elevated text-text-secondary">
            {Icons.eye({ size: 16 })}
          </div>
          <h2
            id="file-preview-title"
            className="min-w-0 flex-1 truncate text-body font-semibold text-text-primary"
            title={title}
          >
            {title}
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 text-text-muted hover:bg-bg-elevated hover:text-text-primary"
            onClick={onClose}
            aria-label="إغلاق"
          >
            {Icons.x({ size: 18 })}
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-bg-elevated/50">
          {!src ? (
            <div className="flex h-full items-center justify-center p-6">
              <p className="text-center text-meta text-text-muted">لا يوجد ملف للمعاينة</p>
            </div>
          ) : pdf ? (
            <iframe
              title={title}
              src={src}
              className="absolute inset-0 h-full w-full border-0 bg-white"
            />
          ) : image ? (
            <div className="flex h-full items-center justify-center overflow-auto p-3">
              <img
                src={src}
                alt={title}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-bg-elevated text-text-muted">
                {Icons.file({ size: 22 })}
              </div>
              <p className="text-body font-medium text-text-primary">تعذر عرض المعاينة</p>
              <p className="max-w-sm text-meta text-text-muted">
                المعاينة المباشرة متاحة لملفات PDF والصور فقط.
              </p>
            </div>
          )}
        </div>

        {footer ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border-default px-3 py-2.5">
            {footer}
          </div>
        ) : (
          <div className="flex shrink-0 justify-end border-t border-border-default px-3 py-2.5">
            <Button type="button" variant="secondary" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
