'use client';

import dynamic from 'next/dynamic';
import { FormEvent, useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Check,
  ImagePlus,
  KeyRound,
  Lock,
  MapPin,
  MonitorSmartphone,
  Printer,
} from 'lucide-react';
import {
  completeLibraryOnboarding,
  fetchLibraryMe,
  LibraryMe,
  registerLibrary,
  setLibraryDeviceSecurity,
  unlockLibrarySetup,
  updateLibraryStore,
  uploadLibraryLogo,
} from '@/lib/library-api';
import {
  clearLibraryToken,
  clearSetupToken,
  getLibraryToken,
  getSetupToken,
  setLibraryToken,
  setSetupToken,
} from '@/lib/library-session';
import { slugifyBrand } from '@/lib/slugs';
import { cn } from '@/lib/utils';
import type { PickedLocation } from '@/components/location-picker-map';

const LocationPickerMap = dynamic(
  () => import('@/components/location-picker-map').then((m) => m.LocationPickerMap),
  {
    ssr: false,
    loading: () => <div className="setup-map setup-map-loading">جاري تحميل الخريطة…</div>,
  },
);

type Step = 'brand' | 'location' | 'device' | 'review';

const STEPS: { id: Step; label: string; num: number }[] = [
  { id: 'brand', label: 'الهوية', num: 1 },
  { id: 'location', label: 'الموقع', num: 2 },
  { id: 'device', label: 'الجهاز', num: 3 },
  { id: 'review', label: 'إنهاء', num: 4 },
];

function SetupProgress({ step }: { step: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.id === step);
  const progressPct = (currentIdx / (STEPS.length - 1)) * 100;

  return (
    <div className="step-track">
      <div className="step-track-inner" style={{ ['--step-count' as string]: STEPS.length }}>
        <div className="step-track-rail" aria-hidden>
          <div className="step-track-progress" style={{ width: `${progressPct}%` }} />
        </div>
        <ol className="step-track-list">
          {STEPS.map((s, i) => {
            const complete = currentIdx > i;
            const active = currentIdx === i;
            return (
              <li key={s.id} className="step-track-item">
                <div
                  className={cn(
                    'step-track-dot',
                    complete && 'step-track-dot-done',
                    active && 'step-track-dot-active',
                  )}
                >
                  {complete ? (
                    <Check className="size-3.5" strokeWidth={3} aria-hidden />
                  ) : (
                    <span>{s.num}</span>
                  )}
                </div>
                <span className={cn('step-track-label', (active || complete) && 'step-track-label-active')}>
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="setup-error" role="alert">
      {message}
    </p>
  );
}

export function LibraryOnboardingHome() {
  const router = useRouter();
  const logoInputId = useId();
  const [booting, setBooting] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [me, setMe] = useState<LibraryMe | null>(null);
  const [step, setStep] = useState<Step>('brand');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [brandName, setBrandName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [loc, setLoc] = useState({
    governorate: '',
    wilayat: '',
    area: '',
    address: '',
    latitude: '' as string,
    longitude: '' as string,
  });

  function applyPickedLocation(picked: PickedLocation) {
    setLoc((prev) => ({
      governorate: picked.governorate || prev.governorate,
      wilayat: picked.wilayat || prev.wilayat,
      area: picked.area || prev.area,
      address: picked.address || prev.address,
      latitude: String(picked.latitude),
      longitude: String(picked.longitude),
    }));
  }

  useEffect(() => {
    const ownerToken = getLibraryToken();
    if (ownerToken) {
      fetchLibraryMe()
        .then((data) => {
          if (data.onboarding_complete) {
            router.replace(data.store.customer_shop_path);
            return;
          }
          setMe(data);
          setUnlocked(true);
          setBrandName(data.store.name);
          setSlug(data.store.slug);
          setLogoPreview(data.store.logo_url);
          setLoc({
            governorate: data.store.governorate ?? '',
            wilayat: data.store.wilayat ?? '',
            area: data.store.area ?? '',
            address: data.store.address ?? '',
            latitude: data.store.latitude != null ? String(data.store.latitude) : '',
            longitude: data.store.longitude != null ? String(data.store.longitude) : '',
          });
          const next = data.onboarding.next_step;
          if (next === 'location') setStep('location');
          else if (next === 'device') setStep('device');
          else if (next === 'review') setStep('review');
          else setStep('brand');
          setBooting(false);
        })
        .catch(() => {
          clearLibraryToken();
          setUnlocked(!!getSetupToken());
          setBooting(false);
        });
      return;
    }

    setUnlocked(!!getSetupToken());
    setBooting(false);
  }, [router]);

  async function onUnlock(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await unlockLibrarySetup(String(fd.get('setup_password')));
      setSetupToken(res.setup_token);
      setUnlocked(true);
      setStep('brand');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  }

  async function saveBrand(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const storeName = String(fd.get('name')).trim();
    const slugHint = String(fd.get('store_slug') || '').trim() || slugifyBrand(storeName);
    const logo = fd.get('logo');

    try {
      if (!me) {
        const setupToken = getSetupToken();
        if (!setupToken) {
          setUnlocked(false);
          throw new Error('انتهت جلسة الإعداد. أدخل كلمة مرور الإعداد مجدداً');
        }
        const res = await registerLibrary({
          setup_token: setupToken,
          store_name: storeName,
          store_slug: slugHint,
          phone: String(fd.get('phone') || '') || undefined,
          owner_name: String(fd.get('owner_name') || storeName),
          email: String(fd.get('email')),
          password: String(fd.get('password')),
        });
        setLibraryToken(res.token);
        clearSetupToken();
      } else {
        await updateLibraryStore({
          name: storeName,
          phone: String(fd.get('phone') || ''),
        });
      }

      if (logo instanceof File && logo.size > 0) {
        const uploaded = await uploadLibraryLogo(logo);
        setLogoPreview(uploaded.logo_url);
      }

      const data = await fetchLibraryMe();
      setMe(data);
      setBrandName(data.store.name);
      setSlug(data.store.slug);
      setLogoPreview(data.store.logo_url ?? logoPreview);
      setLoc({
        governorate: data.store.governorate ?? '',
        wilayat: data.store.wilayat ?? '',
        area: data.store.area ?? '',
        address: data.store.address ?? '',
        latitude: data.store.latitude != null ? String(data.store.latitude) : '',
        longitude: data.store.longitude != null ? String(data.store.longitude) : '',
      });
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
    if (!loc.latitude || !loc.longitude) {
      setError('حدد موقع المكتبة على الخريطة أولاً');
      setLoading(false);
      return;
    }
    if (!loc.governorate.trim() || !loc.wilayat.trim() || !loc.address.trim()) {
      setError('أكمل المحافظة والولاية والعنوان بعد تحديد الموقع');
      setLoading(false);
      return;
    }
    try {
      const res = await updateLibraryStore({
        governorate: loc.governorate.trim(),
        wilayat: loc.wilayat.trim(),
        area: loc.area.trim(),
        address: loc.address.trim(),
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
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
    if (pass !== String(fd.get('device_password_confirm'))) {
      setError('كلمتا مرور الجهاز غير متطابقتين');
      setLoading(false);
      return;
    }
    try {
      const res = await setLibraryDeviceSecurity(pass, String(fd.get('device_confirm_phone')));
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
      const res = await completeLibraryOnboarding();
      router.replace(res.store?.customer_shop_path ?? me!.store.customer_shop_path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر الإنهاء');
      setLoading(false);
    }
  }

  if (booting) {
    return (
      <div className="page-shell">
        <div className="page-content setup-boot">جاري التحميل…</div>
      </div>
    );
  }

  // ── Admin unlock ───────────────────────────────────────────────────────────
  if (!unlocked && !me) {
    return (
      <div className="page-shell">
        <div className="page-content setup-lock animate-fade-in">
          <div className="setup-lock-top">
            <div className="setup-lock-mark" aria-hidden>
              <Printer className="size-6" />
            </div>
            <p className="setup-lock-brand">منصة الطباعة</p>
            <h1 className="setup-lock-title">إعداد المكتبة</h1>
            <p className="setup-lock-sub">للمسؤول فقط — أول تشغيل لمكتبة الطباعة</p>
          </div>

          <form onSubmit={onUnlock} className="setup-lock-form">
            <label className="label" htmlFor="setup_password">
              كلمة مرور الإعداد
            </label>
            <div className="setup-password-wrap">
              <Lock className="setup-password-icon" aria-hidden />
              <input
                id="setup_password"
                name="setup_password"
                type="password"
                className="input-field setup-password-input"
                required
                autoFocus
                dir="ltr"
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <FieldError message={error} />
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'جارٍ التحقق…' : 'متابعة الإعداد'}
            </button>
          </form>

          <div className="setup-lock-foot">
            <a href="/al-noor">متجر العملاء</a>
            <span aria-hidden>·</span>
            <a href="/library">إدارة مكتبة</a>
          </div>
        </div>
      </div>
    );
  }

  const creating = !me;
  const stepMeta = STEPS.find((s) => s.id === step)!;

  return (
    <div className="page-shell">
      <div className="page-content setup-flow">
        <header className="setup-flow-head">
          <div className="setup-flow-head-row">
            <div className="setup-flow-icon" aria-hidden>
              {step === 'brand' && <Building2 className="size-5" />}
              {step === 'location' && <MapPin className="size-5" />}
              {step === 'device' && <MonitorSmartphone className="size-5" />}
              {step === 'review' && <KeyRound className="size-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="setup-flow-kicker">إعداد المكتبة · خطوة {stepMeta.num} من 4</p>
              <h1 className="setup-flow-title truncate">
                {me?.store.name || brandName || 'مكتبة جديدة'}
              </h1>
            </div>
          </div>
        </header>

        <SetupProgress step={step} />

        <div key={step} className="setup-flow-body animate-fade-in-up">
          {step === 'brand' && (
            <form id="setup-form" onSubmit={saveBrand} className="setup-form">
              <section className="setup-section">
                <h2 className="setup-section-title">هوية المكتبة</h2>
                <p className="setup-section-sub">الاسم والشعار والرقم كما سيراها العملاء</p>

                <label className="setup-logo" htmlFor={logoInputId}>
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="" className="setup-logo-img" />
                  ) : (
                    <span className="setup-logo-empty">
                      <ImagePlus className="size-6" aria-hidden />
                      <span>إضافة شعار</span>
                    </span>
                  )}
                  <input
                    id={logoInputId}
                    name="logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(ev) => {
                      const f = ev.target.files?.[0];
                      if (f) setLogoPreview(URL.createObjectURL(f));
                    }}
                  />
                </label>

                <div>
                  <label className="label" htmlFor="name">
                    اسم المكتبة
                  </label>
                  <input
                    id="name"
                    name="name"
                    className="input-field"
                    required
                    value={brandName}
                    onChange={(e) => {
                      const v = e.target.value;
                      setBrandName(v);
                      if (!slugTouched && creating) setSlug(slugifyBrand(v));
                    }}
                    placeholder="مثال: مكتبة النور"
                  />
                </div>

                {creating && (
                  <div>
                    <label className="label" htmlFor="store_slug">
                      رابط المتجر
                    </label>
                    <div className="setup-slug" dir="ltr">
                      <span className="setup-slug-prefix">/</span>
                      <input
                        id="store_slug"
                        name="store_slug"
                        className="input-field setup-slug-input"
                        required
                        pattern="[a-z0-9\-]+"
                        value={slug}
                        onChange={(e) => {
                          setSlugTouched(true);
                          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                        }}
                        placeholder="al-noor"
                      />
                    </div>
                    <p className="setup-hint">سيفتح للعملاء على هذا الرابط بعد الإنهاء</p>
                  </div>
                )}

                <div>
                  <label className="label" htmlFor="phone">
                    رقم المكتبة
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    className="input-field"
                    dir="ltr"
                    defaultValue={me?.store.phone ?? ''}
                    placeholder="+968 9xxx xxxx"
                  />
                </div>
              </section>

              {creating && (
                <section className="setup-section setup-section-muted">
                  <h2 className="setup-section-title">حساب الإدارة</h2>
                  <p className="setup-section-sub">للدخول لاحقاً من /library — ليس لطلبات العملاء</p>
                  <div>
                    <label className="label" htmlFor="owner_name">
                      اسم المسؤول
                    </label>
                    <input id="owner_name" name="owner_name" className="input-field" required />
                  </div>
                  <div>
                    <label className="label" htmlFor="email">
                      البريد
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className="input-field"
                      required
                      dir="ltr"
                      placeholder="owner@library.om"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="password">
                      كلمة مرور الحساب
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      className="input-field"
                      required
                      minLength={8}
                      dir="ltr"
                    />
                  </div>
                </section>
              )}

              <FieldError message={error} />
            </form>
          )}

          {step === 'location' && me && (
            <form id="setup-form" onSubmit={saveLocation} className="setup-form">
              <section className="setup-section">
                <h2 className="setup-section-title">حدد الموقع على الخريطة</h2>
                <p className="setup-section-sub">
                  اضغط مكان المكتبة أو استخدم موقعك الحالي — سنملأ العنوان تلقائياً ويمكنك تعديله
                </p>

                <LocationPickerMap
                  latitude={loc.latitude ? Number(loc.latitude) : me.store.latitude}
                  longitude={loc.longitude ? Number(loc.longitude) : me.store.longitude}
                  onPick={applyPickedLocation}
                />

                {loc.latitude && loc.longitude && (
                  <p className="setup-coords" dir="ltr">
                    {loc.latitude}, {loc.longitude}
                  </p>
                )}

                <div className="setup-grid-2">
                  <div>
                    <label className="label" htmlFor="governorate">
                      المحافظة
                    </label>
                    <input
                      id="governorate"
                      name="governorate"
                      className="input-field"
                      required
                      value={loc.governorate}
                      onChange={(e) => setLoc((p) => ({ ...p, governorate: e.target.value }))}
                      placeholder="مسقط"
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
                      value={loc.wilayat}
                      onChange={(e) => setLoc((p) => ({ ...p, wilayat: e.target.value }))}
                      placeholder="بوشر"
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
                    value={loc.area}
                    onChange={(e) => setLoc((p) => ({ ...p, area: e.target.value }))}
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
                    value={loc.address}
                    onChange={(e) => setLoc((p) => ({ ...p, address: e.target.value }))}
                    placeholder="شارع … بالقرب من …"
                  />
                </div>
              </section>
              <FieldError message={error} />
            </form>
          )}

          {step === 'device' && me && (
            <form id="setup-form" onSubmit={saveDevice} className="setup-form">
              <section className="setup-section">
                <h2 className="setup-section-title">ربط جهاز الكاونتر</h2>
                <p className="setup-section-sub">
                  عند تشغيل تطبيق سطح المكتب يُطلب كلمة المرور ثم يُرسل رمز تأكيد لهذا الرقم
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
                    autoComplete="new-password"
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
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="device_confirm_phone">
                    رقم استلام رمز الربط
                  </label>
                  <input
                    id="device_confirm_phone"
                    name="device_confirm_phone"
                    className="input-field"
                    required
                    dir="ltr"
                    defaultValue={me.store.device_confirm_phone ?? me.store.phone ?? ''}
                    placeholder="+968 9xxx xxxx"
                  />
                </div>
              </section>
              <FieldError message={error} />
            </form>
          )}

          {step === 'review' && me && (
            <div className="setup-form">
              <section className="setup-section">
                <h2 className="setup-section-title">جاهز للإطلاق</h2>
                <p className="setup-section-sub">راجع البيانات ثم افتح متجر العملاء</p>

                <div className="setup-review-card">
                  <div className="setup-review-brand">
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoPreview} alt="" className="setup-review-logo" />
                    ) : (
                      <div className="setup-review-logo-fallback">
                        <Building2 className="size-5" />
                      </div>
                    )}
                    <div>
                      <p className="setup-review-name">{me.store.name}</p>
                      <p className="setup-review-url" dir="ltr">
                        /{me.store.slug}
                      </p>
                    </div>
                  </div>
                  <dl className="setup-review-list">
                    <div>
                      <dt>الهاتف</dt>
                      <dd dir="ltr">{me.store.phone || '—'}</dd>
                    </div>
                    <div>
                      <dt>الموقع</dt>
                      <dd>
                        {[me.store.governorate, me.store.wilayat, me.store.address]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>أمان الجهاز</dt>
                      <dd>{me.store.has_device_password ? 'مضبوط' : 'غير مضبوط'}</dd>
                    </div>
                  </dl>
                </div>
              </section>
              <FieldError message={error} />
            </div>
          )}
        </div>

        <footer className="setup-flow-foot">
          {step !== 'brand' && (
            <button
              type="button"
              className="btn-ghost flex-1"
              disabled={loading}
              onClick={() => {
                setError('');
                if (step === 'location') setStep('brand');
                else if (step === 'device') setStep('location');
                else if (step === 'review') setStep('device');
              }}
            >
              رجوع
            </button>
          )}
          {step === 'review' ? (
            <button
              type="button"
              className="btn-primary flex-[1.6]"
              disabled={loading}
              onClick={finish}
            >
              {loading ? 'جارٍ…' : 'إنهاء وفتح المتجر'}
            </button>
          ) : (
            <button
              type="submit"
              form="setup-form"
              className="btn-primary flex-[1.6]"
              disabled={loading}
            >
              {loading ? 'جارٍ…' : 'التالي'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
