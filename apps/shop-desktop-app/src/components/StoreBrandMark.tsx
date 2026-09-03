/** Logged-in store brand for sidebar chrome (not platform Tibaa). */

import { useEffect, useState } from "react";
import { formatCleanUrl, resolveStoreLogoUrl } from "../lib/api";

export function storeInitials(name: string): string {
  const parts = name
    .trim()
    .split(/[\s\-–—_/|]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^[-–—]+$/.test(p));
  if (parts.length === 0) return "م";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
}

export function StoreBrandMark({
  name,
  logoUrl,
  shopUrl,
  onShopUrlClick,
  size = "sm",
  className = "",
}: {
  name: string;
  logoUrl?: string | null;
  /** Public shop URL — shown under the store name (never alone). */
  shopUrl?: string | null;
  onShopUrlClick?: () => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const icon = size === "sm" ? "size-11" : "size-14";
  const title = size === "sm" ? "text-section" : "text-title";
  const display = name.trim() || "المكتبة";
  const cleanUrl = shopUrl ? formatCleanUrl(shopUrl) : "";
  const resolved = resolveStoreLogoUrl(logoUrl);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [resolved]);

  const showLogo = Boolean(resolved) && !broken;

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      {showLogo ? (
        <img
          src={resolved!}
          alt=""
          className={`${icon} shrink-0 rounded-2xl bg-white object-contain p-1 ring-1 ring-black/10`}
          onError={() => setBroken(true)}
        />
      ) : (
        <div
          className={`${icon} flex shrink-0 items-center justify-center rounded-2xl bg-primary/25 text-meta font-bold text-primary ring-1 ring-primary/20`}
          aria-hidden
        >
          {storeInitials(display)}
        </div>
      )}
      <div className="min-w-0">
        <p className={`truncate ${title} leading-tight`}>{display}</p>
        {cleanUrl ? (
          onShopUrlClick ? (
            <button
              type="button"
              onClick={onShopUrlClick}
              className="mt-0.5 block max-w-full truncate text-start text-caption text-info underline-offset-2 hover:underline"
              dir="ltr"
              title="عرض رمز QR للمسح"
            >
              {cleanUrl}
            </button>
          ) : (
            <a
              href={shopUrl!}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 block max-w-full truncate text-caption text-info underline-offset-2 hover:underline"
              dir="ltr"
            >
              {cleanUrl}
            </a>
          )
        ) : null}
      </div>
    </div>
  );
}
