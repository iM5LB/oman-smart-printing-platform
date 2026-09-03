'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { MonitorSmartphone } from 'lucide-react';
import {
  createLibraryDevice,
  DeviceRow,
  fetchLibraryMe,
  LibraryMe,
  listLibraryDevices,
  revokeLibraryDevice,
  rotateLibraryDevice,
  setLibraryDeviceSecurity,
} from '@/lib/library-api';
import { PageHeading } from '@/components/library-admin/page-heading';
import { PhoneInput } from '@/components/phone-input';

const statusLabel: Record<string, string> = {
  connected: 'متصل',
  disconnected: 'غير متصل',
  revoked: 'ملغى',
};

export default function LibraryDevicesPage() {
  const [me, setMe] = useState<LibraryMe | null>(null);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const [meData, devicesData] = await Promise.all([fetchLibraryMe(), listLibraryDevices()]);
    setMe(meData);
    setDevices(devicesData.devices);
  }, []);

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : 'فشل التحميل'));
  }, [refresh]);

  async function onCreateDevice(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    const fd = new FormData(e.currentTarget);
    try {
      const res = await createLibraryDevice(String(fd.get('name') || 'جهاز الكاونتر'));
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
      e.currentTarget.reset();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeading
        icon={<MonitorSmartphone className="size-5" />}
        title="الأجهزة"
        description="ربط وإدارة أجهزة تطبيق الكاونتر"
      />

      {(error || notice) && (
        <div
          className={`admin-card mb-4 px-4 py-3 text-sm ${
            error ? 'text-[var(--admin-danger)]' : 'text-[var(--admin-success)]'
          }`}
        >
          {error || notice}
        </div>
      )}

      {newToken && (
        <div className="admin-card mb-4 border-[var(--admin-warning)]/40 px-4 py-4">
          <p className="text-sm font-semibold text-[var(--admin-warning)]">رمز الجهاز (يظهر مرة واحدة)</p>
          <p className="mt-2 break-all font-mono text-xs text-[var(--admin-text)]" dir="ltr">
            {newToken}
          </p>
          <button
            type="button"
            className="admin-btn-ghost mt-3"
            onClick={() => navigator.clipboard.writeText(newToken)}
          >
            نسخ
          </button>
        </div>
      )}

      <div className="mb-4 admin-card space-y-3 p-5">
        <h2 className="font-semibold">ربط تطبيق سطح المكتب</h2>
        <ol className="list-decimal space-y-1.5 pr-5 text-sm text-[var(--admin-text-muted)]">
          <li>
            معرّف المكتبة:{' '}
            <span className="font-mono text-[var(--admin-text)]" dir="ltr">
              {me?.store.slug ?? '—'}
            </span>
          </li>
          <li>أدخل كلمة مرور الجهاز المضبوطة أدناه</li>
          <li>
            سيصل رمز تأكيد إلى{' '}
            <span className="unicode-bidi-isolate font-mono text-[var(--admin-text)]" dir="ltr">
              {me?.store.device_confirm_phone || 'رقم التأكيد'}
            </span>
          </li>
          <li>أو أنشئ رمزاً يدوياً والصقه في التطبيق</li>
        </ol>
        <form onSubmit={onCreateDevice} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <label className="mb-1.5 block text-sm text-[var(--admin-text-secondary)]" htmlFor="name">
              اسم الجهاز
            </label>
            <input
              id="name"
              name="name"
              className="admin-input"
              defaultValue="جهاز الكاونتر"
              placeholder="جهاز الكاونتر"
            />
          </div>
          <button type="submit" className="admin-btn-primary" disabled={loading}>
            إنشاء رمز جهاز
          </button>
        </form>
      </div>

      <div className="mb-4 admin-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--admin-bg-elevated)] text-[var(--admin-text-muted)]">
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
                <td colSpan={4} className="px-4 py-8 text-center text-[var(--admin-text-muted)]">
                  لا أجهزة بعد — اربط من التطبيق أو أنشئ رمزاً
                </td>
              </tr>
            )}
            {devices.map((d) => (
              <tr key={d.id} className="border-t border-[var(--admin-border)]">
                <td className="px-4 py-3 font-medium">{d.name}</td>
                <td className="px-4 py-3">{statusLabel[d.status] ?? d.status}</td>
                <td className="px-4 py-3 text-[var(--admin-text-muted)]" dir="ltr">
                  {d.last_connected_at
                    ? new Date(d.last_connected_at).toLocaleString('ar-OM')
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  {d.status !== 'revoked' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="admin-btn-ghost"
                        disabled={loading}
                        onClick={async () => {
                          setLoading(true);
                          try {
                            const res = await rotateLibraryDevice(d.id);
                            setNewToken(res.device_token);
                            setNotice(res.message);
                            await refresh();
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'فشل التجديد');
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        تجديد الرمز
                      </button>
                      <button
                        type="button"
                        className="admin-btn-ghost !text-[var(--admin-danger)]"
                        disabled={loading}
                        onClick={async () => {
                          if (!confirm('إلغاء صلاحية هذا الجهاز؟')) return;
                          setLoading(true);
                          try {
                            await revokeLibraryDevice(d.id);
                            await refresh();
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'فشل الإلغاء');
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        إلغاء
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={onSaveSecurity} className="admin-card space-y-3 p-5">
        <h2 className="font-semibold">أمان ربط الجهاز</h2>
        <p className="text-sm text-[var(--admin-text-muted)]">
          كلمة المرور ورقم استلام رمز التأكيد عند ربط الكاونتر
        </p>
        <div>
          <label className="mb-1.5 block text-sm text-[var(--admin-text-secondary)]" htmlFor="device_password">
            كلمة مرور جديدة
          </label>
          <input
            id="device_password"
            name="device_password"
            type="password"
            className="admin-input"
            required
            minLength={6}
            dir="ltr"
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-sm text-[var(--admin-text-secondary)]"
            htmlFor="device_password_confirm"
          >
            تأكيد
          </label>
          <input
            id="device_password_confirm"
            name="device_password_confirm"
            type="password"
            className="admin-input"
            required
            minLength={6}
            dir="ltr"
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-sm text-[var(--admin-text-secondary)]"
            htmlFor="device_confirm_phone"
          >
            رقم استلام الرمز
          </label>
          <PhoneInput
            id="device_confirm_phone"
            name="device_confirm_phone"
            required
            showError
            defaultValue={me?.store.device_confirm_phone ?? ''}
          />
        </div>
        <button type="submit" className="admin-btn-primary" disabled={loading}>
          تحديث الأمان
        </button>
      </form>
    </div>
  );
}
