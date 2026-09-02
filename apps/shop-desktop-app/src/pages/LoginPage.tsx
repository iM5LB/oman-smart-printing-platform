import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { getApiBase, setApiBase, shopApi } from "../lib/api";
import { Button, Input, Panel } from "../components/ui";

export function LoginPage() {
  const { token, login, loading, error } = useAuth();
  const [deviceToken, setDeviceToken] = useState(
    "dev-al-noor-device-token-change-in-production",
  );
  const [apiBase, setApiBaseInput] = useState(() => getApiBase());
  const [localError, setLocalError] = useState<string | null>(null);

  if (token) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setApiBase(apiBase);
    try {
      await login(deviceToken);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "فشل الدخول");
    }
  };

  return (
    <div className="relative flex h-[100dvh] items-center justify-center overflow-hidden bg-bg-base px-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(59,130,246,0.22), transparent 60%), linear-gradient(180deg, #0f1419 0%, #121820 100%)",
        }}
      />
      <Panel className="relative w-full max-w-md animate-fade-up p-6 shadow-none">
        <p className="text-meta text-text-muted">تطبيق المكتبة</p>
        <h1 className="mt-1 text-display font-semibold tracking-tight">
          عمان للطباعة الذكية
        </h1>
        <p className="mt-2 text-body text-text-secondary">
          سجّل الدخول برمز الجهاز المرتبط بالمكتبة للاتصال بالطابعات والطلبات.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1.5">
            <span className="text-meta text-text-muted">رمز الجهاز</span>
            <Input
              dir="ltr"
              value={deviceToken}
              onChange={(e) => setDeviceToken(e.target.value)}
              placeholder="device token"
              autoFocus
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-meta text-text-muted">عنوان الـ API</span>
            <Input
              dir="ltr"
              value={apiBase}
              onChange={(e) => setApiBaseInput(e.target.value)}
              placeholder="http://localhost:4000"
            />
          </label>
          <p className="text-meta text-text-muted" dir="ltr">
            Active: {shopApi.apiUrl}
          </p>
          {(localError || error) && (
            <p className="text-meta text-danger">{localError || error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "جاري الاتصال..." : "دخول"}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
