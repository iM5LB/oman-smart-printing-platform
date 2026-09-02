// Re-export Prisma enums and shared types for API + web clients

export type {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  ColorMode,
  PaperSize,
  PrintSides,
  Orientation,
  PrintJobStatus,
  QueuePriority,
  UserRole,
} from '@omsp/database';

/** Customer-facing order status labels in Arabic */
export const ORDER_STATUS_AR: Record<string, string> = {
  draft: 'مسودة',
  submitted: 'تم استلام الطلب',
  payment_pending: 'بانتظار الدفع',
  paid: 'تم الدفع',
  review_pending: 'قيد المراجعة',
  queued: 'بانتظار الطباعة',
  preparing: 'جاري التجهيز',
  printing: 'جاري الطباعة',
  awaiting_finishing: 'بانتظار التجهيز',
  ready: 'جاهز للاستلام',
  collected: 'تم الاستلام',
  completed: 'تم الاستلام',
  cancelled: 'تم الإلغاء',
  failed: 'تعذر تنفيذ الطلب',
  needs_review: 'يحتاج مراجعة',
};

export const PAYMENT_STATUS_AR: Record<string, string> = {
  unpaid: 'غير مدفوع',
  pending: 'بانتظار الدفع',
  processing: 'جاري معالجة الدفع',
  completed: 'مدفوع',
  failed: 'لم تكتمل عملية الدفع',
  cancelled: 'تم إلغاء الدفع',
  refunded: 'تم استرداد المبلغ',
};

export const COLOR_MODE_AR: Record<string, string> = {
  bw: 'أبيض وأسود',
  color: 'ألوان',
  grayscale: 'تدرج رمادي',
};

export const PAPER_SIZE_AR: Record<string, string> = {
  A4: 'A4',
  A3: 'A3',
  A5: 'A5',
};

export const PRINT_SIDES_AR: Record<string, string> = {
  single: 'وجه واحد',
  duplex_long: 'وجهين',
  duplex_short: 'وجهين',
};

export const ORIENTATION_AR: Record<string, string> = {
  auto: 'تلقائي',
  portrait: 'عمودي',
  landscape: 'أفقي',
};

/** Print settings sent to desktop for actual OS printing */
export interface PrintSettings {
  copies: number;
  color_mode: 'bw' | 'color' | 'grayscale';
  paper_size: 'A4' | 'A3' | 'A5';
  sides: 'single' | 'duplex_long' | 'duplex_short';
  orientation: 'auto' | 'portrait' | 'landscape';
  page_range: string;
}

/** API response for store public page */
export interface StorePublicInfo {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  phone: string | null;
  governorate: string | null;
  wilayat: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  is_open: boolean;
  opening_hours: Array<{
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
  }>;
}

/** Price breakdown for customer display */
export interface PriceBreakdown {
  items: Array<{
    label: string;
    amount_baisa: number;
  }>;
  subtotal_baisa: number;
  tax_baisa: number;
  total_baisa: number;
  total_display: string;
}

/** Allowed upload MIME types */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-powerpoint',
  'application/vnd.ms-excel',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_EXTENSIONS = [
  '.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls',
  '.jpg', '.jpeg', '.png', '.webp',
] as const;

/** Max file size default: 50MB */
export const DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
