import { getApiBase } from './api';
import { getLibraryToken } from './library-session';

async function libraryFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getLibraryToken();
  const headers = new Headers(options?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options?.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

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
  logo_url: string | null;
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

export interface LibraryMe {
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

export async function unlockLibrarySetup(password: string) {
  return libraryFetch<{ setup_token: string; expires_in_seconds: number; message: string }>(
    '/library/setup/unlock',
    { method: 'POST', body: JSON.stringify({ password }) },
  );
}

export async function registerLibrary(data: {
  setup_token: string;
  email: string;
  password: string;
  owner_name: string;
  store_name: string;
  store_slug?: string;
  phone?: string;
}) {
  return libraryFetch<{
    token: string;
    store: LibraryStore;
    onboarding_complete: boolean;
  }>('/library/auth/register', { method: 'POST', body: JSON.stringify(data) });
}

export async function loginLibrary(email: string, password: string) {
  return libraryFetch<{
    token: string;
    store: LibraryStore;
    onboarding_complete: boolean;
  }>('/library/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export async function fetchLibraryMe() {
  return libraryFetch<LibraryMe>('/library/me');
}

export async function updateLibraryStore(
  data: Partial<{
    name: string;
    phone: string;
    governorate: string;
    wilayat: string;
    area: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
  }>,
) {
  return libraryFetch<{ store: LibraryStore; onboarding: OnboardingStatus }>('/library/store', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function uploadLibraryLogo(file: File) {
  const form = new FormData();
  form.append('logo', file);
  return libraryFetch<{ store: LibraryStore; logo_url: string }>('/library/store/logo', {
    method: 'POST',
    body: form,
  });
}

export async function setLibraryDeviceSecurity(device_password: string, device_confirm_phone: string) {
  return libraryFetch<{ store: LibraryStore; onboarding: OnboardingStatus }>(
    '/library/store/device-security',
    {
      method: 'PUT',
      body: JSON.stringify({ device_password, device_confirm_phone }),
    },
  );
}

export async function completeLibraryOnboarding() {
  return libraryFetch<{ ok: true; store: LibraryStore; onboarding_complete: boolean }>(
    '/library/onboarding/complete',
    { method: 'POST' },
  );
}

export async function listLibraryDevices() {
  return libraryFetch<{ devices: DeviceRow[] }>('/library/devices');
}

export async function createLibraryDevice(name: string) {
  return libraryFetch<{ device: DeviceRow; device_token: string; message: string }>(
    '/library/devices',
    { method: 'POST', body: JSON.stringify({ name }) },
  );
}

export async function revokeLibraryDevice(id: string) {
  return libraryFetch<{ ok: true }>(`/library/devices/${id}/revoke`, { method: 'POST' });
}

export async function rotateLibraryDevice(id: string) {
  return libraryFetch<{ device_token: string; message: string }>(
    `/library/devices/${id}/rotate`,
    { method: 'POST' },
  );
}

export async function logoutLibrary() {
  try {
    await libraryFetch('/library/auth/logout', { method: 'POST' });
  } catch {
    /* ignore */
  }
}
