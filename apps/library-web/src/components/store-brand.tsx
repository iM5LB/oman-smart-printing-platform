/** Logged-in library/store brand for dashboard chrome (not platform Tibaa). */

'use client';

import { useEffect, useState } from 'react';
import { formatCleanUrl, resolveStoreLogoUrl } from '@/lib/api';

function storeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'م';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

export function StoreBrand({
  name,
  logoUrl,
  subtitle,
  shopUrl,
  size = 'sm',
  className = '',
}: {
  name: string;
  logoUrl?: string | null;
  subtitle?: string;
  /** Public shop URL under the store name (clickable). */
  shopUrl?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const icon = size === 'sm' ? 'h-12 w-12' : 'h-14 w-14';
  const display = name.trim() || 'المكتبة';
  const resolved = resolveStoreLogoUrl(logoUrl);
  const [broken, setBroken] = useState(false);
  const cleanUrl = shopUrl ? formatCleanUrl(shopUrl) : '';

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
          className={`${icon} shrink-0 rounded-2xl bg-white object-contain p-1 ring-1 ring-black/5`}
          onError={() => setBroken(true)}
        />
      ) : (
        <div
          className={`${icon} flex shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-sm font-bold text-primary ring-1 ring-primary/20`}
          aria-hidden
        >
          {storeInitials(display)}
        </div>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold text-primary">{display}</h1>
        {cleanUrl ? (
          <a
            href={shopUrl!}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 block truncate text-xs text-info hover:underline"
            dir="ltr"
          >
            {cleanUrl}
          </a>
        ) : subtitle ? (
          <p className="truncate text-xs text-text-muted">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
