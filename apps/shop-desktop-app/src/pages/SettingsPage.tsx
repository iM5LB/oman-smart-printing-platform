import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../lib/auth";
import { getApiBase, getCustomerShopUrl, formatCleanUrl, shopApi } from "../lib/api";
import {
  checkForUpdate,
  downloadAndInstallUpdate,
  formatProgress,
  isTauri,
  type InstallProgress,
} from "../lib/updates";
import { Badge, Button, Panel } from "../components/ui";
import { Icons } from "../components/icons";
import { PageHeading } from "../components/PageHeading";
import { ShopUrlQrDialog } from "../components/ShopUrlQrDialog";
import {
  deviceStatusAr,
  fileRetentionAr,
  omanWeekdayAr,
  pickupPolicyAr,
  queuePriorityAr,
} from "../lib/labels";

const APP_VERSION = "v0.1.0";

function dash(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  return String(value);
}

function Field({
  label,
  children,
  dir,
  icon,
}: {
  label: string;
  children: ReactNode;
  dir?: "ltr" | "rtl";
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border-default/50 px-3 py-2 last:border-b-0">
      {icon ? (
        <span className="shrink-0 text-primary/70">{icon}</span>
      ) : null}
      <p className="shrink-0 text-meta text-text-muted">{label}</p>
      <div
        className="min-w-0 flex-1 truncate text-end text-body font-medium text-text-primary"
        dir={dir}
        title={typeof children === "string" ? children : undefined}
      >
        {children}
      </div>
    </div>
  );
}

function Chip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  const ring = {
    neutral: "border-border-default bg-bg-elevated",
    success: "border-success/30 bg-success/10",
    warning: "border-warning/30 bg-warning/10",
    info: "border-primary/30 bg-primary/10",
  };
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 ${ring[tone]}`}
    >
      <span className="text-caption text-text-muted">{label}</span>
      <span className="truncate text-meta font-semibold text-text-primary">
        {value}
      </span>
    </div>
  );
}

function SectionTitle({
  title,
  icon,
  trailing,
}: {
  title: string;
  icon: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border-default px-3 py-2">
      <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
        {icon}
      </span>
      <h2 className="text-section">{title}</h2>
      {trailing ? <div className="ms-auto">{trailing}</div> : null}
    </div>
  );
}

function shortOs(os: string | null | undefined) {
  if (!os) return "—";
  const win = os.match(/Windows NT ([\d.]+)/i);
  if (win) return `Windows ${win[1]}`;
  if (os.length > 28) return `${os.slice(0, 26)}…`;
  return os;
}

export function SettingsPage() {
  const { me, logout, token, refreshMe } = useAuth();
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<InstallProgress | null>(
    null,
  );
  const [shopQrOpen, setShopQrOpen] = useState(false);

  const store = me?.store;
  const device = me?.device;
  const deviceOnline =
    device?.status === "connected" || device?.status === "online";
  const location = [store?.governorate, store?.wilayat, store?.area]
    .filter(Boolean)
    .join(" · ");
  const hours = store?.opening_hours ?? [];
  const shopUrl = getCustomerShopUrl(store);
  const today = new Date().getDay();
  const omanToday = (today + 1) % 7;

  useEffect(() => {
    if (!token) {
      setOnline(false);
      return;
    }
    let cancelled = false;
    const ping = async () => {
      try {
        await shopApi.me(token);
        if (!cancelled) setOnline(true);
      } catch {
        if (!cancelled) setOnline(false);
      }
    };
    void ping();
    const id = window.setInterval(ping, 45_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token]);

  const refresh = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await refreshMe();
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      setBusy(false);
    }
  };

  const runUpdateCheck = async () => {
    if (!isTauri()) {
      setUpdateMsg("التحديثات متاحة في تطبيق سطح المكتب فقط.");
      return;
    }
    setUpdateBusy(true);
    setUpdateMsg(null);
    setUpdateProgress(null);
    try {
      const result = await checkForUpdate({ silent: false });
      if (result.status === "up-to-date") {
        setUpdateMsg("أنت على أحدث إصدار.");
        return;
      }
      if (result.status === "unavailable") {
        setUpdateMsg("تعذر التحقق من التحديثات حالياً.");
        return;
      }
      if (result.status === "error") {
        setUpdateMsg(result.message);
        return;
      }
      const ok = window.confirm(
        `يتوفر تحديث (v${result.version}). هل تريد التحديث الآن؟`,
      );
      if (!ok) {
        setUpdateMsg("تم تأجيل التحديث.");
        return;
      }
      setUpdateProgress({ downloaded: 0, total: null });
      await downloadAndInstallUpdate({
        onProgress: (p) => {
          setUpdateProgress(p);
          setUpdateMsg(formatProgress(p));
        },
      });
    } catch (e) {
      setUpdateMsg(e instanceof Error ? e.message : "فشل التحديث.");
    } finally {
      setUpdateBusy(false);
    }
  };

  useEffect(() => {
    if (!updateMsg || updateBusy) return;
    const id = window.setTimeout(() => setUpdateMsg(null), 4000);
    return () => window.clearTimeout(id);
  }, [updateMsg, updateBusy]);

  const updateButtonLabel = updateBusy
    ? updateProgress
      ? formatProgress(updateProgress)
      : "جاري التحقق…"
    : updateMsg
      ? updateMsg
      : "تحقق من التحديثات";

  return (
    <div className="page-fit gap-2.5">
      <PageHeading
        icon={Icons.home({ size: 22 })}
        title="المعلومات"
        description="بيانات المكتبة من الموقع ومعلومات التطبيق"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={updateBusy}
              onClick={() => void runUpdateCheck()}
              className="min-w-[11rem]"
            >
              {!updateMsg || updateBusy ? Icons.bell({ size: 14 }) : null}
              {updateButtonLabel}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || !token}
              onClick={() => void refresh()}
            >
              {busy ? "…" : "تحديث"}
            </Button>
            <Button type="button" variant="danger" onClick={logout}>
              {Icons.logout({ size: 14 })}
              خروج
            </Button>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-hidden lg:grid-cols-2">
        {/* Library */}
        <Panel className="animate-fade-up flex min-h-0 flex-col overflow-hidden">
          <SectionTitle
            title="المكتبة"
            icon={Icons.bag({ size: 14 })}
            trailing={
              <Badge tone={store?.is_active === false ? "danger" : "success"}>
                {store?.is_active === false ? "غير نشطة" : "نشطة"}
              </Badge>
            }
          />

          <div className="flex items-center gap-3 border-b border-border-default bg-gradient-to-l from-primary/15 to-transparent px-3 py-3">
            {store?.logo_url ? (
              <img
                src={store.logo_url}
                alt=""
                className="size-11 shrink-0 rounded-2xl border border-border-default object-cover shadow-[0_8px_24px_rgba(31,111,235,0.25)]"
              />
            ) : (
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-section font-semibold text-white shadow-[0_8px_24px_rgba(31,111,235,0.35)]">
                {(store?.name ?? "م").slice(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-title leading-tight">{dash(store?.name)}</p>
              {shopUrl ? (
                <button
                  type="button"
                  onClick={() => setShopQrOpen(true)}
                  className="mt-0.5 block max-w-full truncate text-start text-meta text-info underline-offset-2 hover:underline"
                  dir="ltr"
                  title="عرض رمز QR للمسح"
                >
                  {formatCleanUrl(shopUrl)}
                </button>
              ) : (
                <p className="truncate text-meta text-text-muted" dir="ltr">
                  /{dash(store?.slug)}
                </p>
              )}
            </div>
            <span
              className={`ms-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium ${
                online
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-danger/30 bg-danger/10 text-danger"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${online ? "bg-success animate-pulse-dot" : "bg-danger"}`}
              />
              {online ? "متصل" : "غير متصل"}
            </span>
          </div>

          <div className="shrink-0">
            <Field label="الهاتف" icon={Icons.phone({ size: 13 })} dir="ltr">
              {dash(store?.phone)}
            </Field>
            <Field
              label="هاتف تأكيد الجهاز"
              icon={Icons.phone({ size: 13 })}
              dir="ltr"
            >
              {dash(store?.device_confirm_phone)}
            </Field>
            <Field label="الموقع" icon={Icons.pickup({ size: 13 })}>
              {location || "—"}
            </Field>
            <Field label="العنوان" icon={Icons.home({ size: 13 })}>
              {dash(store?.address)}
            </Field>
            <Field label="رابط العملاء" icon={Icons.bag({ size: 13 })} dir="ltr">
              {shopUrl ? (
                <button
                  type="button"
                  onClick={() => setShopQrOpen(true)}
                  className="truncate text-meta text-info underline-offset-2 hover:underline"
                  title="عرض رمز QR للمسح"
                >
                  {formatCleanUrl(shopUrl)}
                </button>
              ) : (
                <span className="text-meta text-info">
                  {store?.customer_shop_path ?? "—"}
                </span>
              )}
            </Field>
            <Field label="كلمة مرور الجهاز" icon={Icons.settings({ size: 13 })}>
              <Badge tone={store?.has_device_password ? "success" : "warning"}>
                {store?.has_device_password ? "مضبوطة" : "غير مضبوطة"}
              </Badge>
            </Field>
          </div>

          <div className="flex min-h-0 flex-1 flex-col border-t border-border-default bg-bg-elevated/40">
            <div className="flex shrink-0 items-center gap-1.5 px-3 py-2 text-meta text-text-muted">
              {Icons.clock({ size: 13 })}
              <span className="font-medium">ساعات العمل</span>
            </div>
            <div className="grid min-h-0 flex-1 grid-rows-7 gap-px bg-border-default/40 px-2 pb-2">
              {Array.from({ length: 7 }, (_, i) => {
                const day = hours.find((h) => h.day_of_week === i);
                const isToday = i === omanToday;
                const closed = !day || day.is_closed;
                return (
                  <div
                    key={i}
                    className={`flex min-h-0 items-center justify-between gap-2 rounded-md px-2.5 ${
                      isToday
                        ? "bg-primary/20 ring-1 ring-inset ring-primary/35"
                        : "bg-bg-surface"
                    }`}
                  >
                    <span
                      className={`text-meta font-medium ${isToday ? "text-primary" : "text-text-secondary"}`}
                    >
                      {omanWeekdayAr(i)}
                      {isToday ? " · اليوم" : ""}
                    </span>
                    <span
                      className={`tabular-nums text-meta font-semibold ${
                        closed ? "text-danger" : "text-text-primary"
                      }`}
                      dir="ltr"
                    >
                      {closed
                        ? "مغلق"
                        : `${day.open_time.slice(0, 5)} – ${day.close_time.slice(0, 5)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        {/* Ops + device */}
        <Panel className="animate-fade-up flex min-h-0 flex-col overflow-hidden [animation-delay:50ms]">
          <SectionTitle
            title="التشغيل والجهاز"
            icon={Icons.printer({ size: 14 })}
            trailing={
              <Badge tone={deviceOnline ? "success" : "warning"}>
                {deviceStatusAr(device?.status)}
              </Badge>
            }
          />

          <div className="shrink-0 space-y-1.5 border-b border-border-default p-2.5">
            <div className="grid grid-cols-2 gap-1.5">
              <Chip
                label="طباعة تلقائية"
                tone={store?.auto_print_paid_orders ? "success" : "neutral"}
                value={
                  store?.auto_print_paid_orders ? (
                    <span className="text-success">مفعّلة</span>
                  ) : (
                    "متوقفة"
                  )
                }
              />
              <Chip
                label="عند الاستلام"
                tone="info"
                value={pickupPolicyAr(store?.pay_at_pickup_print_policy)}
              />
              <Chip
                label="احتفاظ الملفات"
                tone="warning"
                value={fileRetentionAr(store?.file_retention_policy)}
              />
              <Chip
                label="أولوية المدفوع"
                tone="info"
                value={queuePriorityAr(store?.paid_orders_priority)}
              />
            </div>
          </div>

          <div
            className={`flex shrink-0 items-center gap-2.5 border-b border-border-default px-3 py-2.5 ${
              deviceOnline
                ? "bg-gradient-to-l from-success/15 to-transparent"
                : "bg-gradient-to-l from-warning/15 to-transparent"
            }`}
          >
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                deviceOnline
                  ? "bg-success/20 text-success"
                  : "bg-warning/20 text-warning"
              }`}
            >
              {Icons.printer({ size: 18 })}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-section">{dash(device?.name)}</p>
              {device?.last_connected_at ? (
                <p className="truncate text-caption text-text-muted" dir="ltr">
                  آخر اتصال ·{" "}
                  {new Date(device.last_connected_at).toLocaleString("ar-OM")}
                </p>
              ) : (
                <p className="text-caption text-text-muted">الجهاز المرتبط</p>
              )}
            </div>
          </div>

          <div className="shrink-0">
            <Field label="إصدار التطبيق" icon={Icons.package({ size: 13 })}>
              {device?.app_version ? `v${device.app_version}` : APP_VERSION}
            </Field>
            <Field label="نظام التشغيل" icon={Icons.settings({ size: 13 })}>
              <span title={device?.os_version ?? undefined}>
                {shortOs(device?.os_version)}
              </span>
            </Field>
            <Field label="الضريبة" icon={Icons.tag({ size: 13 })}>
              {store?.tax_rate_bps != null
                ? `${(store.tax_rate_bps / 100).toFixed(2)}%`
                : "—"}
            </Field>
            <Field label="الخادم" icon={Icons.refresh({ size: 13 })} dir="ltr">
              <span className="text-meta text-info">{getApiBase()}</span>
            </Field>
            {store?.order_number_prefix ? (
              <Field label="بادئة الطلب" icon={Icons.tag({ size: 13 })}>
                {store.order_number_prefix}
              </Field>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 border-t border-border-default bg-bg-elevated/40 p-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-border-default bg-bg-surface px-2.5 py-3 text-center">
                <p className="text-caption text-text-muted">الاتصال</p>
                <p
                  className={`mt-1 text-meta font-semibold ${online ? "text-success" : "text-danger"}`}
                >
                  {online ? "نشط" : "مقطوع"}
                </p>
              </div>
              <div className="rounded-lg border border-border-default bg-bg-surface px-2.5 py-3 text-center">
                <p className="text-caption text-text-muted">الجهاز</p>
                <p
                  className={`mt-1 text-meta font-semibold ${deviceOnline ? "text-success" : "text-warning"}`}
                >
                  {deviceOnline ? "متصل" : "غير متصل"}
                </p>
              </div>
              <div className="rounded-lg border border-border-default bg-bg-surface px-2.5 py-3 text-center">
                <p className="text-caption text-text-muted">الإصدار</p>
                <p className="mt-1 text-meta font-semibold tabular-nums">
                  {device?.app_version ? `v${device.app_version}` : APP_VERSION}
                </p>
              </div>
            </div>
            <p className="text-center text-caption text-text-muted">
              البيانات تُزامَن من لوحة الموقع · التغييرات تظهر بعد التحديث
            </p>
          </div>
        </Panel>
      </div>

      {shopUrl ? (
        <ShopUrlQrDialog
          open={shopQrOpen}
          onClose={() => setShopQrOpen(false)}
          url={shopUrl}
          storeName={store?.name}
        />
      ) : null}
    </div>
  );
}
