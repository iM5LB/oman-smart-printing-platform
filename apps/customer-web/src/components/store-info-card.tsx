'use client';

import { ExternalLink, MapPin, Navigation, Phone } from 'lucide-react';
import type { StorePublicInfo } from '@omsp/types';
import { formatTime12h } from '@/lib/time';

function displayAddress(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const cleaned = raw
    .replace(/[A-Za-z]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || cleaned.length < 3) {
    if (/qaboos|sultan/i.test(raw)) return 'شارع السلطان قابوس';
    return raw.trim();
  }
  return cleaned;
}

function mapEmbedUrl(lat: number, lng: number, zoom = 16): string {
  const q = encodeURIComponent(`${lat},${lng}`);
  return `https://maps.google.com/maps?q=${q}&z=${zoom}&hl=ar&output=embed`;
}

function mapsOpenUrl(lat: number, lng: number, label: string): string {
  const q = encodeURIComponent(label);
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}(${q})`;
}

export function StoreInfoCard({
  store,
  compact: _compact,
  fill = false,
}: {
  store: StorePublicInfo;
  compact?: boolean;
  fill?: boolean;
}) {
  const location = [store.governorate, store.wilayat].filter(Boolean).join(' · ');
  const address = displayAddress(store.address);
  const today = getTodayHours(store);
  const closeLabel = today ? formatTime12h(today.close_time) : null;
  const openLabel = store.is_open
    ? closeLabel
      ? `مفتوح حتى ${closeLabel}`
      : 'مفتوح الآن'
    : 'مغلق حالياً';

  const hasCoords =
    typeof store.latitude === 'number' &&
    typeof store.longitude === 'number' &&
    Number.isFinite(store.latitude) &&
    Number.isFinite(store.longitude);

  const placeLabel = [store.name, address, location].filter(Boolean).join(' — ');

  return (
    <div className={`store-info-card store-info-card-map${fill ? ' store-info-card-fill' : ''}`}>
      <div className="store-info-head">
        <p className="store-info-name">{store.name}</p>
        <span className={`status-pill ${store.is_open ? 'status-pill-open' : 'status-pill-closed'}`}>
          <span className={`status-dot ${store.is_open ? 'bg-success' : 'bg-error closed'}`} />
          {openLabel}
        </span>
      </div>

      {hasCoords ? (
        <div className="store-map-wrap">
          <iframe
            title={`موقع ${store.name}`}
            className="store-map-frame"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={mapEmbedUrl(store.latitude!, store.longitude!)}
          />
          <a
            href={mapsOpenUrl(store.latitude!, store.longitude!, placeLabel)}
            target="_blank"
            rel="noopener noreferrer"
            className="store-map-directions"
          >
            <Navigation className="size-3.5" />
            فتح في الخريطة
            <ExternalLink className="size-3" />
          </a>
        </div>
      ) : (
        <div className="store-map-fallback">
          <MapPin className="size-5 text-primary" />
          <p className="text-sm text-text-muted">الموقع غير متوفر على الخريطة بعد</p>
        </div>
      )}

      <div className="store-info-meta">
        {store.phone && (
          <a
            href={`tel:${store.phone}`}
            className="store-info-row store-info-phone-row unicode-bidi-isolate"
            dir="ltr"
          >
            <Phone className="store-info-icon" aria-hidden />
            <span>{store.phone}</span>
          </a>
        )}
        {(location || address) && (
          <p className="store-info-row store-info-location" dir="rtl">
            <MapPin className="store-info-icon" aria-hidden />
            <span>
              {location}
              {location && address ? ' · ' : ''}
              {address}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

function getOmanDayOfWeek(): number {
  const jsDay = new Date().getDay();
  return jsDay === 6 ? 0 : jsDay + 1;
}

function getTodayHours(store: StorePublicInfo) {
  const today = store.opening_hours.find((h) => h.day_of_week === getOmanDayOfWeek());
  if (!today || today.is_closed) return null;
  return today;
}
