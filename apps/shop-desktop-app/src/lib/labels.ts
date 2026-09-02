/** Arabic labels for API enum / status strings */

const ORDER_STATUS_AR: Record<string, string> = {
  draft: "مسودة",
  submitted: "مُرسل",
  payment_pending: "بانتظار الدفع",
  paid: "مدفوع",
  review_pending: "بانتظار المراجعة",
  queued: "في الطابور",
  preparing: "قيد التجهيز",
  printing: "قيد الطباعة",
  awaiting_finishing: "بانتظار التجهيز النهائي",
  ready: "جاهز للاستلام",
  collected: "تم التسليم",
  completed: "مكتمل",
  cancelled: "ملغى",
  failed: "فشل",
  needs_review: "يحتاج مراجعة",
};

const PAYMENT_STATUS_AR: Record<string, string> = {
  unpaid: "غير مدفوع",
  pending: "قيد الانتظار",
  processing: "قيد المعالجة",
  completed: "مدفوع",
  paid: "مدفوع",
  succeeded: "مدفوع",
  failed: "فشل الدفع",
  cancelled: "ملغى",
  refunded: "مسترد",
};

const PAYMENT_METHOD_AR: Record<string, string> = {
  pay_at_pickup: "دفع عند الاستلام",
  online: "دفع إلكتروني",
  cash: "نقداً",
  card_pos: "بطاقة نقطة بيع",
  card: "بطاقة",
  bank_muscat: "بطاقة بنك مسقط",
};

const PRINTER_STATUS_AR: Record<string, string> = {
  online: "متصلة",
  offline: "غير متصلة",
  error: "خطأ",
  busy: "مشغولة",
  paused: "موقوفة",
};

const COLOR_MODE_AR: Record<string, string> = {
  bw: "أبيض وأسود",
  color: "ملون",
  grayscale: "رمادي",
};

const SIDES_AR: Record<string, string> = {
  single: "وجه واحد",
  simplex: "وجه واحد",
  duplex: "وجهين",
  duplex_long: "وجهين (طويل)",
  duplex_short: "وجهين (قصير)",
};

function lookup(map: Record<string, string>, value: string | null | undefined, fallback = "—") {
  if (!value) return fallback;
  return map[value] ?? map[value.toLowerCase()] ?? value;
}

export function orderStatusAr(status: string | null | undefined) {
  return lookup(ORDER_STATUS_AR, status);
}

export function paymentStatusAr(status: string | null | undefined) {
  return lookup(PAYMENT_STATUS_AR, status);
}

export function paymentMethodAr(method: string | null | undefined) {
  return lookup(PAYMENT_METHOD_AR, method);
}

export function printerStatusAr(status: string | null | undefined) {
  return lookup(PRINTER_STATUS_AR, status);
}

export function colorModeAr(mode: string | null | undefined) {
  return lookup(COLOR_MODE_AR, mode);
}

export function sidesAr(sides: string | null | undefined) {
  return lookup(SIDES_AR, sides);
}

export function isPaymentPaid(status: string | null | undefined) {
  return status === "paid" || status === "completed" || status === "succeeded";
}

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export function orderStatusTone(status: string | null | undefined): BadgeTone {
  switch (status) {
    case "ready":
    case "collected":
    case "completed":
    case "paid":
      return "success";
    case "printing":
    case "queued":
    case "preparing":
    case "submitted":
      return "info";
    case "review_pending":
    case "needs_review":
    case "payment_pending":
    case "awaiting_finishing":
    case "draft":
      return "warning";
    case "cancelled":
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

export function paymentStatusTone(status: string | null | undefined): BadgeTone {
  if (isPaymentPaid(status)) return "success";
  if (status === "pending" || status === "processing" || status === "unpaid") return "warning";
  if (status === "failed" || status === "cancelled") return "danger";
  return "neutral";
}

export function printerStatusTone(status: string | null | undefined): BadgeTone {
  if (status === "online") return "success";
  if (status === "busy" || status === "paused") return "warning";
  if (status === "offline" || status === "error") return "danger";
  return "neutral";
}

const DEVICE_STATUS_AR: Record<string, string> = {
  connected: "متصل",
  disconnected: "غير متصل",
  revoked: "ملغى",
};

const PICKUP_POLICY_AR: Record<string, string> = {
  require_approval: "يتطلب موافقة",
  auto_print: "طباعة تلقائية",
  print_on_arrival: "طباعة عند الوصول",
  hold_until_paid: "إيقاف حتى الدفع",
};

const FILE_RETENTION_AR: Record<string, string> = {
  immediate: "فوري",
  one_hour: "ساعة واحدة",
  twenty_four_hours: "24 ساعة",
  three_days: "3 أيام",
  seven_days: "7 أيام",
  forty_eight_hours: "48 ساعة",
  thirty_days: "30 يوماً",
  until_collected: "حتى الاستلام",
};

const QUEUE_PRIORITY_AR: Record<string, string> = {
  normal: "عادي",
  high: "مرتفع",
  urgent: "عاجل",
  low: "منخفض",
};

const OMAN_WEEKDAYS = [
  "السبت",
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
];

export function deviceStatusAr(status: string | null | undefined) {
  return lookup(DEVICE_STATUS_AR, status);
}

export function pickupPolicyAr(policy: string | null | undefined) {
  return lookup(PICKUP_POLICY_AR, policy);
}

export function fileRetentionAr(policy: string | null | undefined) {
  return lookup(FILE_RETENTION_AR, policy);
}

export function queuePriorityAr(priority: string | null | undefined) {
  return lookup(QUEUE_PRIORITY_AR, priority);
}

export function omanWeekdayAr(dayOfWeek: number | null | undefined) {
  if (dayOfWeek == null || dayOfWeek < 0 || dayOfWeek > 6) return "—";
  return OMAN_WEEKDAYS[dayOfWeek] ?? "—";
}
