'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  createDevice,
  DeviceRow,
  fetchMe,
  listDevices,
  MeResponse,
  revokeDevice,
  rotateDevice,
  setDeviceSecurity,
} from '@/lib/api';
import { PhoneInput } from '@/components/phone-input';

export default function DevicesPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [newToken, setNewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const [m, d] = await Promise.all([fetchMe(), listDevices()]);
    setMe(m);
    setDevices(d.devices);
  }, []);

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : 'فشل'));
  }, [refresh]);

  return (
    <div className="animate-fade-in-up space-y-4">
      <h1 className="text-xl font-semibold">الأجهزة</h1>
      {(error || notice) && (
        <div className={`card px-4 py-3 text-sm ${error ? 'text-danger' : 'text-success'}`}>
          {error || notice}
        </div>
      )}
      {newToken && (
        <div className="card border-warning/40 p-4">
          <p className="text-sm font-semibold text-warning">رمز الجهاز (مرة واحدة)</p>
          <p className="mt-2 break-all font-mono text-xs" dir="ltr">
            {newToken}
          </p>
        </div>
      )}
      <form
        onSubmit={async (e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          setLoading(true);
          setError('');
          const fd = new FormData(e.currentTarget);
          try {
            const res = await createDevice(String(fd.get('name') || 'جهاز الكاونتر'));
            setNewToken(res.device_token);
            setNotice(res.message);
            await refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'فشل');
          } finally {
            setLoading(false);
          }
        }}
        className="card flex flex-wrap items-end gap-3 p-5"
      >
        <div className="min-w-[12rem] flex-1">
          <label className="label" htmlFor="name">
            اسم الجهاز
          </label>
          <input id="name" name="name" className="input-field" defaultValue="جهاز الكاونتر" />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          إنشاء رمز
        </button>
      </form>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-text-muted">
            <tr>
              <th className="px-4 py-3 text-start">الاسم</th>
              <th className="px-4 py-3 text-start">الحالة</th>
              <th className="px-4 py-3 text-start">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id} className="border-t border-border-default">
                <td className="px-4 py-3">{d.name}</td>
                <td className="px-4 py-3">{d.status}</td>
                <td className="px-4 py-3">
                  {d.status !== 'revoked' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-ghost !py-1.5 !text-xs"
                        onClick={async () => {
                          const res = await rotateDevice(d.id);
                          setNewToken(res.device_token);
                          await refresh();
                        }}
                      >
                        تجديد
                      </button>
                      <button
                        type="button"
                        className="btn-ghost !py-1.5 !text-xs text-danger"
                        onClick={async () => {
                          await revokeDevice(d.id);
                          await refresh();
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
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          const fd = new FormData(e.currentTarget);
          try {
            await setDeviceSecurity(
              String(fd.get('device_password')),
              String(fd.get('device_confirm_phone')),
            );
            setNotice('تم تحديث الأمان');
            await refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'فشل');
          } finally {
            setLoading(false);
          }
        }}
        className="card space-y-3 p-5"
      >
        <h2 className="font-semibold">أمان الجهاز</h2>
        <input
          name="device_password"
          type="password"
          className="input-field"
          required
          minLength={6}
          dir="ltr"
          placeholder="كلمة مرور جديدة"
        />
        <PhoneInput
          name="device_confirm_phone"
          required
          showError
          defaultValue={me?.store.device_confirm_phone ?? ''}
          placeholder="رقم التأكيد"
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          تحديث
        </button>
      </form>
    </div>
  );
}
