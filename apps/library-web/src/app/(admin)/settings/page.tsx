'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { fetchMe, getCustomerShopBase, MeResponse, updateStore } from '@/lib/api';
import { PhoneInput } from '@/components/phone-input';
import { StoreBrand } from '@/components/store-brand';

export default function SettingsPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setMe(await fetchMe());
  }, []);

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : 'فشل'));
  }, [refresh]);

  async function onSave(e: FormEvent<HTMLFormElement>) {
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
        latitude: String(fd.get('latitude') || '') ? Number(fd.get('latitude')) : null,
        longitude: String(fd.get('longitude') || '') ? Number(fd.get('longitude')) : null,
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
    return <p className="text-sm text-text-muted">جاري التحميل…</p>;
  }

  const shopUrl = `${getCustomerShopBase()}${me.store.customer_shop_path}`;

  return (
    <div className="animate-fade-in-up space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">الإعدادات</h1>
        <a href={shopUrl} target="_blank" rel="noreferrer" className="btn-ghost text-sm">
          فتح متجر العملاء
        </a>
      </div>
      {(error || notice) && (
        <div className={`card px-4 py-3 text-sm ${error ? 'text-danger' : 'text-success'}`}>
          {error || notice}
        </div>
      )}
      <div className="card px-4 py-3 text-sm text-text-secondary">
        <p>
          الحساب: <span className="text-text-primary">{me.user.name}</span>
        </p>
        <p className="mt-1" dir="ltr">
          {me.user.email}
        </p>
        <div className="mt-3 rounded-xl border border-border-default bg-bg-elevated px-3 py-2">
          <StoreBrand
            name={me.store.name}
            logoUrl={me.store.logo_url}
            shopUrl={shopUrl}
            size="sm"
          />
        </div>
      </div>
      <form onSubmit={onSave} className="card max-w-2xl space-y-3 p-5">
        <input name="name" className="input-field" required defaultValue={me.store.name} />
        <PhoneInput name="phone" defaultValue={me.store.phone ?? ''} showError />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="governorate"
            className="input-field"
            required
            defaultValue={me.store.governorate ?? ''}
            placeholder="المحافظة"
          />
          <input
            name="wilayat"
            className="input-field"
            required
            defaultValue={me.store.wilayat ?? ''}
            placeholder="الولاية"
          />
        </div>
        <input name="area" className="input-field" defaultValue={me.store.area ?? ''} placeholder="المنطقة" />
        <input
          name="address"
          className="input-field"
          required
          defaultValue={me.store.address ?? ''}
          placeholder="العنوان"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="latitude"
            className="input-field"
            dir="ltr"
            defaultValue={me.store.latitude ?? ''}
            placeholder="خط العرض"
          />
          <input
            name="longitude"
            className="input-field"
            dir="ltr"
            defaultValue={me.store.longitude ?? ''}
            placeholder="خط الطول"
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          حفظ
        </button>
      </form>
    </div>
  );
}
