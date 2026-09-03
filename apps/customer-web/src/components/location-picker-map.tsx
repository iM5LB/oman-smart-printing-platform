'use client';

import { useEffect, useId, useRef, useState } from 'react';
import L from 'leaflet';
import { Check, Crosshair, Loader2, MapPin, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const OMAN_CENTER: L.LatLngExpression = [23.588, 58.3829];
const DEFAULT_ZOOM = 12;

export type PickedLocation = {
  latitude: number;
  longitude: number;
  governorate?: string;
  wilayat?: string;
  area?: string;
  address?: string;
};

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  onPick: (loc: PickedLocation) => void;
};

function cleanPart(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/^محافظة\s+/u, '').replace(/^ولاية\s+/u, '').trim() || undefined;
}

async function reverseGeocode(lat: number, lng: number): Promise<Partial<PickedLocation>> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));
    url.searchParams.set('format', 'json');
    url.searchParams.set('accept-language', 'ar');
    url.searchParams.set('zoom', '18');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = data.address ?? {};
    const governorate = cleanPart(a.state || a.region || a.province);
    const wilayat = cleanPart(a.county || a.city || a.town || a.municipality);
    const area = cleanPart(a.suburb || a.neighbourhood || a.village || a.quarter);
    const road = [a.road, a.pedestrian, a.residential].filter(Boolean).join(' · ');
    const address =
      road ||
      area ||
      data.display_name?.split(',').slice(0, 2).join('، ') ||
      undefined;

    return { governorate, wilayat, area, address };
  } catch {
    return {};
  }
}

function pinIcon() {
  return L.divIcon({
    className: 'setup-map-pin',
    html: '<span class="setup-map-pin-dot"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

export function LocationPickerMap({ latitude, longitude, onPick }: Props) {
  const titleId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const draftRef = useRef<PickedLocation | null>(null);

  const [open, setOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [resolving, setResolving] = useState(false);
  const [draft, setDraft] = useState<PickedLocation | null>(null);

  const hasSaved = latitude != null && longitude != null;

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const timers: number[] = [];

    function destroyMap() {
      resizeObserver?.disconnect();
      resizeObserver = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    }

    async function commit(lat: number, lng: number) {
      setResolving(true);
      setGeoError('');
      const extra = await reverseGeocode(lat, lng);
      if (cancelled) return;
      setResolving(false);
      const next: PickedLocation = {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        ...extra,
      };
      draftRef.current = next;
      setDraft(next);
    }

    function ensureMarker(map: L.Map, lat: number, lng: number) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        return;
      }
      markerRef.current = L.marker([lat, lng], { icon: pinIcon(), draggable: true }).addTo(map);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current!.getLatLng();
        void commit(p.lat, p.lng);
      });
    }

    // Wait a frame so the overlay has real size before Leaflet init
    const boot = window.setTimeout(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      const hasInitial = latitude != null && longitude != null;
      const start: L.LatLngExpression = hasInitial ? [latitude!, longitude!] : OMAN_CENTER;

      const map = L.map(containerRef.current, {
        center: start,
        zoom: hasInitial ? 16 : DEFAULT_ZOOM,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      map.on('click', (e: L.LeafletMouseEvent) => {
        ensureMarker(map, e.latlng.lat, e.latlng.lng);
        void commit(e.latlng.lat, e.latlng.lng);
      });

      if (hasInitial) {
        ensureMarker(map, latitude!, longitude!);
        setDraft({
          latitude: Number(latitude!.toFixed(6)),
          longitude: Number(longitude!.toFixed(6)),
        });
      }

      mapRef.current = map;

      const invalidate = () => map.invalidateSize({ animate: false });
      timers.push(window.setTimeout(invalidate, 50));
      timers.push(window.setTimeout(invalidate, 250));
      requestAnimationFrame(invalidate);

      resizeObserver = new ResizeObserver(() => invalidate());
      resizeObserver.observe(containerRef.current);
    }, 30);

    timers.push(boot);

    return () => {
      cancelled = true;
      document.body.style.overflow = prevOverflow;
      timers.forEach((t) => window.clearTimeout(t));
      destroyMap();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError('المتصفح لا يدعم تحديد الموقع');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const map = mapRef.current;
        if (map) {
          map.flyTo([lat, lng], 17, { duration: 0.55 });
          if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
          else {
            markerRef.current = L.marker([lat, lng], { icon: pinIcon(), draggable: true }).addTo(map);
            markerRef.current.on('dragend', () => {
              const p = markerRef.current!.getLatLng();
              void (async () => {
                setResolving(true);
                const extra = await reverseGeocode(p.lat, p.lng);
                setResolving(false);
                const next: PickedLocation = {
                  latitude: Number(p.lat.toFixed(6)),
                  longitude: Number(p.lng.toFixed(6)),
                  ...extra,
                };
                draftRef.current = next;
                setDraft(next);
              })();
            });
          }
        }
        setResolving(true);
        const extra = await reverseGeocode(lat, lng);
        setResolving(false);
        const next: PickedLocation = {
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
          ...extra,
        };
        draftRef.current = next;
        setDraft(next);
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        setGeoError('تعذّر الوصول لموقعك. اسمح بالصلاحية أو اختر على الخريطة');
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  function openMap() {
    setGeoError('');
    setDraft(
      hasSaved
        ? {
            latitude: Number(latitude!.toFixed(6)),
            longitude: Number(longitude!.toFixed(6)),
          }
        : null,
    );
    setOpen(true);
  }

  function closeMap() {
    setOpen(false);
    setGeoError('');
    setResolving(false);
  }

  function confirmPick() {
    const loc = draftRef.current ?? draft;
    if (!loc) {
      setGeoError('اضغط على الخريطة لتحديد الموقع أولاً');
      return;
    }
    onPick(loc);
    closeMap();
  }

  return (
    <div className="setup-map-wrap">
      <button type="button" className="setup-map-open" onClick={openMap}>
        <span className="setup-map-open-icon" aria-hidden>
          <MapPin className="size-5" />
        </span>
        <span className="setup-map-open-text">
          <span className="setup-map-open-title">
            {hasSaved ? 'تغيير الموقع على الخريطة' : 'اضغط لاختيار الموقع على الخريطة'}
          </span>
          <span className="setup-map-open-sub">
            {hasSaved
              ? `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`
              : 'اضغط على الخريطة أو اسحب الدبوس'}
          </span>
        </span>
      </button>

      {open && (
        <div
          className="setup-map-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="setup-map-sheet">
            <header className="setup-map-sheet-head">
              <div>
                <h3 id={titleId} className="setup-map-sheet-title">
                  اختر موقع المكتبة
                </h3>
                <p className="setup-map-sheet-sub">اضغط على الخريطة أو اسحب الدبوس</p>
              </div>
              <button
                type="button"
                className="setup-map-sheet-close"
                onClick={closeMap}
                aria-label="إغلاق"
              >
                <X className="size-5" />
              </button>
            </header>

            <div className="setup-map-toolbar">
              <button
                type="button"
                className="btn-ghost setup-map-geo"
                onClick={useMyLocation}
                disabled={geoLoading}
              >
                {geoLoading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Crosshair className="size-4" aria-hidden />
                )}
                موقعي الحالي
              </button>
              <p className="setup-map-hint">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                اضغط على الخريطة أو اسحب الدبوس
              </p>
            </div>

            <div ref={containerRef} className="setup-map setup-map-dialog" role="presentation" />

            {(resolving || geoError || draft) && (
              <p className={`setup-map-status ${geoError ? 'is-error' : ''}`}>
                {geoError ||
                  (resolving
                    ? 'جاري قراءة العنوان من الموقع…'
                    : draft
                      ? `${draft.latitude}, ${draft.longitude}`
                      : null)}
              </p>
            )}

            <footer className="setup-map-sheet-foot">
              <button type="button" className="btn-ghost flex-1" onClick={closeMap}>
                إلغاء
              </button>
              <button
                type="button"
                className="btn-primary flex-[1.6]"
                onClick={confirmPick}
                disabled={!draft || resolving}
              >
                <Check className="size-4" aria-hidden />
                تأكيد الموقع
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
