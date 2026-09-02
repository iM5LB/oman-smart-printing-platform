import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { shopApi, type ShopMe } from "./api";

const TOKEN_KEY = "omsp.deviceToken";

type AuthState = {
  token: string | null;
  me: ShopMe | null;
  loading: boolean;
  error: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [me, setMe] = useState<ShopMe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMe = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      setMe(null);
      return;
    }
    const profile = await shopApi.me(t);
    setMe(profile);
  }, []);

  const login = useCallback(async (rawToken: string) => {
    const trimmed = rawToken.trim();
    if (!trimmed) throw new Error("أدخل رمز الجهاز");

    setLoading(true);
    setError(null);
    try {
      localStorage.setItem(TOKEN_KEY, trimmed);
      const profile = await shopApi.me(trimmed);
      setToken(trimmed);
      setMe(profile);
    } catch (e) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setMe(null);
      const message = e instanceof Error ? e.message : "فشل الاتصال";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setMe(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!token) return;
    void refreshMe().catch(() => {
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
    });
  }, [token, refreshMe]);

  const value = useMemo(
    () => ({ token, me, loading, error, login, logout, refreshMe }),
    [token, me, loading, error, login, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
