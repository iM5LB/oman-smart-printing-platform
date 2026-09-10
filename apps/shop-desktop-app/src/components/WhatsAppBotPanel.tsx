import { useCallback, useEffect, useState } from "react";
import { otpBotApi, type OtpBotStatus } from "../lib/api";
import { Badge, Button, Input } from "./ui";

const SETUP_PW_KEY = "omsp.setupPassword";

export function WhatsAppBotPanel({ compact = false }: { compact?: boolean }) {
  const [password, setPassword] = useState(() => {
    try {
      return localStorage.getItem(SETUP_PW_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [unlocked, setUnlocked] = useState(false);
  const [status, setStatus] = useState<OtpBotStatus | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(
    async (setupPassword: string, forceQr = false) => {
      setBusy(true);
      setError(null);
      try {
        const st = await otpBotApi.status(setupPassword);
        setStatus(st);
        if (st.status === "ready") {
          setQrDataUrl(null);
        } else {
          const qr = await otpBotApi.qr(
            setupPassword,
            forceQr || st.status !== "qr",
          );
          setQrDataUrl(qr.qr_data_url);
          setStatus((prev) =>
            prev
              ? { ...prev, status: qr.status, detail: qr.detail }
              : prev,
          );
        }
        setUnlocked(true);
        try {
          localStorage.setItem(SETUP_PW_KEY, setupPassword);
        } catch {
          /* ignore */
        }
      } catch (err) {
        setUnlocked(false);
        setStatus(null);
        setQrDataUrl(null);
        setError(err instanceof Error ? err.message : "فشل الاتصال ببوت واتساب");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!unlocked || !password) return;
    if (status?.status === "ready") return;
    const id = window.setInterval(() => {
      void refresh(password, false);
    }, 8000);
    return () => window.clearInterval(id);
  }, [unlocked, password, status?.status, refresh]);

  const onUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const pw = password.trim();
    if (!pw) {
      setError("أدخل كلمة مرور الإعداد");
      return;
    }
    await refresh(pw, true);
  };

  const onLogoutBot = async () => {
    if (!password.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await otpBotApi.logout(password.trim());
      await refresh(password.trim(), true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل قطع الربط");
    } finally {
      setBusy(false);
    }
  };

  const tone =
    status?.status === "ready"
      ? "success"
      : status?.status === "qr" || status?.status === "connecting"
        ? "warning"
        : "neutral";

  const qrSize = compact ? "size-[140px]" : "size-[220px]";

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {!compact ? (
        <p className="shrink-0 text-meta text-text-secondary">
          اربط رقم واتساب لإرسال رموز OTP. واتساب → الإعدادات → الأجهزة المرتبطة →
          ربط جهاز.
        </p>
      ) : (
        <p className="shrink-0 text-caption text-text-muted">
          واتساب → الأجهزة المرتبطة → ربط جهاز
        </p>
      )}

      {!unlocked ? (
        <form className="space-y-2" onSubmit={(e) => void onUnlock(e)}>
          <label className="block space-y-1">
            <span className="text-caption text-text-muted">كلمة مرور الإعداد</span>
            <Input
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="LIBRARY_SETUP_PASSWORD"
              autoComplete="off"
              className="!py-2"
            />
          </label>
          {error ? <p className="text-meta text-danger">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "جاري التحقق…" : "فتح ربط واتساب"}
          </Button>
        </form>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Badge tone={tone}>
              {status?.status === "ready"
                ? "مرتبط"
                : status?.status === "qr"
                  ? "امسح الرمز"
                  : status?.status ?? "…"}
            </Badge>
            <span className="truncate text-caption text-text-muted">
              {status?.detail}
            </span>
          </div>

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5">
            {status?.status === "ready" ? (
              <p className="w-full rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-center text-meta text-success">
                البوت جاهز لإرسال OTP
                {status.connected_user ? (
                  <span className="mt-1 block opacity-80" dir="ltr">
                    {status.connected_user}
                  </span>
                ) : null}
              </p>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="WhatsApp QR"
                className={`${qrSize} max-h-full rounded-xl bg-white object-contain p-1.5`}
              />
            ) : (
              <p className="text-meta text-text-muted">جاري تجهيز رمز QR…</p>
            )}
          </div>

          {error ? <p className="shrink-0 text-meta text-danger">{error}</p> : null}

          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              className="!px-2.5 !py-1.5"
              onClick={() => void refresh(password.trim(), true)}
            >
              تحديث
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={busy || status?.status !== "ready"}
              className="!px-2.5 !py-1.5"
              onClick={() => void onLogoutBot()}
            >
              قطع الربط
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              className="!px-2.5 !py-1.5"
              onClick={() => {
                setUnlocked(false);
                setStatus(null);
                setQrDataUrl(null);
              }}
            >
              إغلاق
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
