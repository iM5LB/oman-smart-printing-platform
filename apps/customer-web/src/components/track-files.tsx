'use client';

import { useState } from 'react';
import {
  COLOR_MODE_AR,
  PAPER_SIZE_AR,
  PRINT_SIDES_AR,
} from '@omsp/types';
import {
  FilePreviewDialog,
  PreviewButton,
  canPreviewFile,
} from '@/components/file-preview-dialog';

export type TrackFileItem = {
  filename: string;
  copies: number;
  color_mode?: string;
  paper_size?: string;
  sides?: string;
  mime_type?: string | null;
  file_url?: string | null;
};

export function TrackFiles({ items }: { items: TrackFileItem[] }) {
  const [preview, setPreview] = useState<{
    open: boolean;
    index: number;
  }>({ open: false, index: 0 });

  if (!items.length) return null;

  const current = items[preview.index];
  const canPreview = current
    ? Boolean(current.file_url) && canPreviewFile(current.filename, current.mime_type ?? undefined)
    : false;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-text-muted">الملفات</p>
      {items.map((item, i) => {
        const previewable =
          Boolean(item.file_url) && canPreviewFile(item.filename, item.mime_type ?? undefined);
        return (
          <div
            key={`${item.filename}-${i}`}
            className="card flex items-start gap-3 space-y-0 p-3 text-sm"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate font-medium">{item.filename}</p>
              <p className="text-xs text-text-muted">
                {[
                  `${item.copies} نسخة`,
                  item.paper_size ? (PAPER_SIZE_AR[item.paper_size] ?? item.paper_size) : null,
                  item.color_mode ? (COLOR_MODE_AR[item.color_mode] ?? item.color_mode) : null,
                  item.sides ? (PRINT_SIDES_AR[item.sides] ?? item.sides) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            {previewable ? (
              <PreviewButton onClick={() => setPreview({ open: true, index: i })} />
            ) : null}
          </div>
        );
      })}

      <FilePreviewDialog
        open={preview.open}
        onClose={() => setPreview((p) => ({ ...p, open: false }))}
        title={current?.filename ?? 'معاينة الملف'}
        src={canPreview ? (current?.file_url ?? null) : null}
        mime={current?.mime_type ?? undefined}
        footer={
          items.length > 1 ? (
            <div className="me-auto flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                className="btn-outline !px-2.5 !py-1.5 text-xs"
                disabled={preview.index <= 0}
                onClick={() => setPreview((p) => ({ ...p, index: Math.max(0, p.index - 1) }))}
              >
                السابق
              </button>
              <span className="shrink-0 text-xs text-text-muted tabular-nums">
                {preview.index + 1} / {items.length}
              </span>
              <button
                type="button"
                className="btn-outline !px-2.5 !py-1.5 text-xs"
                disabled={preview.index >= items.length - 1}
                onClick={() =>
                  setPreview((p) => ({
                    ...p,
                    index: Math.min(items.length - 1, p.index + 1),
                  }))
                }
              >
                التالي
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-outline"
              onClick={() => setPreview((p) => ({ ...p, open: false }))}
            >
              إغلاق
            </button>
          )
        }
      />
    </div>
  );
}
