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
    <div className="page-shell page-shell-wide shell-home">
      <div className="page-content flex min-h-0 flex-col">
        <header className="shrink-0 border-b border-border/70 bg-surface/95 px-4 py-4 backdrop-blur-sm sm:px-6 lg:px-8">
          {/* One composition: brand · search · CTA */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
            <Link href="/" className="flex shrink-0 items-center gap-3 self-center md:self-auto">
              <TibaaBrand variant="icon" size="sm" className="!h-12 !w-12" />
              <div className="text-start leading-tight">
                <p className="text-lg font-extrabold tracking-tight text-primary sm:text-xl">
                  {TIBAA.nameAr}
                </p>
                <p className="text-sm font-bold text-teal">{TIBAA.nameEn}</p>
                <p className="mt-0.5 hidden text-xs text-text-muted sm:block">{TIBAA.taglineAr}</p>
              </div>
            </Link>

            <label className="relative block min-w-0 flex-1">
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

            <Link
              href="/onboarding"
              className="btn-primary btn-compact w-full shrink-0 text-center md:w-auto md:min-w-[11rem]"
            >
              إعداد مكتبة جديدة
            </Link>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-text sm:text-lg">المكتبات</h2>
              <p className="mt-0.5 text-xs text-text-muted sm:text-sm">
                اختر مكتبة لبدء طلب الطباعة
              </p>
            </div>
            {!loading ? (
              <p className="text-xs text-text-muted tabular-nums sm:text-sm">{stores.length} مكتبة</p>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[5.5rem] animate-pulse rounded-2xl border border-border bg-surface"
                />
              ))}
            </div>
          ) : stores.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/70 py-16 text-center">
              <Store className="mx-auto size-10 text-text-muted/50" />
              <p className="mt-3 text-sm font-medium text-text">لا توجد مكتبات مطابقة</p>
              <p className="mt-1 text-xs text-text-muted">جرّب بحثاً آخر أو سجّل مكتبتك</p>
              <Link href="/onboarding" className="btn-outline btn-compact mt-4 inline-flex">
                إعداد مكتبة جديدة
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {stores.map((store, i) => (
                <li
                  key={store.slug}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                >
                  <Link
                    href={`/${store.slug}`}
                    className="flex h-full items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3.5 shadow-sm transition-all hover:border-primary/25 hover:bg-accent/40 hover:shadow-md"
                  >
                    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background sm:size-16">
                      {store.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={store.logo_url}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <Store className="size-6 text-primary/70" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-start">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-text sm:text-base">{store.name}</p>
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
                        <p className="mt-1 flex items-center gap-1 text-xs text-text-muted sm:text-sm">
                          <MapPin className="size-3.5 shrink-0" />
                          <span className="line-clamp-2">{store.location_label}</span>
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-text-muted" dir="ltr">
                          /{store.slug}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>

        <footer className="shrink-0 border-t border-border/70 bg-surface/95 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-start">
            <p className="text-xs text-text-muted sm:text-sm">
              {TIBAA.nameAr} · {TIBAA.nameEn}
            </p>
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs sm:text-sm">
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
