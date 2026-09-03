/** Logged-in library/store brand for admin chrome (not platform Tibaa). */

'use client';

import { useEffect, useState } from 'react';
import { getApiBase } from '@/lib/api';

function storeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'م';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

function resolveStoreLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl?.trim()) return null;
  const u = logoUrl.trim();
  if (/\/brand\/tibaa-/i.test(u) || /tibaa-(icon|logo)\.png/i.test(u)) {
    return null;
  }
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) {
    return u;
  }
  if (u.startsWith('/')) return `${getApiBase()}${u}`;
  return `${getApiBase()}/${u}`;
}

export function StoreBrand({
  name,
  logoUrl,
  shopDisplay,
  shopHref,
  size = 'sm',
  className = '',
}: {
  name: string;
  logoUrl?: string | null;
  shopDisplay?: string;
  shopHref?: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const icon = size === 'sm' ? 'h-10 w-10' : 'h-12 w-12';
  const display = name.trim() || 'المكتبة';
  const resolved = resolveStoreLogoUrl(logoUrl);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [resolved]);

  const showLogo = Boolean(resolved) && !broken;

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved!}
          alt=""
          className={`${icon} shrink-0 rounded-2xl bg-white object-contain p-1 ring-1 ring-black/10`}
          onError={() => setBroken(true)}
        />
      ) : (
        <div
          className={`${icon} flex shrink-0 items-center justify-center rounded-2xl bg-[var(--admin-primary,#1f6feb)]/20 text-xs font-bold text-[var(--admin-primary,#1f6feb)] ring-1 ring-[var(--admin-primary,#1f6feb)]/25`}
          aria-hidden
        >
          {storeInitials(display)}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-[var(--admin-text)]">{display}</p>
        {shopDisplay && shopHref ? (
          <a
            href={shopHref}
            className="mt-0.5 block truncate text-xs text-[var(--admin-info)] underline-offset-2 hover:underline"
            dir="ltr"
          >
            {shopDisplay}
          </a>
        ) : null}
      </div>
    </div>
  );
}
