'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  completeOnboarding,
  fetchMe,
  MeResponse,
  setDeviceSecurity,
  updateStore,
} from '@/lib/api';
import { clearLibraryToken, getLibraryToken } from '@/lib/session';

type Step = 'profile' | 'location' | 'device' | 'review';

const STEPS: { id: Step; title: string; sub: string }[] = [
  { id: 'profile', title: 'بيانات المكتبة', sub: 'الاسم ورقم التواصل' },
  { id: 'location', title: 'الموقع', sub: 'المحافظة والعنوان على الخريطة' },
  { id: 'device', title: 'أمان الجهاز', sub: 'كلمة المرور ورقم تأكيد الربط' },
  { id: 'review', title: 'مراجعة', sub: 'تأكيد وإنهاء الإعداد' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [step, setStep] = useState<Step>('profile');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getLibraryToken()) {
      router.replace('/login');
      return;
    }
    fetchMe()
      .then((data) => {
        if (data.onboarding_complete) {
          router.replace('/dashboard');
          return;
        }
        setMe(data);
        const next = data.onboarding.next_step;
        if (next === 'location' || next === 'device' || next === 'review' || next === 'profile') {
          setStep(next as Step);
        }
      })
      .catch(() => {
        clearLibraryToken();
        router.replace('/login');
      });
  }, [router]);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    try {
      const res = await updateStore({
        name: String(fd.get('name')),
        phone: String(fd.get('phone') || ''),
      });
      setMe((prev) => (prev ? { ...prev, store: res.store, onboarding: res.onboarding } : prev));
      setStep('location');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  }

  async function saveLocation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const lat = String(fd.get('latitude') || '').trim();
    const lng = String(fd.get('longitude') || '').trim();
    try {
      const res = await updateStore({
        governorate: String(fd.get('governorate')),
        wilayat: String(fd.get('wilayat')),
        area: String(fd.get('area') || ''),
        address: String(fd.get('address')),
        latitude: lat ? Number(lat) : null,
        longitude: lng ? Number(lng) : null,
      });
      setMe((prev) => (prev ? { ...prev, store: res.store, onboarding: res.onboarding } : prev));
      setStep('device');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  }

  async function saveDevice(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const pass = String(fd.get('device_password'));
    const confirm = String(fd.get('device_password_confirm'));
    if (pass !== confirm) {
      setError('كلمتا مرور الجهاز غير متطابقتين');
      setLoading(false);
      return;
    }
    try {
      const res = await setDeviceSecurity(pass, String(fd.get('device_confirm_phone')));
      setMe((prev) => (prev ? { ...prev, store: res.store, onboarding: res.onboarding } : prev));
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  }

  async function finish() {
    setLoading(true);
    setError('');
    try {
      await completeOnboarding();
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر الإنهاء');
    } finally {
      setLoading(false);
    }
  }

  if (!me) {
    return (
      <div className="shell flex min-h-dvh items-center justify-center text-sm text-text-muted">
        جاري التحميل…
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="shell min-h-dvh px-4 py-8">
      <div className="mx-auto w-full max-w-2xl animate-fade-in-up">
        <header className="mb-8">
          <p className="text-xs font-semibold text-gold">إعداد المكتبة</p>
          <h1 className="mt-1 text-2xl font-bold text-primary">{me.store.name}</h1>
          <p className="mt-1 text-sm text-text-muted">
            هذه الخطوات للمكتبة فقط. تطبيق سطح المكتب أداة تشغيل بعد الربط.
          </p>
        </header>

        <ol className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              className={`rounded-xl border px-3 py-2 text-sm ${
                i === stepIndex
                  ? 'border-primary bg-accent text-primary'
                  : i < stepIndex
                    ? 'border-primary/30 bg-surface text-primary'
                    : 'border-border bg-surface text-text-muted'
              }`}
            >
              <span className="block font-semibold">{s.title}</span>
              <span className="text-xs opacity-80">{s.sub}</span>
            </li>
          ))}
        </ol>

        <div className="card p-6">
          {step === 'profile' && (
            <form onSubmit={saveProfile} className="space-y-3">
              <h2 className="text-lg font-bold">بيانات المكتبة</h2>
              <div>
                <label className="label" htmlFor="name">
                  اسم المكتبة
                </label>
                <input
                  id="name"
                  name="name"
                  className="input-field"
                  required
                  defaultValue={me.store.name}
                />
              </div>
              <div>
                <label className="label" htmlFor="phone">
                  هاتف التواصل
                </label>
                <input
                  id="phone"
                  name="phone"
                  className="input-field"
                  dir="ltr"
                  defaultValue={me.store.phone ?? ''}
                  placeholder="+9689xxxxxxx"
                />
              </div>
              <p className="text-xs text-text-muted">
                رابط العملاء: /{me.store.slug}
              </p>
              {error && <p className="text-sm text-error">{error}</p>}
              <button type="submit" className="btn-primary" disabled={loading}>
                حفظ ومتابعة
              </button>
            </form>
          )}

          {step === 'location' && (
            <form onSubmit={saveLocation} className="space-y-3">
              <h2 className="text-lg font-bold">موقع المكتبة</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="governorate">
                    المحافظة
                  </label>
                  <input
                    id="governorate"
                    name="governorate"
                    className="input-field"
                    required
                    defaultValue={me.store.governorate ?? ''}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="wilayat">
                    الولاية
                  </label>
                  <input
                    id="wilayat"
                    name="wilayat"
                    className="input-field"
                    required
                    defaultValue={me.store.wilayat ?? ''}
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="area">
                  المنطقة
                </label>
                <input
                  id="area"
                  name="area"
                  className="input-field"
                  defaultValue={me.store.area ?? ''}
                />
              </div>
              <div>
                <label className="label" htmlFor="address">
                  العنوان التفصيلي
                </label>
                <input
                  id="address"
                  name="address"
                  className="input-field"
                  required
                  defaultValue={me.store.address ?? ''}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="latitude">
                    خط العرض (اختياري)
                  </label>
                  <input
                    id="latitude"
                    name="latitude"
                    className="input-field"
                    dir="ltr"
                    defaultValue={me.store.latitude ?? ''}
                    placeholder="23.5888"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="longitude">
                    خط الطول (اختياري)
                  </label>
                  <input
                    id="longitude"
                    name="longitude"
                    className="input-field"
                    dir="ltr"
                    defaultValue={me.store.longitude ?? ''}
                    placeholder="58.4078"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost" onClick={() => setStep('profile')}>
                  رجوع
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  حفظ ومتابعة
                </button>
              </div>
            </form>
          )}

          {step === 'device' && (
            <form onSubmit={saveDevice} className="space-y-3">
              <h2 className="text-lg font-bold">أمان ربط الجهاز</h2>
              <p className="text-sm text-text-muted">
                عند تشغيل تطبيق سطح المكتب: يدخل الموظف كلمة مرور الجهاز، فيُرسل رمز تأكيد إلى
                هذا الرقم. التطبيق أداة تشغيل فقط — لا يُعدّ الإعداد من داخله.
              </p>
              <div>
                <label className="label" htmlFor="device_password">
                  كلمة مرور الجهاز
                </label>
                <input
                  id="device_password"
                  name="device_password"
                  type="password"
                  className="input-field"
                  required
                  minLength={6}
                  dir="ltr"
                  placeholder="••••••"
                />
              </div>
              <div>
                <label className="label" htmlFor="device_password_confirm">
                  تأكيد كلمة المرور
                </label>
                <input
                  id="device_password_confirm"
                  name="device_password_confirm"
                  type="password"
                  className="input-field"
                  required
                  minLength={6}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="label" htmlFor="device_confirm_phone">
                  رقم استلام رمز التأكيد عند الربط
                </label>
                <input
                  id="device_confirm_phone"
                  name="device_confirm_phone"
                  className="input-field"
                  required
                  dir="ltr"
                  defaultValue={me.store.device_confirm_phone ?? me.store.phone ?? ''}
                  placeholder="+9689xxxxxxx"
                />
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost" onClick={() => setStep('location')}>
                  رجوع
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  حفظ ومتابعة
                </button>
              </div>
            </form>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">مراجعة الإعداد</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4 border-b border-border py-2">
                  <dt className="text-text-muted">المكتبة</dt>
                  <dd className="font-semibold">{me.store.name}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border py-2">
                  <dt className="text-text-muted">المعرّف</dt>
                  <dd className="font-mono" dir="ltr">
                    {me.store.slug}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border py-2">
                  <dt className="text-text-muted">الموقع</dt>
                  <dd className="text-left font-semibold">
                    {[me.store.governorate, me.store.wilayat, me.store.address]
                      .filter(Boolean)
                      .join(' · ')}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-border py-2">
                  <dt className="text-text-muted">كلمة مرور الجهاز</dt>
                  <dd>{me.store.has_device_password ? 'مضبوطة' : 'غير مضبوطة'}</dd>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-text-muted">رقم التأكيد</dt>
                  <dd dir="ltr">{me.store.device_confirm_phone}</dd>
                </div>
              </dl>
              {error && <p className="text-sm text-error">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost" onClick={() => setStep('device')}>
                  رجوع
                </button>
                <button type="button" className="btn-primary" disabled={loading} onClick={finish}>
                  إنهاء الإعداد والانتقال للوحة التحكم
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
