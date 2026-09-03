'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { fetchLibraryMe, LibraryMe, updateLibraryStore } from '@/lib/library-api';
import { PageHeading } from '@/components/library-admin/page-heading';
import { StoreBrand } from '@/components/library-admin/store-brand';
import { PhoneInput } from '@/components/phone-input';

export default function LibrarySettingsPage() {
  const [me, setMe] = useState<LibraryMe | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setMe(await fetchLibraryMe());
  }, []);

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : 'فشل التحميل'));
  }, [refresh]);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    const fd = new FormData(e.currentTarget);
    try {
      await updateLibraryStore({
        name: String(fd.get('name')),
        phone: String(fd.get('phone') || ''),
        governorate: String(fd.get('governorate')),
        wilayat: String(fd.get('wilayat')),
        area: String(fd.get('area') || ''),
        address: String(fd.get('address')),
        latitude: String(fd.get('latitude') || '') ? Number(fd.get('latitude')) : null,
        longitude: String(fd.get('longitude') || '') ? Number(fd.get('longitude')) : null,
      });
      setNotice('تم حفظ بيانات المكتبة');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  }

  if (!me) {
    return <p className="text-sm text-[var(--admin-text-muted)]">جاري التحميل…</p>;
  }

  return (
    <div>
      <PageHeading
        icon={<Settings className="size-5" />}
        title="الإعدادات"
        description="بيانات المكتبة وموقعها ورابط العملاء"
        actions={
          <a
            href={me.store.customer_shop_path}
            className="admin-btn-ghost"
            target="_blank"
            rel="noreferrer"
          >
            فتح المتجر
          </a>
        }
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

      <div className="mb-4 admin-card px-4 py-3 text-sm text-[var(--admin-text-secondary)]">
        <p>
          حساب الإدارة:{' '}
          <span className="font-medium text-[var(--admin-text)]">{me.user.name}</span>
        </p>
        <p className="mt-1" dir="ltr">
          {me.user.email}
        </p>
        <div className="mt-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] px-3 py-2">
          <StoreBrand
            name={me.store.name}
            logoUrl={me.store.logo_url}
            size="sm"
          />
        </div>
        <p className="mt-3 text-xs text-[var(--admin-text-muted)]">رابط العملاء</p>
        <div className="mt-1 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] px-3 py-2">
          <a
            href={me.store.customer_shop_path}
            className="block truncate text-xs text-[var(--admin-info)] underline-offset-2 hover:underline"
            dir="ltr"
          >
            {typeof window !== 'undefined'
              ? `${window.location.host}${me.store.customer_shop_path}`.replace(/\/+$/, '')
              : (me.store.customer_shop_path || `/${me.store.slug}`).replace(/^\//, '')}
          </a>
        </div>
      </div>

      <form onSubmit={onSave} className="admin-card max-w-2xl space-y-3 p-5">
        <h2 className="font-semibold">بيانات وموقع المكتبة</h2>
        <div>
          <label className="mb-1.5 block text-sm text-[var(--admin-text-secondary)]" htmlFor="name">
            الاسم
          </label>
          <input id="name" name="name" className="admin-input" required defaultValue={me.store.name} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-[var(--admin-text-secondary)]" htmlFor="phone">
            الهاتف
          </label>
          <PhoneInput id="phone" name="phone" defaultValue={me.store.phone ?? ''} showError />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              className="mb-1.5 block text-sm text-[var(--admin-text-secondary)]"
              htmlFor="governorate"
            >
              المحافظة
            </label>
            <input
              id="governorate"
              name="governorate"
              className="admin-input"
              required
              defaultValue={me.store.governorate ?? ''}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-[var(--admin-text-secondary)]" htmlFor="wilayat">
              الولاية
            </label>
            <input
              id="wilayat"
              name="wilayat"
              className="admin-input"
              required
              defaultValue={me.store.wilayat ?? ''}
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-[var(--admin-text-secondary)]" htmlFor="area">
            المنطقة
          </label>
          <input id="area" name="area" className="admin-input" defaultValue={me.store.area ?? ''} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-[var(--admin-text-secondary)]" htmlFor="address">
            العنوان
          </label>
          <input
            id="address"
            name="address"
            className="admin-input"
            required
            defaultValue={me.store.address ?? ''}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm text-[var(--admin-text-secondary)]" htmlFor="latitude">
              خط العرض
            </label>
            <input
              id="latitude"
              name="latitude"
              className="admin-input"
              dir="ltr"
              defaultValue={me.store.latitude ?? ''}
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm text-[var(--admin-text-secondary)]"
              htmlFor="longitude"
            >
              خط الطول
            </label>
            <input
              id="longitude"
              name="longitude"
              className="admin-input"
              dir="ltr"
              defaultValue={me.store.longitude ?? ''}
            />
          </div>
        </div>
        <button type="submit" className="admin-btn-primary" disabled={loading}>
          حفظ
        </button>
      </form>
    </div>
  );
}
