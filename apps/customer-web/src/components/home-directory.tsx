'use client';

import Link from 'next/link';
import { FormEvent, useDeferredValue, useEffect, useState } from 'react';
import {
  DoorOpen,
  MapPin,
  Pencil,
  Search,
  Store,
  Trash2,
  UserRound,
} from 'lucide-react';
import {
  fetchCustomerMe,
  listStores,
  logoutCustomer,
  platformDeleteStore,
  platformListStores,
  platformSetHours,
  platformUpdateStore,
  requestOtp,
  verifyOtp,
  type PlatformStore,
} from '@/lib/api';
import { TIBAA } from '@/lib/brand';
import { TibaaBrand } from '@/components/tibaa-brand';
import { SiteFooter } from '@/components/site-footer';
import { PhoneInput } from '@/components/phone-input';
import {
  OpeningHoursEditor,
  defaultHours,
  type HourRow,
} from '@/components/opening-hours-editor';
import {
  clearCustomerSession,
  getCustomerPhone,
  getCustomerToken,
  isLoggedIn,
  isPlatformAdmin,
  setCustomerSession,
} from '@/lib/customer-session';

type PublicStore = {
  slug: string;
  name: string;
  logo_url: string | null;
  location_label: string | null;
  is_open: boolean;
};

export function HomeDirectory() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [stores, setStores] = useState<PublicStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authPhone, setAuthPhone] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authStep, setAuthStep] = useState<'phone' | 'code'>('phone');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [adminStores, setAdminStores] = useState<PlatformStore[]>([]);
  const [editing, setEditing] = useState<PlatformStore | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editHours, setEditHours] = useState<HourRow[]>(defaultHours());
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  const refreshSession = async () => {
    const ok = isLoggedIn();
    setLoggedIn(ok);
    setPhone(ok ? getCustomerPhone() : null);
    let isAdmin = ok && isPlatformAdmin();
    const token = getCustomerToken();
    if (ok && token) {
      try {
        const me = await fetchCustomerMe(token);
        isAdmin = Boolean(me.is_platform_admin);
        setCustomerSession(token, me.phone, { is_platform_admin: isAdmin });
        setPhone(me.phone);
      } catch {
        clearCustomerSession();
        setLoggedIn(false);
        setPhone(null);
        isAdmin = false;
      }
    }
    setAdmin(isAdmin);
    return isAdmin;
  };

  const loadAdminStores = async () => {
    const token = getCustomerToken();
    if (!token) return;
    try {
      const res = await platformListStores(token);
      setAdminStores(res.stores);
    } catch {
      setAdminStores([]);
    }
  };

  useEffect(() => {
    void refreshSession().then((isAdmin) => {
      if (isAdmin) void loadAdminStores();
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    listStores(deferredQuery)
      .then((res) => {
        if (!cancelled) setStores(res.stores);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل المكتبات');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [deferredQuery]);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    setDevCode(null);
    try {
      const res = await requestOtp(authPhone);
      setDevCode(res.dev_code ?? null);
      setAuthStep('code');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'فشل إرسال الرمز');
    } finally {
      setAuthBusy(false);
    }
  }

  async function confirmCode(e: FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError('');
    try {
      const res = await verifyOtp(authPhone, authCode);
      setCustomerSession(res.token, res.phone, {
        is_platform_admin: Boolean(res.is_platform_admin),
      });
      setAuthOpen(false);
      setAuthStep('phone');
      setAuthCode('');
      const isAdmin = await refreshSession();
      if (isAdmin) await loadAdminStores();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'رمز غير صحيح');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    const token = getCustomerToken();
    if (token) {
      try {
        await logoutCustomer(token);
      } catch {
        /* ignore */
      }
    }
    clearCustomerSession();
    setAdmin(false);
    setAdminStores([]);
    setEditing(null);
    await refreshSession();
  }

  function openEdit(store: PlatformStore) {
    setEditing(store);
    setEditName(store.name);
    setEditPhone(store.phone ?? '');
    setEditHours(
      store.opening_hours?.length === 7
        ? store.opening_hours.map((h) => ({
            day_of_week: h.day_of_week,
            open_time: h.open_time.slice(0, 5),
            close_time: h.close_time.slice(0, 5),
            is_closed: h.is_closed,
          }))
        : defaultHours(),
    );
    setEditError('');
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const token = getCustomerToken();
    if (!token) return;
    setEditBusy(true);
    setEditError('');
    try {
      await platformUpdateStore(token, editing.slug, {
        name: editName.trim(),
        phone: editPhone.trim() || null,
      });
      await platformSetHours(token, editing.slug, editHours);
      await loadAdminStores();
      setEditing(null);
      // refresh public list too
      const res = await listStores(deferredQuery);
      setStores(res.stores);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setEditBusy(false);
    }
  }

  async function removeStore(store: PlatformStore) {
    if (!confirm(`إيقاف المكتبة «${store.name}» وإخفاؤها من الدليل؟`)) return;
    const token = getCustomerToken();
    if (!token) return;
    try {
      await platformDeleteStore(token, store.slug);
      await loadAdminStores();
      const res = await listStores(deferredQuery);
      setStores(res.stores);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'فشل الحذف');
    }
  }

  return (
    <div className="page-shell page-shell-wide shell-home">
      <div className="page-content flex min-h-0 flex-col">
        <header className="shrink-0 border-b border-border/70 bg-surface/95 px-4 py-4 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
            <Link href="/" className="flex shrink-0 items-center gap-3 self-center md:self-auto">
              <TibaaBrand variant="icon" size="sm" className="!h-12 !w-12" />
              <div className="text-start leading-tight">
                <p className="text-lg font-extrabold tracking-tight text-primary sm:text-xl">
                  {TIBAA.nameAr}
                </p>
                <p className="text-sm font-bold text-teal">{TIBAA.nameEn}</p>
              </div>
            </Link>

            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">بحث عن مكتبة</span>
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالاسم أو المنطقة…"
                className="input-field w-full !ps-10"
                autoComplete="off"
              />
            </label>

            <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row md:w-auto">
              <Link
                href="/onboarding"
                className="btn-primary btn-compact w-full text-center md:min-w-[10rem]"
              >
                إعداد مكتبة جديدة
              </Link>
              {loggedIn ? (
                <button
                  type="button"
                  className="btn-ghost btn-compact inline-flex w-full items-center justify-center gap-2 md:w-auto"
                  onClick={() => void handleLogout()}
                >
                  <DoorOpen className="size-4" />
                  {admin ? 'خروج المشرف' : 'خروج'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-ghost btn-compact inline-flex w-full items-center justify-center gap-2 md:w-auto"
                  onClick={() => {
                    setAuthOpen(true);
                    setAuthStep('phone');
                    setAuthError('');
                  }}
                >
                  <UserRound className="size-4" />
                  دخول
                </button>
              )}
            </div>
          </div>
          {admin && phone ? (
            <p className="mt-3 text-xs font-medium text-teal">
              وضع المشرف ·{' '}
              <span className="unicode-bidi-isolate" dir="ltr">
                {phone}
              </span>
            </p>
          ) : null}
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          {admin ? (
            <section className="mb-8">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-text sm:text-lg">إدارة المكتبات</h2>
                  <p className="mt-0.5 text-xs text-text-muted sm:text-sm">
                    تعديل أو إيقاف أي مكتبة على المنصة
                  </p>
                </div>
                <p className="text-xs text-text-muted tabular-nums">{adminStores.length} مكتبة</p>
              </div>
              <ul className="space-y-2">
                {adminStores.map((store) => (
                  <li
                    key={store.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-bold text-text">{store.name}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            store.is_active
                              ? 'bg-success/10 text-success'
                              : 'bg-error/10 text-error'
                          }`}
                        >
                          {store.is_active ? 'نشطة' : 'موقوفة'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-text-muted" dir="ltr">
                        /{store.slug} · {store.orders_count} طلب
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/${store.slug}`} className="btn-outline btn-compact !px-3 !py-1.5 text-xs">
                        فتح
                      </Link>
                      <button
                        type="button"
                        className="btn-ghost btn-compact inline-flex items-center gap-1 !px-3 !py-1.5 text-xs"
                        onClick={() => openEdit(store)}
                      >
                        <Pencil className="size-3.5" />
                        تعديل
                      </button>
                      {store.is_active ? (
                        <button
                          type="button"
                          className="btn-ghost btn-compact inline-flex items-center gap-1 !px-3 !py-1.5 text-xs text-error"
                          onClick={() => void removeStore(store)}
                        >
                          <Trash2 className="size-3.5" />
                          إيقاف
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-ghost btn-compact !px-3 !py-1.5 text-xs text-success"
                          onClick={() => {
                            const token = getCustomerToken();
                            if (!token) return;
                            void platformUpdateStore(token, store.slug, { is_active: true }).then(
                              () => loadAdminStores(),
                            );
                          }}
                        >
                          إعادة تفعيل
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-text sm:text-lg">المكتبات</h2>
              <p className="mt-0.5 text-xs text-text-muted sm:text-sm">
                اختر مكتبة لبدء طلب الطباعة
              </p>
            </div>
            {!loading ? (
              <p className="text-xs text-text-muted tabular-nums sm:text-sm">{stores.length} مكتبة</p>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[5.5rem] animate-pulse rounded-2xl border border-border bg-surface"
                />
              ))}
            </div>
          ) : stores.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/70 py-16 text-center">
              <Store className="mx-auto size-10 text-text-muted/50" />
              <p className="mt-3 text-sm font-medium text-text">لا توجد مكتبات مطابقة</p>
              <p className="mt-1 text-xs text-text-muted">جرّب بحثاً آخر أو سجّل مكتبتك</p>
              <Link href="/onboarding" className="btn-outline btn-compact mt-4 inline-flex">
                إعداد مكتبة جديدة
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {stores.map((store, i) => (
                <li
                  key={store.slug}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                >
                  <Link
                    href={`/${store.slug}`}
                    className="flex h-full items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3.5 shadow-sm transition-all hover:border-primary/25 hover:bg-accent/40 hover:shadow-md"
                  >
                    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background sm:size-16">
                      {store.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={store.logo_url}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <Store className="size-6 text-primary/70" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-start">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-text sm:text-base">
                          {store.name}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            store.is_open
                              ? 'bg-success/10 text-success'
                              : 'bg-text-muted/10 text-text-muted'
                          }`}
                        >
                          {store.is_open ? 'مفتوح' : 'مغلق'}
                        </span>
                      </div>
                      {store.location_label ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-text-muted sm:text-sm">
                          <MapPin className="size-3.5 shrink-0" />
                          <span className="line-clamp-2">{store.location_label}</span>
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-text-muted" dir="ltr">
                          /{store.slug}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>

        <SiteFooter />
      </div>

      {authOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-5 shadow-xl sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">دخول</h2>
              <button
                type="button"
                className="nav-icon-btn"
                onClick={() => setAuthOpen(false)}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
            {authStep === 'phone' ? (
              <form className="space-y-4" onSubmit={(e) => void sendCode(e)}>
                <label className="block">
                  <span className="option-label">رقم الهاتف</span>
                  <PhoneInput
                    value={authPhone}
                    onChange={setAuthPhone}
                    required
                    showError
                  />
                </label>
                {authError ? <p className="text-sm text-error">{authError}</p> : null}
                <button type="submit" className="btn-primary w-full" disabled={authBusy}>
                  {authBusy ? 'جاري الإرسال…' : 'إرسال رمز التحقق'}
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={(e) => void confirmCode(e)}>
                <p className="text-sm text-text-muted">
                  أدخل الرمز المرسل إلى{' '}
                  <span className="unicode-bidi-isolate font-semibold text-text" dir="ltr">
                    {authPhone}
                  </span>
                </p>
                {devCode ? (
                  <p className="rounded-lg bg-accent px-3 py-2 text-xs text-primary">
                    رمز التطوير: {devCode}
                  </p>
                ) : null}
                <input
                  className="input-field text-center text-lg tracking-[0.35em]"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  inputMode="numeric"
                  required
                  minLength={4}
                />
                {authError ? <p className="text-sm text-error">{authError}</p> : null}
                <button type="submit" className="btn-primary w-full" disabled={authBusy}>
                  {authBusy ? 'جاري التحقق…' : 'تأكيد'}
                </button>
                <button
                  type="button"
                  className="btn-ghost w-full"
                  onClick={() => setAuthStep('phone')}
                >
                  تغيير الرقم
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
          <form
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 shadow-xl sm:rounded-3xl"
            onSubmit={(e) => void saveEdit(e)}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">تعديل المكتبة</h2>
              <button
                type="button"
                className="nav-icon-btn"
                onClick={() => setEditing(null)}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="option-label">الاسم</span>
                <input
                  className="input-field"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className="option-label">الهاتف</span>
                <PhoneInput value={editPhone} onChange={setEditPhone} />
              </label>
              <div>
                <span className="option-label">ساعات العمل</span>
                <OpeningHoursEditor
                  value={editHours}
                  onChange={setEditHours}
                  disabled={editBusy}
                />
              </div>
              {editError ? <p className="text-sm text-error">{editError}</p> : null}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="btn-ghost flex-1"
                disabled={editBusy}
                onClick={() => setEditing(null)}
              >
                إلغاء
              </button>
              <button type="submit" className="btn-primary flex-[1.4]" disabled={editBusy}>
                {editBusy ? 'جاري الحفظ…' : 'حفظ'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
