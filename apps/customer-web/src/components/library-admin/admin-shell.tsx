'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import {
  CreditCard,
  Home,
  LogOut,
  MonitorSmartphone,
  Receipt,
  Settings,
  Tags,
} from 'lucide-react';
import { fetchLibraryMe, LibraryMe, logoutLibrary } from '@/lib/library-api';
import { clearLibraryToken, getLibraryToken } from '@/lib/library-session';
import { StoreBrand } from '@/components/library-admin/store-brand';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/library/dashboard', label: 'الرئيسية', icon: Home },
  { href: '/library/orders', label: 'الطلبات', icon: Receipt },
  { href: '/library/devices', label: 'الأجهزة', icon: MonitorSmartphone },
  { href: '/library/pricing', label: 'الأسعار', icon: Tags },
  { href: '/library/settings', label: 'الإعدادات', icon: Settings },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<LibraryMe | null>(null);
  const [booting, setBooting] = useState(true);
  const [shopHost, setShopHost] = useState('');

  useEffect(() => {
    setShopHost(window.location.host);
  }, []);

  useEffect(() => {
    if (!getLibraryToken()) {
      router.replace('/library');
      return;
    }
    fetchLibraryMe()
      .then((data) => {
        if (!data.onboarding_complete) {
          router.replace('/');
          return;
        }
        setMe(data);
        setBooting(false);
      })
      .catch(() => {
        clearLibraryToken();
        router.replace('/library');
      });
  }, [router]);

  async function onLogout() {
    await logoutLibrary();
    clearLibraryToken();
    router.replace('/library');
  }

  if (booting || !me) {
    return (
      <div className="admin-login-shell text-sm text-[var(--admin-text-muted,#8b9bb0)]">
        جاري التحميل…
      </div>
    );
  }

  const shopPath = me.store.customer_shop_path || `/${me.store.slug}`;
  const shopDisplay = shopHost
    ? `${shopHost}${shopPath}`.replace(/\/+$/, '')
    : shopPath.replace(/^\//, '');

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="space-y-2 border-b border-[var(--admin-border)] px-3 pb-3 pt-4">
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] px-2.5 py-2">
            <StoreBrand
              name={me.store.name}
              logoUrl={me.store.logo_url}
              shopHref={shopPath}
              shopDisplay={shopDisplay}
              size="sm"
              className="min-w-0"
            />
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 overflow-auto px-2.5 py-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('admin-nav-link', active && 'admin-nav-link-active')}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 border-t border-[var(--admin-border)] p-3">
          <div className="px-1 text-xs text-[var(--admin-text-muted)]">
            <p className="truncate font-medium text-[var(--admin-text-secondary)]">{me.user.name}</p>
            <p className="truncate" dir="ltr">
              {me.user.email}
            </p>
          </div>
          <button type="button" onClick={onLogout} className="admin-btn-ghost flex w-full items-center gap-2">
            <LogOut className="size-4" aria-hidden />
            خروج
          </button>
          <p className="flex items-center gap-1.5 px-1 text-[11px] text-[var(--admin-text-muted)]">
            <CreditCard className="size-3 opacity-60" aria-hidden />
            إدارة المكتبة · ليس لطلبات العملاء
          </p>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-main-scroll">{children}</div>
      </main>
    </div>
  );
}
