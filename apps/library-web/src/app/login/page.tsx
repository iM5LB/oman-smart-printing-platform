'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginLibrary, registerLibrary } from '@/lib/api';
import { setLibraryToken } from '@/lib/session';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    try {
      if (mode === 'login') {
        const res = await loginLibrary(String(fd.get('email')), String(fd.get('password')));
        setLibraryToken(res.token);
        router.replace(res.onboarding_complete ? '/dashboard' : '/onboarding');
      } else {
        const res = await registerLibrary({
          email: String(fd.get('email')),
          password: String(fd.get('password')),
          owner_name: String(fd.get('owner_name')),
          store_name: String(fd.get('store_name')),
          store_slug: String(fd.get('store_slug') || '') || undefined,
          phone: String(fd.get('phone') || '') || undefined,
        });
        setLibraryToken(res.token);
        router.replace('/onboarding');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الدخول');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shell flex min-h-dvh items-center justify-center p-4">
      <div className="card w-full max-w-md animate-fade-in-up p-6 sm:p-8">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold tracking-wide text-gold">منصة الطباعة الذكية</p>
          <h1 className="mt-1 text-2xl font-bold text-primary">لوحة المكتبة</h1>
          <p className="mt-2 text-sm text-text-muted">
            إعداد المكتبة وربط أجهزة التطبيق — ليس لطلبات العملاء
          </p>
        </div>

        <div className="mb-5 flex rounded-xl border border-border bg-background p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              mode === 'login' ? 'bg-primary text-white' : 'text-text-muted'
            }`}
            onClick={() => setMode('login')}
          >
            دخول
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              mode === 'register' ? 'bg-primary text-white' : 'text-text-muted'
            }`}
            onClick={() => setMode('register')}
          >
            تسجيل مكتبة
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === 'register' && (
            <>
              <div>
                <label className="label" htmlFor="owner_name">
                  اسم المالك
                </label>
                <input id="owner_name" name="owner_name" className="input-field" required />
              </div>
              <div>
                <label className="label" htmlFor="store_name">
                  اسم المكتبة
                </label>
                <input id="store_name" name="store_name" className="input-field" required />
              </div>
              <div>
                <label className="label" htmlFor="store_slug">
                  معرّف الرابط (اختياري، إنجليزي)
                </label>
                <input
                  id="store_slug"
                  name="store_slug"
                  className="input-field"
                  placeholder="al-noor"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="label" htmlFor="phone">
                  هاتف المكتبة
                </label>
                <input
                  id="phone"
                  name="phone"
                  className="input-field"
                  placeholder="+9689xxxxxxx"
                  dir="ltr"
                />
              </div>
            </>
          )}

          <div>
            <label className="label" htmlFor="email">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="input-field"
              required
              dir="ltr"
              defaultValue={mode === 'login' ? 'owner@al-noor.om' : ''}
            />
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
              defaultValue={mode === 'login' ? 'admin1234' : ''}
            />
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'جارٍ…' : mode === 'login' ? 'دخول' : 'إنشاء ومتابعة الإعداد'}
          </button>
        </form>

        {mode === 'login' && (
          <p className="mt-4 text-center text-xs text-text-muted">
            تجريبي: owner@al-noor.om / admin1234
          </p>
        )}
      </div>
    </div>
  );
}
