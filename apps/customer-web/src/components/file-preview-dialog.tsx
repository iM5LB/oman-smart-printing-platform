'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, FileText, X } from 'lucide-react';

function isImage(nameOrType: string): boolean {
  return /\.(jpe?g|png|webp|gif)$/i.test(nameOrType) || nameOrType.startsWith('image/');
}

function isPdf(nameOrType: string): boolean {
  return /\.pdf$/i.test(nameOrType) || nameOrType === 'application/pdf';
}

export function canPreviewFile(name: string, mime?: string): boolean {
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
  /** Blob URL or remote URL */
  src: string | null;
  mime?: string;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    // Built-in PDF viewer Print opens the system dialog; Escape after cancel
    // must not close this modal.
    let ignoreDismissUntil = 0;
    const bumpIgnore = (ms: number) => {
      ignoreDismissUntil = Math.max(ignoreDismissUntil, Date.now() + ms);
    };

    const onBeforePrint = () => bumpIgnore(5000);
    const onAfterPrint = () => bumpIgnore(800);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (Date.now() < ignoreDismissUntil) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      onClose();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (Date.now() < ignoreDismissUntil) {
        e.stopPropagation();
      }
    };

    window.addEventListener('beforeprint', onBeforePrint);
    window.addEventListener('afterprint', onAfterPrint);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint);
      window.removeEventListener('afterprint', onAfterPrint);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
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
      onClick={pdf ? undefined : onClose}
    >
      <div
        className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <Eye className="size-4" />
          </div>
          <h2
            id="file-preview-title"
            className="min-w-0 flex-1 truncate text-sm font-bold sm:text-base"
            title={title}
          >
            {title}
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-bg-elevated/40">
          {!src ? (
            <div className="flex h-full items-center justify-center p-6">
              <p className="text-center text-sm text-text-muted">لا يوجد ملف للمعاينة</p>
            </div>
          ) : pdf ? (
            <iframe
              title={title}
              src={src}
              className="absolute inset-0 h-full w-full border-0 bg-white"
            />
          ) : image ? (
            <div className="flex h-full items-center justify-center overflow-auto p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={title}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-accent text-text-muted">
                <FileText className="size-6" />
              </div>
              <p className="text-sm font-semibold">تعذر عرض المعاينة</p>
              <p className="max-w-sm text-xs text-text-muted">
                المعاينة المباشرة متاحة لملفات PDF والصور فقط.
              </p>
            </div>
          )}
        </div>

        {footer ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-3 py-2.5">
            {footer}
          </div>
        ) : (
          <div className="flex shrink-0 justify-end border-t border-border px-3 py-2.5">
            <button type="button" className="btn-outline" onClick={onClose}>
              إغلاق
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Hook: stable object URL for a File, revoked on change/unmount. */
export function useObjectUrl(file: File | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return url;
}

export function PreviewButton({
  onClick,
  label = 'معاينة',
  className = '',
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-accent ${className}`}
    >
      <Eye className="size-3.5" />
      {label}
    </button>
  );
}

export function usePreviewState() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    src: string | null;
    mime?: string;
  }>({ open: false, title: '', src: null });

  const openPreview = useMemo(
    () => (opts: { title: string; src: string | null; mime?: string }) => {
      setState({ open: true, ...opts });
    },
    [],
  );

  const closePreview = () => setState((s) => ({ ...s, open: false }));

  return { ...state, openPreview, closePreview };
}
