import { getLibraryToken } from './session';

export const PRODUCTION_API_BASE = 'https://omsp-api.onrender.com';

function normalizeApiBase(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function getApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv) return normalizeApiBase(fromEnv);
  return PRODUCTION_API_BASE;
}

export function getCustomerShopBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_CUSTOMER_WEB_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  return 'https://omsp.onrender.com';
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getLibraryToken();
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type') && options?.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${getApiBase()}/api/v1${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'خطأ في الاتصال' }));
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export interface OnboardingStatus {
  profile_ready: boolean;
  location_ready: boolean;
  device_security_ready: boolean;
  completed: boolean;
  next_step: string;
}

export interface LibraryStore {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  governorate: string | null;
  wilayat: string | null;
  area: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  device_confirm_phone: string | null;
  has_device_password: boolean;
  onboarding_completed_at: string | null;
  customer_shop_path: string;
}

export interface MeResponse {
  user: { id: string; email: string; name: string; phone: string | null };
  role: string;
  store: LibraryStore;
  onboarding_complete: boolean;
  onboarding: OnboardingStatus;
}

export interface DeviceRow {
  id: string;
  name: string;
  status: string;
  last_connected_at: string | null;
  created_at: string;
}

export async function registerLibrary(data: {
  email: string;
  password: string;
  owner_name: string;
  store_name: string;
  store_slug?: string;
  phone?: string;
}) {
  return apiFetch<{
    token: string;
    store: LibraryStore;
    onboarding_complete: boolean;
  }>('/library/auth/register', { method: 'POST', body: JSON.stringify(data) });
}

export async function loginLibrary(email: string, password: string) {
  return apiFetch<{
    token: string;
    store: LibraryStore;
    onboarding_complete: boolean;
  }>('/library/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function fetchMe() {
  return apiFetch<MeResponse>('/library/me');
}

export async function updateStore(data: Partial<{
  name: string;
  phone: string;
  governorate: string;
  wilayat: string;
  area: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
}>) {
  return apiFetch<{ store: LibraryStore; onboarding: OnboardingStatus }>('/library/store', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function setDeviceSecurity(device_password: string, device_confirm_phone: string) {
  return apiFetch<{ store: LibraryStore; onboarding: OnboardingStatus }>(
    '/library/store/device-security',
    {
      method: 'PUT',
      body: JSON.stringify({ device_password, device_confirm_phone }),
    },
  );
}

export async function completeOnboarding() {
  return apiFetch<{ ok: true }>('/library/onboarding/complete', { method: 'POST' });
}

export async function listDevices() {
  return apiFetch<{ devices: DeviceRow[] }>('/library/devices');
}

export async function createDevice(name: string) {
  return apiFetch<{
    device: DeviceRow;
    device_token: string;
    message: string;
  }>('/library/devices', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function revokeDevice(id: string) {
  return apiFetch<{ ok: true }>(`/library/devices/${id}/revoke`, { method: 'POST' });
}

export async function rotateDevice(id: string) {
  return apiFetch<{ device_token: string; message: string }>(`/library/devices/${id}/rotate`, {
    method: 'POST',
  });
}

export async function logoutLibrary() {
  try {
    await apiFetch('/library/auth/logout', { method: 'POST' });
  } catch {
    /* ignore */
  }
}
