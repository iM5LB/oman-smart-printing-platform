'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { FormEvent, useDeferredValue, useEffect, useRef, useState } from 'react';
import {
  DoorOpen,
  MapPin,
  Pencil,
  Power,
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

const LocationPickerMap = dynamic(
  () => import('@/components/location-picker-map').then((m) => m.LocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-border bg-background px-4 py-8 text-center text-sm text-text-muted">
        جاري تحميل الخريطة…
      </div>
    ),
  },
);
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

type EditDraft = {
  name: string;
  phone: string;
  governorate: string;
  wilayat: string;
  area: string;
  address: string;
  latitude: string;
  longitude: string;
  order_number_prefix: string;
  auto_print_paid_orders: boolean;
  pay_at_pickup_print_policy: string;
  file_retention_policy: string;
  paid_orders_priority: string;
  device_confirm_phone: string;
  is_active: boolean;
  hours: HourRow[];
};

const PICKUP_POLICIES = [
  { value: 'require_approval', label: 'مراجعة قبل الطباعة' },
  { value: 'auto_print', label: 'طباعة تلقائية فور الطلب' },
  { value: 'print_on_arrival', label: 'طباعة عند وصول العميل' },
];

const RETENTION_POLICIES = [
  { value: 'immediate', label: 'فوري' },
  { value: 'one_hour', label: 'ساعة واحدة' },
  { value: 'twenty_four_hours', label: '24 ساعة' },
  { value: 'three_days', label: '3 أيام' },
  { value: 'seven_days', label: '7 أيام' },
];

const PRIORITIES = [
  { value: 'urgent', label: 'عاجل' },
  { value: 'normal', label: 'عادي' },
  { value: 'low', label: 'منخفض' },
];

function locationLabel(store: {
  area?: string | null;
  wilayat?: string | null;
  governorate?: string | null;
  address?: string | null;
}) {
  return (
    [store.area, store.wilayat, store.governorate].filter(Boolean).join('، ') ||
    store.address ||
    null
  );
}

function isOpenNow(
  hours: Array<{
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
  }>,
) {
  if (!hours?.length) return false;
  const oman = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Muscat' }));
  const omanDay = (oman.getDay() + 1) % 7;
  const today = hours.find((h) => h.day_of_week === omanDay);
  if (!today || today.is_closed) return false;
  const t = `${String(oman.getHours()).padStart(2, '0')}:${String(oman.getMinutes()).padStart(2, '0')}`;
  const open = today.open_time.slice(0, 5);
  const close = today.close_time.slice(0, 5);
  return t >= open && t < close;
}

function draftFromStore(store: PlatformStore): EditDraft {
  return {
    name: store.name,
    phone: store.phone ?? '',
    governorate: store.governorate ?? '',
    wilayat: store.wilayat ?? '',
    area: store.area ?? '',
    address: store.address ?? '',
    latitude: store.latitude != null ? String(store.latitude) : '',
    longitude: store.longitude != null ? String(store.longitude) : '',
    order_number_prefix: store.order_number_prefix ?? '#',
    auto_print_paid_orders: store.auto_print_paid_orders ?? true,
    pay_at_pickup_print_policy: store.pay_at_pickup_print_policy ?? 'require_approval',
    file_retention_policy: store.file_retention_policy ?? 'twenty_four_hours',
    paid_orders_priority: store.paid_orders_priority ?? 'urgent',
    device_confirm_phone: store.device_confirm_phone ?? '',
    is_active: store.is_active,
    hours:
      store.opening_hours?.length === 7
        ? store.opening_hours.map((h) => ({
            day_of_week: h.day_of_week,
            open_time: h.open_time.slice(0, 5),
            close_time: h.close_time.slice(0, 5),
            is_closed: h.is_closed,
          }))
        : defaultHours(),
  };
}

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
  const [adminLoading, setAdminLoading] = useState(false);
  const [editing, setEditing] = useState<PlatformStore | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    setAdminLoading(true);
    try {
      const res = await platformListStores(token);
      setAdminStores(res.stores);
    } catch {
      setAdminStores([]);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession().then((isAdmin) => {
      if (isAdmin) void loadAdminStores();
    });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

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
    setMenuOpen(false);
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
    setDraft(draftFromStore(store));
    setEditError('');
  }

  function patchDraft(patch: Partial<EditDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editing || !draft) return;
    const token = getCustomerToken();
    if (!token) return;
    const latRaw = draft.latitude.trim();
    const lngRaw = draft.longitude.trim();
    const latitude = latRaw === '' ? null : Number(latRaw);
    const longitude = lngRaw === '' ? null : Number(lngRaw);
    if (latRaw && !Number.isFinite(latitude)) {
      setEditError('خط العرض غير صالح');
      return;
    }
    if (lngRaw && !Number.isFinite(longitude)) {
      setEditError('خط الطول غير صالح');
      return;
    }
    setEditBusy(true);
    setEditError('');
    try {
      await platformUpdateStore(token, editing.slug, {
        name: draft.name.trim(),
        phone: draft.phone.trim() || null,
        governorate: draft.governorate.trim() || null,
        wilayat: draft.wilayat.trim() || null,
        area: draft.area.trim() || null,
        address: draft.address.trim() || null,
        latitude,
        longitude,
        order_number_prefix: draft.order_number_prefix.trim() || '#',
        auto_print_paid_orders: draft.auto_print_paid_orders,
        pay_at_pickup_print_policy: draft.pay_at_pickup_print_policy,
        file_retention_policy: draft.file_retention_policy,
        paid_orders_priority: draft.paid_orders_priority,
        device_confirm_phone: draft.device_confirm_phone.trim() || null,
        is_active: draft.is_active,
      });
      await platformSetHours(token, editing.slug, draft.hours);
      await loadAdminStores();
      setEditing(null);
      setDraft(null);
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

  const visibleAdminStores = adminStores.filter((store) => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return true;
    return [store.name, store.slug, store.governorate, store.wilayat, store.area, store.address]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <div className="page-shell page-shell-wide shell-home">
      <div className="page-content flex min-h-0 flex-col">
        <header className="store-navbar !px-4 sm:!px-6 lg:!px-8">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2">
            <TibaaBrand variant="icon" size="sm" className="!size-9 !rounded-xl !p-0.5" />
            <h1 className="truncate text-sm font-bold text-text sm:text-base">{TIBAA.nameAr}</h1>
          </Link>

          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">بحث عن مكتبة</span>
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالاسم أو المنطقة…"
              className="input-field w-full !py-2.5 !ps-10"
              autoComplete="off"
            />
          </label>

          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              aria-label={loggedIn ? 'حسابي' : 'تسجيل الدخول'}
              aria-expanded={menuOpen}
              onClick={() => {
                if (!loggedIn) {
                  setAuthOpen(true);
                  setAuthStep('phone');
                  setAuthError('');
                  return;
                }
                setMenuOpen((v) => !v);
              }}
              className="nav-icon-btn relative"
            >
              <UserRound className="size-5" />
              {loggedIn ? <span className="nav-user-dot" /> : null}
            </button>

            {menuOpen && loggedIn ? (
              <div className="account-dropdown" role="menu">
                {phone ? (
                  <div className="account-dropdown-phone unicode-bidi-isolate" dir="ltr">
                    {phone}
                  </div>
                ) : null}
                {admin ? (
                  <>
                    <p className="px-2.5 py-1.5 text-center text-[11px] font-semibold text-teal">
                      وضع المشرف
                    </p>
                    <Link
                      href="/onboarding"
                      role="menuitem"
                      className="account-dropdown-item no-underline"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Store className="size-4" aria-hidden />
                      <span>إعداد مكتبة جديدة</span>
                    </Link>
                  </>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  className="account-dropdown-item account-dropdown-logout"
                  onClick={() => void handleLogout()}
                >
                  <DoorOpen className="size-4" aria-hidden />
                  <span>خروج</span>
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-text sm:text-lg">
                {admin ? 'إدارة المكتبات' : 'المكتبات'}
              </h2>
              <p className="mt-0.5 text-xs text-text-muted sm:text-sm">
                {admin ? 'اضغط البطاقة لفتح المكتبة · عدّل أو أوقف من الأزرار' : 'اختر مكتبة لبدء طلب الطباعة'}
              </p>
            </div>
            {!(loading || (admin && adminLoading)) ? (
              <p className="text-xs text-text-muted tabular-nums sm:text-sm">
                {(admin ? visibleAdminStores.length : stores.length)} مكتبة
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
              {error}
            </p>
          ) : null}

          {loading || (admin && adminLoading) ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[5.5rem] animate-pulse rounded-2xl border border-border bg-surface"
                />
              ))}
            </div>
          ) : (admin ? visibleAdminStores.length === 0 : stores.length === 0) ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/70 py-16 text-center">
              <Store className="mx-auto size-10 text-text-muted/50" />
              <p className="mt-3 text-sm font-medium text-text">لا توجد مكتبات مطابقة</p>
              <p className="mt-1 text-xs text-text-muted">
                {admin ? 'جرّب بحثاً آخر أو أضف مكتبة جديدة من حسابك' : 'جرّب بحثاً آخر'}
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(admin ? visibleAdminStores : stores).map((store, i) => {
                const adminStore = admin
                  ? (store as PlatformStore)
                  : adminStores.find((s) => s.slug === store.slug);
                const open = admin
                  ? isOpenNow((store as PlatformStore).opening_hours)
                  : (store as PublicStore).is_open;
                const loc =
                  'location_label' in store
                    ? store.location_label
                    : locationLabel(store as PlatformStore);
                return (
                  <li
                    key={store.slug}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                  >
                    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all hover:border-primary/25 hover:shadow-md">
                      {admin ? (
                        <Link
                          href={`/${store.slug}`}
                          className="flex items-center gap-3 px-3.5 py-3.5 hover:bg-accent/40"
                        >
                          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background sm:size-16">
                            {store.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={store.logo_url} alt="" className="size-full object-cover" />
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
                                  open
                                    ? 'bg-success/10 text-success'
                                    : 'bg-text-muted/10 text-text-muted'
                                }`}
                              >
                                {open ? 'مفتوح' : 'مغلق'}
                              </span>
                              {adminStore && !adminStore.is_active ? (
                                <span className="shrink-0 rounded-full bg-error/10 px-2 py-0.5 text-[10px] font-semibold text-error">
                                  موقوفة
                                </span>
                              ) : null}
                            </div>
                            {loc ? (
                              <p className="mt-1 flex items-center gap-1 text-xs text-text-muted sm:text-sm">
                                <MapPin className="size-3.5 shrink-0" />
                                <span className="line-clamp-2">{loc}</span>
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-text-muted" dir="ltr">
                                /{store.slug}
                              </p>
                            )}
                            {adminStore ? (
                              <p className="mt-1 text-[11px] text-text-muted" dir="ltr">
                                /{adminStore.slug} · {adminStore.orders_count} طلب
                              </p>
                            ) : null}
                          </div>
                        </Link>
                      ) : (
                        <Link
                          href={`/${store.slug}`}
                          className="flex h-full items-center gap-3 px-3.5 py-3.5 hover:bg-accent/40"
                        >
                          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background sm:size-16">
                            {store.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={store.logo_url} alt="" className="size-full object-cover" />
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
                                  open
                                    ? 'bg-success/10 text-success'
                                    : 'bg-text-muted/10 text-text-muted'
                                }`}
                              >
                                {open ? 'مفتوح' : 'مغلق'}
                              </span>
                            </div>
                            {loc ? (
                              <p className="mt-1 flex items-center gap-1 text-xs text-text-muted sm:text-sm">
                                <MapPin className="size-3.5 shrink-0" />
                                <span className="line-clamp-2">{loc}</span>
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-text-muted" dir="ltr">
                                /{store.slug}
                              </p>
                            )}
                          </div>
                        </Link>
                      )}
                      {admin && adminStore ? (
                        <div className="mt-auto grid grid-cols-2 gap-1.5 border-t border-border bg-background/70 px-2.5 py-2">
                          <button
                            type="button"
                            className="btn-ghost btn-compact inline-flex items-center justify-center gap-1 !px-2 !py-1.5 text-xs"
                            onClick={() => openEdit(adminStore)}
                          >
                            <Pencil className="size-3.5" />
                            تعديل
                          </button>
                          {adminStore.is_active ? (
                            <button
                              type="button"
                              className="btn-ghost btn-compact inline-flex items-center justify-center gap-1 !px-2 !py-1.5 text-xs text-error"
                              onClick={() => void removeStore(adminStore)}
                            >
                              <Trash2 className="size-3.5" />
                              إيقاف
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-ghost btn-compact inline-flex items-center justify-center gap-1 !px-2 !py-1.5 text-xs text-success"
                              onClick={() => {
                                const token = getCustomerToken();
                                if (!token) return;
                                void platformUpdateStore(token, adminStore.slug, {
                                  is_active: true,
                                }).then(() => loadAdminStores());
                              }}
                            >
                              <Power className="size-3.5" />
                              تفعيل
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
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

      {editing && draft ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
          <form
            className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 shadow-xl sm:rounded-3xl"
            onSubmit={(e) => void saveEdit(e)}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">تعديل المكتبة</h2>
                <p className="text-xs text-text-muted" dir="ltr">
                  /{editing.slug}
                </p>
              </div>
              <button
                type="button"
                className="nav-icon-btn"
                onClick={() => {
                  setEditing(null);
                  setDraft(null);
                }}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
            <div className="space-y-5">
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-text">بيانات المكتبة</h3>
                <label className="block">
                  <span className="option-label">الاسم</span>
                  <input
                    className="input-field"
                    value={draft.name}
                    onChange={(e) => patchDraft({ name: e.target.value })}
                    required
                  />
                </label>
                <label className="block">
                  <span className="option-label">الهاتف</span>
                  <PhoneInput
                    value={draft.phone}
                    onChange={(phone) => patchDraft({ phone })}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="option-label">بادئة الطلب</span>
                    <input
                      className="input-field"
                      dir="ltr"
                      value={draft.order_number_prefix}
                      onChange={(e) => patchDraft({ order_number_prefix: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="option-label">هاتف تأكيد الجهاز</span>
                    <PhoneInput
                      value={draft.device_confirm_phone}
                      onChange={(device_confirm_phone) => patchDraft({ device_confirm_phone })}
                    />
                  </label>
                </div>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
                  <span className="text-sm font-medium">المكتبة ظاهرة في الدليل</span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={draft.is_active}
                    onChange={(e) => patchDraft({ is_active: e.target.checked })}
                  />
                  <span
                    dir="ltr"
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      draft.is_active ? 'bg-primary' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                        draft.is_active ? 'left-4' : 'left-0.5'
                      }`}
                    />
                  </span>
                </label>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-bold text-text">الموقع</h3>
                <LocationPickerMap
                  latitude={draft.latitude ? Number(draft.latitude) : null}
                  longitude={draft.longitude ? Number(draft.longitude) : null}
                  onPick={(loc) =>
                    patchDraft({
                      latitude: String(loc.latitude),
                      longitude: String(loc.longitude),
                      governorate: loc.governorate || draft.governorate,
                      wilayat: loc.wilayat || draft.wilayat,
                      area: loc.area || draft.area,
                      address: loc.address || draft.address,
                    })
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="option-label">المحافظة</span>
                    <input
                      className="input-field"
                      value={draft.governorate}
                      onChange={(e) => patchDraft({ governorate: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="option-label">الولاية</span>
                    <input
                      className="input-field"
                      value={draft.wilayat}
                      onChange={(e) => patchDraft({ wilayat: e.target.value })}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="option-label">المنطقة</span>
                  <input
                    className="input-field"
                    value={draft.area}
                    onChange={(e) => patchDraft({ area: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="option-label">العنوان</span>
                  <input
                    className="input-field"
                    value={draft.address}
                    onChange={(e) => patchDraft({ address: e.target.value })}
                  />
                </label>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-bold text-text">التشغيل</h3>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
                  <span className="text-sm font-medium">طباعة تلقائية للمدفوع مسبقاً</span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={draft.auto_print_paid_orders}
                    onChange={(e) =>
                      patchDraft({ auto_print_paid_orders: e.target.checked })
                    }
                  />
                  <span
                    dir="ltr"
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      draft.auto_print_paid_orders ? 'bg-primary' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
                        draft.auto_print_paid_orders ? 'left-4' : 'left-0.5'
                      }`}
                    />
                  </span>
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="option-label">الدفع عند الاستلام</span>
                    <select
                      className="input-field"
                      value={draft.pay_at_pickup_print_policy}
                      onChange={(e) =>
                        patchDraft({ pay_at_pickup_print_policy: e.target.value })
                      }
                    >
                      {PICKUP_POLICIES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="option-label">احتفاظ الملفات</span>
                    <select
                      className="input-field"
                      value={draft.file_retention_policy}
                      onChange={(e) => patchDraft({ file_retention_policy: e.target.value })}
                    >
                      {RETENTION_POLICIES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="option-label">أولوية المدفوع</span>
                    <select
                      className="input-field"
                      value={draft.paid_orders_priority}
                      onChange={(e) => patchDraft({ paid_orders_priority: e.target.value })}
                    >
                      {PRIORITIES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-bold text-text">ساعات العمل</h3>
                <OpeningHoursEditor
                  value={draft.hours}
                  onChange={(hours) => patchDraft({ hours })}
                  disabled={editBusy}
                />
              </section>
              {editError ? <p className="text-sm text-error">{editError}</p> : null}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="btn-ghost flex-1"
                disabled={editBusy}
                onClick={() => {
                  setEditing(null);
                  setDraft(null);
                }}
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
