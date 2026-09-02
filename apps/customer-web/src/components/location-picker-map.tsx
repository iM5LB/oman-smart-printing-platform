'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Crosshair, Loader2, MapPin } from 'lucide-react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [resolving, setResolving] = useState(false);

  onPickRef.current = onPick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

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

    async function commit(lat: number, lng: number) {
      setResolving(true);
      setGeoError('');
      const extra = await reverseGeocode(lat, lng);
      setResolving(false);
      onPickRef.current({
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        ...extra,
      });
    }

    function ensureMarker(lat: number, lng: number) {
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

    map.on('click', (e: L.LeafletMouseEvent) => {
      ensureMarker(e.latlng.lat, e.latlng.lng);
      void commit(e.latlng.lat, e.latlng.lng);
    });

    if (hasInitial) ensureMarker(latitude!, longitude!);

    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());
    const t = window.setTimeout(() => map.invalidateSize(), 200);

    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                onPickRef.current({
                  latitude: Number(p.lat.toFixed(6)),
                  longitude: Number(p.lng.toFixed(6)),
                  ...extra,
                });
              })();
            });
          }
        }
        setResolving(true);
        const extra = await reverseGeocode(lat, lng);
        setResolving(false);
        onPickRef.current({
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
          ...extra,
        });
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        setGeoError('تعذّر الوصول لموقعك. اسمح بالصلاحية أو اختر على الخريطة');
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <div className="setup-map-wrap">
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
      <div ref={containerRef} className="setup-map" role="presentation" />
      {(resolving || geoError) && (
        <p className={`setup-map-status ${geoError ? 'is-error' : ''}`}>
          {geoError || 'جاري قراءة العنوان من الموقع…'}
        </p>
      )}
    </div>
  );
}
