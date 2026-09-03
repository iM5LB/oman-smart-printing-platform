'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { fetchLibraryMe, loginLibrary } from '@/lib/library-api';
import { clearLibraryToken, getLibraryToken, setLibraryToken } from '@/lib/library-session';
import { TIBAA } from '@/lib/brand';
import { TibaaBrand } from '@/components/tibaa-brand';

export default function LibraryLoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getLibraryToken();
    if (!token) {
      setChecking(false);
      return;
    }
    fetchLibraryMe()
      .then((me) => {
        router.replace(me.onboarding_complete ? '/library/dashboard' : '/');
      })
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
      router.replace(res.onboarding_complete ? '/library/dashboard' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الدخول');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="admin-login-shell text-sm text-[#8b9bb0]">جاري التحميل…</div>
    );
  }

  return (
    <div className="admin-login-shell">
      <div className="w-full max-w-md rounded-2xl border border-[#243044] bg-[#121826] p-6 shadow-xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mb-3 flex justify-center">
            <TibaaBrand variant="icon" size="lg" />
          </div>
          <p className="text-2xl font-extrabold text-[#f1f5f9]">{TIBAA.nameAr}</p>
          <p className="text-sm font-semibold text-[#38bdf8]">{TIBAA.nameEn}</p>
          <h1 className="mt-4 text-xl font-bold text-[#f1f5f9]">دخول إدارة المكتبة</h1>
          <p className="mt-2 text-sm text-[#8b9bb0]">
            لوحة سطح المكتب لإدارة الطلبات والأجهزة والأسعار
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#b6c2d4]" htmlFor="email">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="admin-input"
              required
              dir="ltr"
              autoComplete="username"
              placeholder="admin@store.tibaa.local"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#b6c2d4]" htmlFor="password">
              كلمة المرور
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[#8b9bb0]"
                aria-hidden
              />
              <input
                id="password"
                name="password"
                type="password"
                className="admin-input !ps-10"
                required
                minLength={8}
                dir="ltr"
                autoComplete="current-password"
              />
            </div>
          </div>

          {error ? (
            <p className="text-sm text-[#ef4444]" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="admin-btn-primary w-full py-3" disabled={loading}>
            {loading ? 'جارٍ…' : 'دخول'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-[#8b9bb0]">
          إعداد مكتبة جديدة؟{' '}
          <a href="/" className="text-[#38bdf8] underline-offset-2 hover:underline">
            ابدأ من هنا
          </a>
        </p>
      </div>
    </div>
  );
}
