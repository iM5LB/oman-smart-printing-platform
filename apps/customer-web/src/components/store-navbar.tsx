'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, ClipboardList, DoorOpen, UserRound } from 'lucide-react';
import type { StorePublicInfo } from '@omsp/types';
import { CustomerAuthPanel } from '@/components/customer-auth-panel';
import {
  clearCustomerSession,
  getCustomerPhone,
  getCustomerToken,
  isLoggedIn,
} from '@/lib/customer-session';
import { logoutCustomer } from '@/lib/api';

type AuthView = 'login' | 'orders' | null;

export function StoreNavbar({ store }: { store: StorePublicInfo }) {
  const [authView, setAuthView] = useState<AuthView>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const refreshSession = () => {
    const ok = isLoggedIn();
    setLoggedIn(ok);
    setPhone(ok ? getCustomerPhone() : null);
  };

  useEffect(() => {
    refreshSession();
  }, [authView]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    const token = getCustomerToken();
    if (token) {
      try {
        await logoutCustomer(token);
      } catch {
        /* ignore */
      }
    }
    clearCustomerSession();
    refreshSession();
  }

  function onPersonClick() {
    if (!loggedIn) {
      setAuthView('login');
      return;
    }
    setMenuOpen((v) => !v);
  }

  return (
    <>
      <nav className="store-navbar relative z-50 shrink-0">
        <div className="store-navbar-brand">
          {store.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logo_url}
              alt=""
              className="size-9 shrink-0 rounded-xl border border-border object-cover"
            />
          ) : (
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
              <BookOpen className="size-5" />
            </div>
          )}
          <h1 className="truncate text-sm font-bold text-text sm:text-base">{store.name}</h1>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label={loggedIn ? 'حسابي' : 'تسجيل الدخول'}
            aria-expanded={menuOpen}
            onClick={onPersonClick}
            className="nav-icon-btn relative"
          >
            <UserRound className="size-5" />
            {loggedIn && <span className="nav-user-dot" />}
          </button>

          {menuOpen && loggedIn && (
            <div className="account-dropdown" role="menu">
              {phone && (
                <div className="account-dropdown-phone" dir="ltr">
                  {phone}
                </div>
              )}
              <button
                type="button"
                role="menuitem"
                className="account-dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  setAuthView('orders');
                }}
              >
                <ClipboardList className="size-4" aria-hidden />
                <span>طلباتي</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="account-dropdown-item account-dropdown-logout"
                onClick={() => void handleLogout()}
              >
                <DoorOpen className="size-4" aria-hidden />
                <span>خروج</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      <CustomerAuthPanel
        storeSlug={store.slug}
        open={authView !== null}
        initialMode={authView === 'orders' ? 'orders' : 'phone'}
        onClose={() => {
          setAuthView(null);
          refreshSession();
        }}
        onSessionChange={refreshSession}
      />
    </>
  );
}
