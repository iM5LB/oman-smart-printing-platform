import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { shopApi } from "../lib/api";
import { toUserMessage } from "../lib/errors";
import { Button, Input, Panel } from "../components/ui";
import { TibaaBrandMark } from "../components/TibaaBrandMark";

type Step = "credentials" | "otp";

export function LoginPage() {
  const { token, login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("credentials");
  const [storeSlug, setStoreSlug] = useState("");
  const [devicePassword, setDevicePassword] = useState("");
  const [deviceName, setDeviceName] = useState("جهاز الكاونتر");
  const [otp, setOtp] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [phoneHint, setPhoneHint] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const showError = localError || error;

  const onRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setBusy(true);
    try {
      const slug = storeSlug.trim().toLowerCase();
      if (!slug) {
        setLocalError("أدخل معرّف المكتبة");
        return;
      }
      if (devicePassword.trim().length < 6) {
        setLocalError("كلمة مرور الجهاز يجب أن تكون 6 أحرف على الأقل");
        return;
      }
      const res = await shopApi.pairStart({
        store_slug: slug,
        device_password: devicePassword,
        device_name: deviceName.trim() || "جهاز الكاونتر",
      });
      setChallengeId(res.challenge_id);
      setPhoneHint(res.phone_hint);
      setDevCode(res.dev_code ?? null);
      if (res.dev_code) setOtp(res.dev_code);
      setStep("otp");
    } catch (err) {
      setLocalError(toUserMessage(err, "تعذر إرسال رمز التأكيد. حاول مجدداً."));
    } finally {
      setBusy(false);
    }
  };

  const onConfirmOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!challengeId) {
      setLocalError("أعد طلب الرمز أولاً");
      return;
    }
    if (otp.trim().length < 4) {
      setLocalError("أدخل رمز التأكيد كاملاً");
      return;
    }
    setBusy(true);
    try {
      const res = await shopApi.pairConfirm({
        challenge_id: challengeId,
        code: otp.trim(),
      });
      await login(res.device_token);
      navigate("/", { replace: true });
    } catch (err) {
      setLocalError(toUserMessage(err, "تعذر تسجيل الدخول. تحقق من الرمز وحاول مجدداً."));
    } finally {
      setBusy(false);
    }
  };

  const backToCredentials = () => {
    setStep("credentials");
    setChallengeId(null);
    setOtp("");
    setDevCode(null);
    setLocalError(null);
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
        <TibaaBrandMark size="lg" stacked showTagline />
        <p className="mt-4 text-body text-text-secondary">
          {step === "credentials" ? (
            "أدخل معرّف المكتبة وكلمة مرور الجهاز. سيُرسل رمز تأكيد إلى رقم المكتبة المسجّل."
          ) : (
            <>
              أدخل الرمز المرسل إلى{" "}
              <span className="unicode-bidi-isolate font-medium" dir="ltr">
                {phoneHint ?? "رقم المكتبة"}
              </span>
              .
            </>
          )}
        </p>

        {step === "credentials" ? (
          <form className="mt-6 space-y-4" onSubmit={onRequestOtp}>
            <label className="block space-y-1.5">
              <span className="text-meta text-text-muted">معرّف المكتبة</span>
              <Input
                dir="ltr"
                value={storeSlug}
                onChange={(e) => setStoreSlug(e.target.value)}
                placeholder="مثال: al-noor"
                autoFocus
                autoComplete="organization"
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-meta text-text-muted">كلمة مرور الجهاز</span>
              <Input
                dir="ltr"
                type="password"
                value={devicePassword}
                onChange={(e) => setDevicePassword(e.target.value)}
                placeholder="من إعداد المكتبة على الموقع"
                autoComplete="current-password"
                required
                minLength={6}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-meta text-text-muted">اسم هذا الجهاز</span>
              <Input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="جهاز الكاونتر"
              />
            </label>
            {showError ? <p className="text-meta text-danger">{showError}</p> : null}
            <Button type="submit" className="w-full" disabled={busy || loading}>
              {busy ? "جاري الإرسال…" : "إرسال رمز التأكيد"}
            </Button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={onConfirmOtp}>
            <label className="block space-y-1.5">
              <span className="text-meta text-text-muted">رمز التأكيد</span>
              <Input
                dir="ltr"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                autoFocus
                required
                minLength={4}
                maxLength={6}
              />
            </label>
            {devCode ? (
              <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-meta text-warning">
                وضع تجريبي — الرمز: <span dir="ltr">{devCode}</span>
              </p>
            ) : null}
            {showError ? <p className="text-meta text-danger">{showError}</p> : null}
            <Button type="submit" className="w-full" disabled={busy || loading}>
              {busy || loading ? "جاري الدخول…" : "تأكيد ودخول"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={busy || loading}
              onClick={backToCredentials}
            >
              رجوع
            </Button>
          </form>
        )}
      </Panel>
    </div>
  );
}
