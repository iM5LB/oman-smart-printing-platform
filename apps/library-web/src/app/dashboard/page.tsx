'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createDevice,
  fetchMe,
  getCustomerShopBase,
  listDevices,
  logoutLibrary,
  MeResponse,
  DeviceRow,
  revokeDevice,
  rotateDevice,
  setDeviceSecurity,
  updateStore,
} from '@/lib/api';
import { clearLibraryToken, getLibraryToken } from '@/lib/session';

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'devices' | 'store' | 'security'>('devices');

  const refresh = useCallback(async () => {
    const [meData, devicesData] = await Promise.all([fetchMe(), listDevices()]);
    if (!meData.onboarding_complete) {
      router.replace('/onboarding');
      return;
    }
    setMe(meData);
    setDevices(devicesData.devices);
  }, [router]);

  useEffect(() => {
    if (!getLibraryToken()) {
      router.replace('/login');
      return;
    }
    refresh().catch(() => {
      clearLibraryToken();
      router.replace('/login');
    });
  }, [refresh, router]);

  async function onCreateDevice(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    const fd = new FormData(e.currentTarget);
    try {
      const res = await createDevice(String(fd.get('name') || 'جهاز الكاونتر'));
      setNewToken(res.device_token);
      setNotice(res.message);
      e.currentTarget.reset();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الإنشاء');
    } finally {
      setLoading(false);
    }
  }

  async function onRotate(id: string) {
    setLoading(true);
    setError('');
    try {
      const res = await rotateDevice(id);
      setNewToken(res.device_token);
      setNotice(res.message);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التجديد');
    } finally {
      setLoading(false);
    }
  }

  async function onRevoke(id: string) {
    if (!confirm('إلغاء صلاحية هذا الجهاز؟')) return;
    setLoading(true);
    try {
      await revokeDevice(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الإلغاء');
    } finally {
      setLoading(false);
    }
  }

  async function onSaveStore(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    try {
      await updateStore({
        name: String(fd.get('name')),
        phone: String(fd.get('phone') || ''),
        governorate: String(fd.get('governorate')),
        wilayat: String(fd.get('wilayat')),
        area: String(fd.get('area') || ''),
        address: String(fd.get('address')),
        latitude: String(fd.get('latitude') || '')
          ? Number(fd.get('latitude'))
          : null,
        longitude: String(fd.get('longitude') || '')
          ? Number(fd.get('longitude'))
          : null,
      });
      setNotice('تم حفظ بيانات المكتبة');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  }

  async function onSaveSecurity(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const pass = String(fd.get('device_password'));
    if (pass !== String(fd.get('device_password_confirm'))) {
      setError('كلمتا المرور غير متطابقتين');
      setLoading(false);
      return;
    }
    try {
      await setDeviceSecurity(pass, String(fd.get('device_confirm_phone')));
      setNotice('تم تحديث أمان الجهاز');
      e.currentTarget.reset();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    await logoutLibrary();
    clearLibraryToken();
    router.replace('/login');
  }

  if (!me) {
    return (
      <div className="shell flex min-h-dvh items-center justify-center text-sm text-text-muted">
        جاري التحميل…
      </div>
    );
  }

  const shopUrl = `${getCustomerShopBase()}${me.store.customer_shop_path}`;
  const statusLabel: Record<string, string> = {
    connected: 'متصل',
    disconnected: 'غير متصل',
    revoked: 'ملغى',
  };

  return (
    <div className="shell min-h-dvh">
      <header className="border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold text-gold">لوحة المكتبة</p>
            <h1 className="text-xl font-bold text-primary">{me.store.name}</h1>
            <p className="text-xs text-text-muted">
              {me.user.name} · {me.user.email}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={shopUrl} target="_blank" rel="noreferrer" className="btn-outline text-sm">
              رابط العملاء
            </a>
            <button type="button" className="btn-ghost" onClick={onLogout}>
              خروج
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ['devices', 'الأجهزة'],
              ['store', 'بيانات المكتبة'],
              ['security', 'أمان الربط'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                tab === id ? 'bg-primary text-white' : 'bg-surface text-text-muted border border-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {(error || notice) && (
          <div
            className={`mb-4 rounded-xl px-4 py-3 text-sm ${
              error ? 'bg-red-50 text-error' : 'bg-accent text-primary'
            }`}
          >
            {error || notice}
          </div>
        )}

        {newToken && (
          <div className="card mb-4 border-gold/40 bg-amber-50/50 p-4">
            <p className="text-sm font-semibold text-primary">رمز الجهاز (يظهر مرة واحدة)</p>
            <p className="mt-2 break-all font-mono text-xs" dir="ltr">
              {newToken}
            </p>
            <button
              type="button"
              className="btn-ghost mt-3"
              onClick={() => navigator.clipboard.writeText(newToken)}
            >
              نسخ
            </button>
          </div>
        )}

        {tab === 'devices' && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="card p-5">
              <h2 className="text-lg font-bold">ربط تطبيق سطح المكتب</h2>
              <ol className="mt-3 list-decimal space-y-2 pr-5 text-sm text-text-muted">
                <li>
                  افتح التطبيق على جهاز الكاونتر وأدخل معرّف المكتبة{' '}
                  <span className="font-mono text-text" dir="ltr">
                    {me.store.slug}
                  </span>
                </li>
                <li>أدخل كلمة مرور الجهاز المضبوطة هنا</li>
                <li>سيصل رمز تأكيد إلى {me.store.device_confirm_phone}</li>
                <li>أو أنشئ رمزاً يدوياً أدناه والصقه في التطبيق</li>
              </ol>
            </div>

            <form onSubmit={onCreateDevice} className="card flex flex-wrap items-end gap-3 p-5">
              <div className="min-w-[12rem] flex-1">
                <label className="label" htmlFor="name">
                  اسم الجهاز الجديد
                </label>
                <input
                  id="name"
                  name="name"
                  className="input-field"
                  placeholder="جهاز الكاونتر"
                  defaultValue="جهاز الكاونتر"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                إنشاء رمز جهاز
              </button>
            </form>

            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-background text-text-muted">
                  <tr>
                    <th className="px-4 py-3 text-start font-medium">الاسم</th>
                    <th className="px-4 py-3 text-start font-medium">الحالة</th>
                    <th className="px-4 py-3 text-start font-medium">آخر اتصال</th>
                    <th className="px-4 py-3 text-start font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-text-muted">
                        لا أجهزة بعد — اربط من التطبيق أو أنشئ رمزاً
                      </td>
                    </tr>
                  )}
                  {devices.map((d) => (
                    <tr key={d.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{d.name}</td>
                      <td className="px-4 py-3">{statusLabel[d.status] ?? d.status}</td>
                      <td className="px-4 py-3 text-text-muted" dir="ltr">
                        {d.last_connected_at
                          ? new Date(d.last_connected_at).toLocaleString('ar-OM')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {d.status !== 'revoked' && (
                            <>
                              <button
                                type="button"
                                className="btn-ghost !py-1.5 !text-xs"
                                disabled={loading}
                                onClick={() => onRotate(d.id)}
                              >
                                تجديد الرمز
                              </button>
                              <button
                                type="button"
                                className="btn-ghost !py-1.5 !text-xs text-error"
                                disabled={loading}
                                onClick={() => onRevoke(d.id)}
                              >
                                إلغاء
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'store' && (
          <form onSubmit={onSaveStore} className="card animate-fade-in-up space-y-3 p-5">
            <h2 className="text-lg font-bold">بيانات وموقع المكتبة</h2>
            <div>
              <label className="label" htmlFor="name">
                الاسم
              </label>
              <input id="name" name="name" className="input-field" required defaultValue={me.store.name} />
            </div>
            <div>
              <label className="label" htmlFor="phone">
                الهاتف
              </label>
              <input
                id="phone"
                name="phone"
                className="input-field"
                dir="ltr"
                defaultValue={me.store.phone ?? ''}
              />
            </div>
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
              <input id="area" name="area" className="input-field" defaultValue={me.store.area ?? ''} />
            </div>
            <div>
              <label className="label" htmlFor="address">
                العنوان
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
                  خط العرض
                </label>
                <input
                  id="latitude"
                  name="latitude"
                  className="input-field"
                  dir="ltr"
                  defaultValue={me.store.latitude ?? ''}
                />
              </div>
              <div>
                <label className="label" htmlFor="longitude">
                  خط الطول
                </label>
                <input
                  id="longitude"
                  name="longitude"
                  className="input-field"
                  dir="ltr"
                  defaultValue={me.store.longitude ?? ''}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              حفظ
            </button>
          </form>
        )}

        {tab === 'security' && (
          <form onSubmit={onSaveSecurity} className="card animate-fade-in-up space-y-3 p-5">
            <h2 className="text-lg font-bold">كلمة مرور الجهاز ورقم التأكيد</h2>
            <p className="text-sm text-text-muted">
              تُستخدم عند ربط تطبيق سطح المكتب. الرمز يُرسل إلى رقم التأكيد وليس إلى هاتف العميل.
            </p>
            <div>
              <label className="label" htmlFor="device_password">
                كلمة مرور جديدة للجهاز
              </label>
              <input
                id="device_password"
                name="device_password"
                type="password"
                className="input-field"
                required
                minLength={6}
                dir="ltr"
              />
            </div>
            <div>
              <label className="label" htmlFor="device_password_confirm">
                تأكيد
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
                رقم استلام رمز الربط
              </label>
              <input
                id="device_confirm_phone"
                name="device_confirm_phone"
                className="input-field"
                required
                dir="ltr"
                defaultValue={me.store.device_confirm_phone ?? ''}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              تحديث الأمان
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
