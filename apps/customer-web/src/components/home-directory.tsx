'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useState } from 'react';
import { MapPin, Search, Store } from 'lucide-react';
import { listStores } from '@/lib/api';
import { TIBAA } from '@/lib/brand';
import { TibaaBrand } from '@/components/tibaa-brand';

type PublicStore = {
  slug: string;
  name: string;
  logo_url: string | null;
  location_label: string | null;
  is_open: boolean;
};

export function HomeDirectory() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [stores, setStores] = useState<PublicStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div className="page-shell shell-home">
      <div className="page-content flex min-h-0 flex-col">
        <header className="shrink-0 border-b border-border/70 bg-surface/80 px-4 pb-4 pt-5 backdrop-blur-sm">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
            <TibaaBrand variant="lockup" size="md" showTagline />
            <Link href="/onboarding" className="btn-primary btn-compact mt-1 w-full max-w-xs">
              إعداد مكتبة جديدة
            </Link>
          </div>

          <div className="mx-auto mt-5 max-w-2xl">
            <label className="relative block">
              <span className="sr-only">بحث عن مكتبة</span>
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالاسم أو المنطقة…"
                className="input-field w-full !ps-10"
                autoComplete="off"
              />
            </label>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="mx-auto max-w-2xl">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="text-base font-bold text-text">المكتبات</h2>
              {!loading ? (
                <p className="text-xs text-text-muted tabular-nums">{stores.length} مكتبة</p>
              ) : null}
            </div>

            {error ? (
              <p className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
                {error}
              </p>
            ) : null}

            {loading ? (
              <p className="py-10 text-center text-sm text-text-muted">جاري التحميل…</p>
            ) : stores.length === 0 ? (
              <div className="py-12 text-center">
                <Store className="mx-auto size-10 text-text-muted/50" />
                <p className="mt-3 text-sm font-medium text-text">لا توجد مكتبات مطابقة</p>
                <p className="mt-1 text-xs text-text-muted">جرّب بحثاً آخر أو سجّل مكتبتك</p>
              </div>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                {stores.map((store, i) => (
                  <li key={store.slug} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                    <Link
                      href={`/${store.slug}`}
                      className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
                        {store.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={store.logo_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <Store className="size-5 text-primary/70" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-start">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-text">{store.name}</p>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              store.is_open
                                ? 'bg-success/10 text-success'
                                : 'bg-text-muted/10 text-text-muted'
                            }`}
                          >
                            {store.is_open ? 'مفتوح' : 'مغلق'}
                          </span>
                        </div>
                        {store.location_label ? (
                          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-text-muted">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{store.location_label}</span>
                          </p>
                        ) : (
                          <p className="mt-0.5 text-xs text-text-muted" dir="ltr">
                            /{store.slug}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>

        <footer className="shrink-0 border-t border-border/70 bg-surface/90 px-4 py-3">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-start">
            <p className="text-xs text-text-muted">
              {TIBAA.nameAr} · {TIBAA.nameEn}
            </p>
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
              <Link href="/privacy" className="text-text-muted hover:text-primary">
                سياسة الخصوصية
              </Link>
              <Link href="/terms" className="text-text-muted hover:text-primary">
                الشروط والأحكام
              </Link>
              <Link href="/onboarding" className="font-medium text-teal hover:underline">
                للمكتبات
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
