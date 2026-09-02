'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createLibraryDevice,
  DeviceRow,
  fetchLibraryMe,
  LibraryMe,
  listLibraryDevices,
  logoutLibrary,
  revokeLibraryDevice,
  rotateLibraryDevice,
  setLibraryDeviceSecurity,
  updateLibraryStore,
} from '@/lib/library-api';
import { clearLibraryToken, getLibraryToken } from '@/lib/library-session';

export default function LibraryDashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<LibraryMe | null>(null);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const [meData, devicesData] = await Promise.all([fetchLibraryMe(), listLibraryDevices()]);
    if (!meData.onboarding_complete) {
      router.replace('/');
      return;
    }
    setMe(meData);
    setDevices(devicesData.devices);
  }, [router]);

  useEffect(() => {
    if (!getLibraryToken()) {
      router.replace('/');
      return;
    }
    refresh().catch(() => {
      clearLibraryToken();
      router.replace('/');
    });
  }, [refresh, router]);

  async function onCreateDevice(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    try {
      const res = await createLibraryDevice(String(fd.get('name') || 'جهاز الكاونتر'));
      setNewToken(res.device_token);
      setNotice(res.message);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل');
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
      await setLibraryDeviceSecurity(pass, String(fd.get('device_confirm_phone')));
      setNotice('تم تحديث أمان الجهاز');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل');
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
      await updateLibraryStore({
        name: String(fd.get('name')),
        phone: String(fd.get('phone') || ''),
        governorate: String(fd.get('governorate')),
        wilayat: String(fd.get('wilayat')),
        address: String(fd.get('address')),
      });
      setNotice('تم الحفظ');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل');
    } finally {
      setLoading(false);
    }
  }

  if (!me) {
    return (
      <main className="shell-home flex min-h-dvh items-center justify-center text-sm text-text-muted">
        جاري التحميل…
      </main>
    );
  }

  const statusLabel: Record<string, string> = {
    connected: 'متصل',
    disconnected: 'غير متصل',
    revoked: 'ملغى',
  };

  return (
    <main className="shell-home min-h-dvh">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold text-primary">إدارة المكتبة</p>
            <h1 className="text-xl font-bold">{me.store.name}</h1>
          </div>
          <div className="flex gap-2">
            <a href={me.store.customer_shop_path} className="btn-outline !py-2 !text-sm">
              فتح المتجر
            </a>
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                await logoutLibrary();
                clearLibraryToken();
                router.replace('/');
              }}
            >
              خروج
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {(error || notice) && (
          <div className={`rounded-xl px-4 py-3 text-sm ${error ? 'bg-red-50 text-error' : 'bg-accent text-primary'}`}>
            {error || notice}
          </div>
        )}

        {newToken && (
          <div className="card border-primary/20 p-4">
            <p className="text-sm font-semibold">رمز الجهاز (مرة واحدة)</p>
            <p className="mt-2 break-all font-mono text-xs" dir="ltr">
              {newToken}
            </p>
          </div>
        )}

        <section className="card p-5">
          <h2 className="mb-3 text-lg font-bold">ربط الجهاز</h2>
          <p className="mb-3 text-sm text-text-muted">
            في التطبيق: معرّف <span dir="ltr">{me.store.slug}</span> + كلمة مرور الجهاز + رمز SMS.
          </p>
          <form onSubmit={onCreateDevice} className="flex flex-wrap gap-2">
            <input name="name" className="input-field flex-1" defaultValue="جهاز الكاونتر" />
            <button type="submit" className="btn-primary" disabled={loading}>
              إنشاء رمز
            </button>
          </form>
          <ul className="mt-4 divide-y divide-border">
            {devices.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-medium">
                  {d.name} · {statusLabel[d.status] ?? d.status}
                </span>
                {d.status !== 'revoked' && (
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className="btn-ghost !py-1 !text-xs"
                      onClick={async () => {
                        const res = await rotateLibraryDevice(d.id);
                        setNewToken(res.device_token);
                        await refresh();
                      }}
                    >
                      تجديد
                    </button>
                    <button
                      type="button"
                      className="btn-ghost !py-1 !text-xs text-error"
                      onClick={async () => {
                        await revokeLibraryDevice(d.id);
                        await refresh();
                      }}
                    >
                      إلغاء
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <form onSubmit={onSaveStore} className="card space-y-3 p-5">
          <h2 className="text-lg font-bold">بيانات المكتبة</h2>
          <input name="name" className="input-field" defaultValue={me.store.name} required />
          <input name="phone" className="input-field" dir="ltr" defaultValue={me.store.phone ?? ''} />
          <div className="grid grid-cols-2 gap-2">
            <input name="governorate" className="input-field" defaultValue={me.store.governorate ?? ''} required />
            <input name="wilayat" className="input-field" defaultValue={me.store.wilayat ?? ''} required />
          </div>
          <input name="address" className="input-field" defaultValue={me.store.address ?? ''} required />
          <button type="submit" className="btn-primary" disabled={loading}>
            حفظ
          </button>
        </form>

        <form onSubmit={onSaveSecurity} className="card space-y-3 p-5">
          <h2 className="text-lg font-bold">أمان الجهاز</h2>
          <input name="device_password" type="password" className="input-field" required minLength={6} dir="ltr" placeholder="كلمة مرور جديدة" />
          <input name="device_password_confirm" type="password" className="input-field" required minLength={6} dir="ltr" placeholder="تأكيد" />
          <input
            name="device_confirm_phone"
            className="input-field"
            required
            dir="ltr"
            defaultValue={me.store.device_confirm_phone ?? ''}
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            تحديث
          </button>
        </form>
      </div>
    </main>
  );
}
