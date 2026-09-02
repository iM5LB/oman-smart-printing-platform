import { ALLOWED_EXTENSIONS, DEFAULT_MAX_FILE_SIZE_BYTES } from '@omsp/types';

export interface SelectedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  error?: string;
}

function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

export function validateFile(file: File): string | null {
  const ext = extensionOf(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return 'نوع الملف غير مدعوم. استخدم PDF أو Word أو صورة.';
  }
  if (file.size > DEFAULT_MAX_FILE_SIZE_BYTES) {
    return 'حجم الملف كبير جداً. الحد الأقصى 50 ميغابايت.';
  }
  if (file.size === 0) {
    return 'الملف فارغ.';
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}

export function filesFromList(list: FileList | File[]): SelectedFile[] {
  return Array.from(list).map((file) => {
    const error = validateFile(file);
    return {
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      error: error ?? undefined,
    };
  });
}
