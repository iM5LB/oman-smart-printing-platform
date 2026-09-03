const ORDER_STATUS_AR: Record<string, string> = {
  submitted: 'مُرسل',
  payment_pending: 'بانتظار الدفع',
  paid: 'مدفوع',
  review_pending: 'مراجعة',
  queued: 'في الطابور',
  preparing: 'تجهيز',
  printing: 'طباعة',
  awaiting_finishing: 'تجهيز نهائي',
  ready: 'جاهز',
  needs_review: 'يحتاج مراجعة',
  collected: 'مُستلم',
  cancelled: 'ملغى',
  failed: 'فشل',
};

export function orderStatusAr(status: string) {
  return ORDER_STATUS_AR[status] ?? status;
}

export function orderLabel(order: {
  order_number?: string;
  display_number?: string;
  id: string;
}) {
  const raw = order.order_number || order.display_number || order.id.slice(0, 8);
  return raw.startsWith('#') ? raw : `#${raw}`;
}
