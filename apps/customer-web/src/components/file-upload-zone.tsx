'use client';

import { useCallback, useId, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { CloudUpload, FileText, Trash2 } from 'lucide-react';
import { type SelectedFile, filesFromList, formatFileSize } from '@/lib/files';

const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp';

interface FileUploadZoneProps {
  files: SelectedFile[];
  onFilesChange: Dispatch<SetStateAction<SelectedFile[]>>;
  disabled?: boolean;
  compact?: boolean;
  showContinue?: boolean;
}

export function FileUploadZone({
  files,
  onFilesChange,
  disabled = false,
  compact = false,
  showContinue = true,
}: FileUploadZoneProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const dragCount = useRef(0);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const next = filesFromList(incoming);
      onFilesChange((prev) => {
        const merged = [...prev];
        for (const item of next) {
          if (!merged.some((f) => f.id === item.id)) merged.push(item);
        }
        return merged;
      });
    },
    [onFilesChange],
  );

  const removeFile = (id: string) => {
    onFilesChange((prev) => prev.filter((f) => f.id !== id));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCount.current = 0;
    setDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div className={`flex w-full min-h-0 flex-col ${compact ? 'gap-3' : 'gap-4'}`}>
      <input
        id={inputId}
        type="file"
        multiple
        accept={ACCEPT}
        disabled={disabled}
        className="file-input-hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <label
        htmlFor={disabled ? undefined : inputId}
        onDragEnter={(e) => { e.preventDefault(); if (!disabled) { dragCount.current += 1; setDragging(true); } }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          dragCount.current -= 1;
          if (dragCount.current <= 0) { dragCount.current = 0; setDragging(false); }
        }}
        onDrop={onDrop}
        className={[
          'group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-all',
          compact ? 'p-6' : 'p-8',
          dragging ? 'border-primary bg-accent scale-[1.01]' : 'border-primary/30 bg-accent/40 hover:border-primary/50 hover:bg-accent/60',
          disabled ? 'pointer-events-none opacity-50' : '',
        ].join(' ')}
      >
        <div className={`mb-3 flex items-center justify-center rounded-full bg-primary/10 ${compact ? 'size-14' : 'size-16'}`}>
          <CloudUpload className={`text-primary ${compact ? 'size-7' : 'size-8'}`} />
        </div>
        <p className="text-sm font-bold text-text">
          {dragging ? 'أفلت الملفات هنا' : 'اسحب ملفاتك هنا أو اضغط للاختيار من الجهاز'}
        </p>
        <p className="mt-1 text-xs text-text-muted">PDF · Word · PowerPoint · Excel · JPG · PNG</p>
      </label>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li
              key={f.id}
              className="file-item flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${f.error ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                <FileText className="size-5" />
              </div>
              <div className="min-w-0 flex-1 text-start">
                <p className="truncate text-sm font-semibold">{f.name}</p>
                <p className={`text-xs ${f.error ? 'text-error' : 'text-text-muted'}`}>
                  {f.error ?? formatFileSize(f.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(f.id)}
                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-error/10 hover:text-error"
                aria-label={`حذف ${f.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showContinue && files.filter((f) => !f.error).length > 0 && (
        <button type="button" className="btn-primary w-full" disabled>
          متابعة
        </button>
      )}
    </div>
  );
}
