import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "./ui";
import { Icons } from "./icons";

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

function cleanPart(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/^محافظة\s+/u, "").replace(/^ولاية\s+/u, "").trim() || undefined;
}

async function reverseGeocode(lat: number, lng: number): Promise<Partial<PickedLocation>> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("format", "json");
    url.searchParams.set("accept-language", "ar");
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");
    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) return {};
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const a = data.address ?? {};
    const governorate = cleanPart(a.state || a.region || a.province);
    const wilayat = cleanPart(a.county || a.city || a.town || a.municipality);
    const area = cleanPart(a.suburb || a.neighbourhood || a.village || a.quarter);
    const road = [a.road, a.pedestrian, a.residential].filter(Boolean).join(" · ");
    const address =
      road || area || data.display_name?.split(",").slice(0, 2).join("، ") || undefined;
    return { governorate, wilayat, area, address };
  } catch {
    return {};
  }
}

function pinIcon() {
  return L.divIcon({
    className: "shop-map-pin",
    html: '<span class="shop-map-pin-dot"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

export function LocationPicker({
  latitude,
  longitude,
  onPick,
}: {
  latitude?: number | null;
  longitude?: number | null;
  onPick: (loc: PickedLocation) => void;
}) {
  const hasSaved = latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude);
  const [open, setOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [resolving, setResolving] = useState(false);
  const [draft, setDraft] = useState<PickedLocation | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const draftRef = useRef<PickedLocation | null>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const timers: number[] = [];

    function destroyMap() {
      resizeObserver?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    }

    async function commit(lat: number, lng: number) {
      setResolving(true);
      setGeoError("");
      const extra = await reverseGeocode(lat, lng);
      if (cancelled) return;
      const next: PickedLocation = {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        ...extra,
      };
      draftRef.current = next;
      setDraft(next);
      setResolving(false);
    }

    function ensureMarker(map: L.Map, lat: number, lng: number) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        return;
      }
      markerRef.current = L.marker([lat, lng], { icon: pinIcon(), draggable: true }).addTo(map);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current!.getLatLng();
        void commit(p.lat, p.lng);
      });
    }

    const boot = window.setTimeout(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const start: L.LatLngExpression = hasSaved ? [latitude!, longitude!] : OMAN_CENTER;
      const map = L.map(containerRef.current, {
        center: start,
        zoom: hasSaved ? 16 : DEFAULT_ZOOM,
        zoomControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      map.on("click", (e: L.LeafletMouseEvent) => {
        ensureMarker(map, e.latlng.lat, e.latlng.lng);
        void commit(e.latlng.lat, e.latlng.lng);
      });
      if (hasSaved) {
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
      timers.forEach((t) => window.clearTimeout(t));
      destroyMap();
    };
  }, [open, hasSaved, latitude, longitude]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("تعذر تحديد الموقع على هذا الجهاز");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const map = mapRef.current;
        if (map) {
          map.flyTo([lat, lng], 17, { duration: 0.5 });
          if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
          else {
            markerRef.current = L.marker([lat, lng], { icon: pinIcon(), draggable: true }).addTo(map);
            markerRef.current.on("dragend", () => {
              const p = markerRef.current!.getLatLng();
              void reverseGeocode(p.lat, p.lng).then((extra) => {
                const next = {
                  latitude: Number(p.lat.toFixed(6)),
                  longitude: Number(p.lng.toFixed(6)),
                  ...extra,
                };
                draftRef.current = next;
                setDraft(next);
              });
            });
          }
        }
        setResolving(true);
        const extra = await reverseGeocode(lat, lng);
        const next = {
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6)),
          ...extra,
        };
        draftRef.current = next;
        setDraft(next);
        setResolving(false);
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        setGeoError("اسمح بالصلاحية أو اختر على الخريطة");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const confirmPick = () => {
    const loc = draftRef.current ?? draft;
    if (!loc) {
      setGeoError("اضغط على الخريطة لتحديد الموقع أولاً");
      return;
    }
    onPick(loc);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setGeoError("");
          setOpen(true);
        }}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-border-default bg-bg-elevated px-2.5 py-2 text-start transition-colors hover:border-primary/50"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          {Icons.pickup({ size: 15 })}
        </span>
        <span className="min-w-0">
          <span className="block text-meta font-medium text-text-primary">
            {hasSaved ? "تغيير الموقع على الخريطة" : "تحديد الموقع على الخريطة"}
          </span>
          <span className="block truncate text-caption text-text-muted" dir="ltr">
            {hasSaved
              ? `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`
              : "اضغط على الخريطة أو اسحب الدبوس"}
          </span>
        </span>
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4">
              <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between gap-3 border-b border-border-default px-3 py-2">
                  <div>
                    <h3 className="text-section">اختر موقع المكتبة</h3>
                    <p className="text-caption text-text-muted">اضغط على الخريطة أو اسحب الدبوس</p>
                  </div>
                  <button
                    type="button"
                    className="flex size-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-hover hover:text-text-primary"
                    onClick={() => setOpen(false)}
                    aria-label="إغلاق"
                  >
                    {Icons.x({ size: 16 })}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={geoLoading}
                    onClick={useMyLocation}
                    className="!px-2.5 !py-1"
                  >
                    {Icons.pickup({ size: 13 })}
                    {geoLoading ? "جاري التحديد…" : "موقعي الحالي"}
                  </Button>
                  <p className="text-caption text-text-muted">
                    {geoError ||
                      (resolving
                        ? "جاري قراءة العنوان…"
                        : draft
                          ? `${draft.latitude}, ${draft.longitude}`
                          : "لم يُحدد موقع بعد")}
                  </p>
                </div>
                <div ref={containerRef} className="shop-map-canvas min-h-[22rem] flex-1" />
                <div className="flex gap-2 border-t border-border-default p-3">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
                    إلغاء
                  </Button>
                  <Button
                    type="button"
                    className="flex-[1.4]"
                    disabled={!draft || resolving}
                    onClick={confirmPick}
                  >
                    تأكيد الموقع
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
