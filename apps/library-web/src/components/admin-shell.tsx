'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import {
  Home,
  LogOut,
  MonitorSmartphone,
  Receipt,
  Settings,
  Tags,
} from 'lucide-react';
import { fetchMe, getCustomerShopBase, logoutLibrary, MeResponse } from '@/lib/api';
import { clearLibraryToken, getLibraryToken } from '@/lib/session';
import { StoreBrand } from '@/components/store-brand';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'الرئيسية', icon: Home },
  { href: '/orders', label: 'الطلبات', icon: Receipt },
  { href: '/devices', label: 'الأجهزة', icon: MonitorSmartphone },
  { href: '/pricing', label: 'الأسعار', icon: Tags },
  { href: '/settings', label: 'الإعدادات', icon: Settings },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    if (!getLibraryToken()) {
      router.replace('/login');
      return;
    }
    fetchMe()
      .then((data) => {
        if (!data.onboarding_complete) {
          router.replace('/onboarding');
          return;
        }
        setMe(data);
      })
      .catch(() => {
        clearLibraryToken();
        router.replace('/login');
      });
  }, [router]);

  if (!me) {
    return (
      <div className="shell flex min-h-dvh items-center justify-center text-sm text-text-muted">
        جاري التحميل…
      </div>
    );
  }

  const shopUrl = `${getCustomerShopBase()}${me.store.customer_shop_path}`;

  return (
    <div className="relative flex h-dvh overflow-hidden bg-bg-base text-text-primary">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 40% at 80% 0%, rgba(31,111,235,0.14), transparent 55%), radial-gradient(ellipse 40% 30% at 10% 100%, rgba(34,197,94,0.06), transparent 50%)',
        }}
      />
      <aside className="relative z-10 flex w-[260px] shrink-0 flex-col border-e border-border-default bg-bg-surface">
        <div dir="rtl" className="space-y-2 border-b border-border-default px-3 pb-3 pt-4">
          {/* Shop brand only — never platform Tibaa in logged-in chrome. */}
          <div className="rounded-xl border border-border-default bg-bg-elevated px-2.5 py-2">
            <StoreBrand
              name={me.store.name}
              logoUrl={me.store.logo_url}
              shopUrl={shopUrl}
              size="sm"
              className="min-w-0"
            />
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1.5 overflow-auto px-2.5 py-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3.5 py-3 text-base font-medium transition',
                  active
                    ? 'bg-primary text-white shadow-[0_6px_18px_rgba(31,111,235,0.35)]'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border-default p-3">
          <p className="truncate px-1 text-xs text-text-muted">{me.user.email}</p>
          <button
            type="button"
            className="btn-ghost mt-2 flex w-full items-center gap-2"
            onClick={async () => {
              await logoutLibrary();
              clearLibraryToken();
              router.replace('/login');
            }}
          >
            <LogOut className="size-4" />
            خروج
          </button>
        </div>
      </aside>
      <main className="relative z-10 min-w-0 flex-1 overflow-auto p-5">{children}</main>
    </div>
  );
}
