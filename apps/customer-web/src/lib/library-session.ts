const TOKEN_KEY = 'omsp_library_token';
const SETUP_KEY = 'omsp_setup_token';

export function getLibraryToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setLibraryToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearLibraryToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getSetupToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SETUP_KEY);
}

export function setSetupToken(token: string) {
  localStorage.setItem(SETUP_KEY, token);
}

export function clearSetupToken() {
  localStorage.removeItem(SETUP_KEY);
}
