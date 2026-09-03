'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMe, loginLibrary } from '@/lib/api';
import { clearLibraryToken, getLibraryToken, setLibraryToken } from '@/lib/session';
import { TIBAA } from '@/lib/brand';
import { TibaaBrand } from '@/components/tibaa-brand';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!getLibraryToken()) {
      setChecking(false);
      return;
    }
    fetchMe()
      .then((me) => router.replace(me.onboarding_complete ? '/dashboard' : '/onboarding'))
      .catch(() => {
        clearLibraryToken();
        setChecking(false);
      });
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await loginLibrary(String(fd.get('email')), String(fd.get('password')));
      setLibraryToken(res.token);
      router.replace(res.onboarding_complete ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الدخول');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="shell flex min-h-dvh items-center justify-center text-sm text-text-muted">
        جاري التحميل…
      </div>
    );
  }

  return (
    <div className="shell flex min-h-dvh items-center justify-center p-4">
      <div className="card w-full max-w-md animate-fade-in-up p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mb-3 flex justify-center">
            <TibaaBrand variant="icon" size="lg" />
          </div>
          <p className="text-2xl font-extrabold">{TIBAA.nameAr}</p>
          <p className="text-sm font-semibold text-info">{TIBAA.nameEn}</p>
          <h1 className="mt-4 text-xl font-bold">دخول إدارة المكتبة</h1>
          <p className="mt-2 text-sm text-text-muted">لوحة سطح المكتب — ليس لطلبات العملاء</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label" htmlFor="email">
              البريد الإلكتروني
            </label>
            <input id="email" name="email" type="email" className="input-field" required dir="ltr" />
          </div>
          <div>
            <label className="label" htmlFor="password">
              كلمة المرور
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
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'جارٍ…' : 'دخول'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-text-muted">
          إعداد مكتبة جديدة يتم من موقع العملاء بعد كلمة مرور الإعداد
        </p>
      </div>
    </div>
  );
}
