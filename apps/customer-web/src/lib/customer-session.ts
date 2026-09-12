const TOKEN_KEY = 'omsp_customer_token';
const PHONE_KEY = 'omsp_customer_phone';
const ADMIN_KEY = 'omsp_platform_admin';

export function getCustomerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getCustomerPhone(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PHONE_KEY);
}

export function isPlatformAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ADMIN_KEY) === '1';
}

export function setCustomerSession(
  token: string,
  phone: string,
  opts?: { is_platform_admin?: boolean },
) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PHONE_KEY, phone);
  if (opts?.is_platform_admin) localStorage.setItem(ADMIN_KEY, '1');
  else localStorage.removeItem(ADMIN_KEY);
}

export function clearCustomerSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PHONE_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getCustomerToken();
}
