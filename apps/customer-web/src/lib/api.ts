/** Production API — used when env is unset outside local development. */
export const PRODUCTION_API_BASE = 'https://omsp-api.onrender.com';

function normalizeApiBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Public API origin (no trailing slash).
 * Defaults to Render production. Set NEXT_PUBLIC_API_URL=http://localhost:4000 for a local API.
 */
export function getApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv) return normalizeApiBase(fromEnv);
  return PRODUCTION_API_BASE;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBase()}/api/v1${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'خطأ في الاتصال' }));
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export interface UploadedFile {
  file_key: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  page_count: number;
}

export async function createUploadSession(
  storeSlug: string,
): Promise<{ upload_token: string; expires_in_seconds: number }> {
  return apiFetch(`/stores/${storeSlug}/uploads/session`, { method: 'POST' });
}

export async function uploadFile(storeSlug: string, file: File): Promise<UploadedFile> {
  let bearer: string | null = null;
  if (typeof window !== 'undefined') {
    bearer = localStorage.getItem('omsp_customer_token');
  }
  if (!bearer) {
    const session = await createUploadSession(storeSlug);
    bearer = session.upload_token;
  }

  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${getApiBase()}/api/v1/stores/${storeSlug}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearer}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'فشل رفع الملف' }));
    throw new Error(err.message ?? 'فشل رفع الملف');
  }
  return res.json();
}

export interface OrderConfig {
  pricing: Array<{ paper_size: string; color_mode: string; price_per_page_baisa: number }>;
  finishing_services: Array<{ id: string; name_ar: string; price_baisa: number }>;
}

export interface OrderItemInput {
  file_key: string;
  original_filename: string;
  page_count: number;
  mime_type?: string;
  file_size_bytes?: number;
  color_mode: 'bw' | 'color';
  paper_size: 'A4' | 'A3';
  sides: 'single' | 'duplex_long';
  copies: number;
  page_range?: string;
  finishing_service_ids?: string[];
}

export interface CreateOrderResponse {
  order_id: string;
  order_number: string;
  tracking_token: string;
  status: string;
  payment_status: string;
  total_display: string;
  requires_payment: boolean;
  payment_url?: string;
  mock_confirm_url?: string;
}

export async function getOrderConfig(storeSlug: string): Promise<OrderConfig> {
  return apiFetch(`/stores/${storeSlug}/config`);
}

export async function quoteOrder(storeSlug: string, items: OrderItemInput[]): Promise<QuoteResult> {
  return apiFetch(`/stores/${storeSlug}/orders/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
}

export interface QuoteResult {
  items: Array<{ label: string; amount_baisa: number }>;
  subtotal_baisa: number;
  tax_baisa: number;
  total_baisa: number;
  total_display: string;
}

export async function createOrder(
  storeSlug: string,
  data: {
    customer_name?: string;
    customer_phone: string;
    customer_notes?: string;
    payment_method: 'pay_at_pickup' | 'online';
    items: OrderItemInput[];
  },
): Promise<CreateOrderResponse> {
  return apiFetch(`/stores/${storeSlug}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function confirmMockPayment(paymentId: string) {
  return apiFetch(`/payments/${paymentId}/confirm-mock`, { method: 'POST' });
}

export async function trackOrder(token: string) {
  return apiFetch(`/orders/track/${token}`);
}

export async function requestOtp(phone: string) {
  return apiFetch<{
    ok: true;
    phone: string;
    expires_in_seconds: number;
    message: string;
    dev_code?: string;
  }>('/auth/otp/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string) {
  return apiFetch<{ token: string; phone: string; expires_at: string }>('/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
}

export async function logoutCustomer(token: string) {
  return apiFetch<{ ok: true }>('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export interface MyOrder {
  order_number: string;
  status: string;
  payment_status: string;
  total_display: string;
  tracking_token: string;
  created_at: string;
  items_count: number;
  files: string[];
}

export async function fetchMyOrders(storeSlug: string, token: string) {
  return apiFetch<{
    phone: string;
    store_slug: string;
    store_name: string;
    orders: MyOrder[];
  }>(`/stores/${storeSlug}/my-orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
