const TOKEN_KEY = 'omsp_library_token';

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
