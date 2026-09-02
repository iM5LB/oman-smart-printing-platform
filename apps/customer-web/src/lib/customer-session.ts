const TOKEN_KEY = 'omsp_customer_token';
const PHONE_KEY = 'omsp_customer_phone';

export function getCustomerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getCustomerPhone(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PHONE_KEY);
}

export function setCustomerSession(token: string, phone: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PHONE_KEY, phone);
}

export function clearCustomerSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PHONE_KEY);
}

export function isLoggedIn(): boolean {
  return !!getCustomerToken();
}
