import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "../lib/auth";
import { shopApi } from "../lib/api";
import {
  checkForUpdate,
  downloadAndInstallUpdate,
  formatProgress,
  isTauri,
  type InstallProgress,
} from "../lib/updates";
import { Button, Input, Panel } from "../components/ui";
import { AppSelect } from "../components/AppSelect";
import { TimeSelect } from "../components/TimeSelect";
import { Icons } from "../components/icons";
import { PageHeading } from "../components/PageHeading";
import { useToast } from "../components/Toast";
import {
  fileRetentionAr,
  pickupPolicyAr,
  queuePriorityAr,
} from "../lib/labels";

const APP_VERSION = "v0.1.1";

const DAY_LABELS = [
  "السبت",
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
] as const;

type HourDraft = {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
};

function defaultHours(): HourDraft[] {
  return DAY_LABELS.map((_, day) => ({
    day_of_week: day,
    open_time: "08:00",
    close_time: "22:00",
    is_closed: false,
  }));
}

function mergeHours(
  existing?: Array<{
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
  }> | null,
): HourDraft[] {
  const base = defaultHours();
  if (!existing?.length) return base;
  for (const h of existing) {
    const i = h.day_of_week;
    if (i < 0 || i > 6) continue;
    base[i] = {
      day_of_week: i,
      open_time: h.open_time || "08:00",
      close_time: h.close_time || "22:00",
      is_closed: Boolean(h.is_closed),
    };
  }
  return base;
}

const PICKUP_POLICIES = [
  "require_approval",
  "print_on_arrival",
  "auto_print",
] as const;

const RETENTION_POLICIES = [
  "immediate",
  "one_hour",
  "twenty_four_hours",
  "three_days",
  "seven_days",
] as const;

const PRIORITIES = ["urgent", "normal", "low"] as const;

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
    <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border-default px-2.5">
      <span className="flex size-5 items-center justify-center rounded-md bg-primary/15 text-primary">
        {icon}
      </span>
      <h2 className="text-section">{title}</h2>
      {trailing ? <div className="ms-auto flex items-center gap-1.5">{trailing}</div> : null}
    </div>
  );
}

function SwitchControl({
  checked,
  disabled,
  onChange,
  onLabel = "مفعّل",
  offLabel = "متوقف",
  compact = false,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  onLabel?: string;
  offLabel?: string;
  compact?: boolean;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex shrink-0 items-center transition-colors disabled:opacity-45 ${
        compact
          ? ""
          : `gap-2 rounded-full border px-1.5 py-1 ${
              checked
                ? "border-primary/40 bg-primary/15"
                : "border-border-default bg-bg-hover/70"
            }`
      }`}
    >
      {compact ? null : (
        <span
          className={`text-[11px] font-semibold ${
            checked ? "text-primary" : "text-text-muted"
          }`}
        >
          {checked ? onLabel : offLabel}
        </span>
      )}
      <span
        dir="ltr"
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-[#3a4558]"
        }`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${
            checked ? "left-4" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border-default/80 bg-bg-base/40 px-2.5 py-1.5">
      <div className="min-w-0">
        <p className="text-meta font-medium text-text-primary">{title}</p>
        <p className="truncate text-caption text-text-muted">{description}</p>
      </div>
      <SwitchControl checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 space-y-0.5 ${className}`}>
      <span className="text-caption text-text-muted">{label}</span>
      {children}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <AppSelect
        value={value}
        options={options}
        disabled={disabled}
        onChange={onChange}
        aria-label={label}
      />
    </Field>
  );
}

export function SettingsPage() {
  const { me, token, refreshMe } = useAuth();
  const { push: pushToast } = useToast();
  const store = me?.store;

  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<InstallProgress | null>(
    null,
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [opsBusy, setOpsBusy] = useState(false);

  const notify = (title: string, ok = true) => {
    pushToast({ title, tone: ok ? "success" : "danger", osNotify: false });
  };

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGov, setEditGov] = useState("");
  const [editWilayat, setEditWilayat] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPrefix, setEditPrefix] = useState("#");
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [storeActive, setStoreActive] = useState(true);
  const [hours, setHours] = useState<HourDraft[]>(defaultHours);
  const [devicePassword, setDevicePassword] = useState("");
  const [devicePasswordConfirm, setDevicePasswordConfirm] = useState("");
  const [deviceConfirmPhone, setDeviceConfirmPhone] = useState("");

  const [autoPrintPaid, setAutoPrintPaid] = useState(true);
  const [pickupPolicy, setPickupPolicy] = useState("require_approval");
  const [retention, setRetention] = useState("twenty_four_hours");
  const [priority, setPriority] = useState("urgent");

  useEffect(() => {
    if (!store) return;
    setEditName(store.name ?? "");
    setEditPhone(store.phone ?? "");
    setEditGov(store.governorate ?? "");
    setEditWilayat(store.wilayat ?? "");
    setEditArea(store.area ?? "");
    setEditAddress(store.address ?? "");
    setEditPrefix(store.order_number_prefix ?? "#");
    setEditLat(
      store.latitude != null && Number.isFinite(store.latitude)
        ? String(store.latitude)
        : "",
    );
    setEditLng(
      store.longitude != null && Number.isFinite(store.longitude)
        ? String(store.longitude)
        : "",
    );
    setStoreActive(store.is_active ?? true);
    setHours(mergeHours(store.opening_hours));
    setDeviceConfirmPhone(store.device_confirm_phone ?? "");
    setAutoPrintPaid(store.auto_print_paid_orders ?? true);
    setPickupPolicy(store.pay_at_pickup_print_policy ?? "require_approval");
    setRetention(store.file_retention_policy ?? "twenty_four_hours");
    setPriority(store.paid_orders_priority ?? "urgent");
  }, [store]);

  const patchOps = async (
    body: Parameters<typeof shopApi.updateStore>[1],
    okMsg: string,
  ) => {
    if (!token) return;
    setOpsBusy(true);
    try {
      await shopApi.updateStore(token, body);
      await refreshMe();
      notify(okMsg);
    } catch (err) {
      notify(err instanceof Error ? err.message : "فشل الحفظ", false);
      await refreshMe().catch(() => undefined);
    } finally {
      setOpsBusy(false);
    }
  };

  const saveStore = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const latRaw = editLat.trim();
    const lngRaw = editLng.trim();
    const latitude = latRaw === "" ? null : Number(latRaw);
    const longitude = lngRaw === "" ? null : Number(lngRaw);
    if (latRaw && !Number.isFinite(latitude)) {
      notify("خط العرض غير صالح", false);
      return;
    }
    if (lngRaw && !Number.isFinite(longitude)) {
      notify("خط الطول غير صالح", false);
      return;
    }
    setSavingProfile(true);
    try {
      await shopApi.updateStore(token, {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        governorate: editGov.trim() || null,
        wilayat: editWilayat.trim() || null,
        area: editArea.trim() || null,
        address: editAddress.trim() || null,
        order_number_prefix: editPrefix.trim() || "#",
        latitude,
        longitude,
        is_active: storeActive,
      });
      await refreshMe();
      notify("تم حفظ بيانات المكتبة");
    } catch (err) {
      notify(err instanceof Error ? err.message : "فشل الحفظ", false);
    } finally {
      setSavingProfile(false);
    }
  };

  const saveHours = async () => {
    if (!token) return;
    setSavingHours(true);
    try {
      await shopApi.updateStore(token, { opening_hours: hours });
      await refreshMe();
      notify("تم حفظ ساعات العمل");
    } catch (err) {
      notify(err instanceof Error ? err.message : "فشل الحفظ", false);
    } finally {
      setSavingHours(false);
    }
  };

  const saveDeviceSecurity = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (devicePassword.length < 6) {
      notify("كلمة مرور الجهاز يجب أن تكون 6 أحرف على الأقل", false);
      return;
    }
    if (devicePassword !== devicePasswordConfirm) {
      notify("كلمتا مرور الجهاز غير متطابقتين", false);
      return;
    }
    setSavingSecurity(true);
    try {
      await shopApi.setDeviceSecurity(token, {
        device_password: devicePassword,
        device_confirm_phone: deviceConfirmPhone.trim(),
      });
      setDevicePassword("");
      setDevicePasswordConfirm("");
      await refreshMe();
      notify("تم حفظ أمان الجهاز");
    } catch (err) {
      notify(err instanceof Error ? err.message : "فشل الحفظ", false);
    } finally {
      setSavingSecurity(false);
    }
  };

  const runUpdateCheck = async () => {
    if (!isTauri()) {
      notify("التحديثات متاحة في تطبيق سطح المكتب فقط.", false);
      return;
    }
    setUpdateBusy(true);
    setUpdateProgress(null);
    try {
      const result = await checkForUpdate({ silent: false });
      if (result.status === "up-to-date") {
        notify("أنت على أحدث إصدار.");
        return;
      }
      if (result.status === "unavailable") {
        notify("تعذر التحقق من التحديثات حالياً.", false);
        return;
      }
      if (result.status === "error") {
        notify(result.message, false);
        return;
      }
      const ok = window.confirm(
        `يتوفر تحديث (v${result.version}). هل تريد التحديث الآن؟`,
      );
      if (!ok) {
        notify("تم تأجيل التحديث.", false);
        return;
      }
      setUpdateProgress({ downloaded: 0, total: null });
      await downloadAndInstallUpdate({
        onProgress: (p) => setUpdateProgress(p),
      });
      notify("تم تثبيت التحديث. أعد تشغيل التطبيق إن لزم.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "فشل التحديث.", false);
    } finally {
      setUpdateBusy(false);
      setUpdateProgress(null);
    }
  };

  const setHour = (day: number, patch: Partial<HourDraft>) => {
    setHours((prev) =>
      prev.map((row) => (row.day_of_week === day ? { ...row, ...patch } : row)),
    );
  };

  return (
    <div className="page-fit gap-2 overflow-hidden">
      <PageHeading
        icon={Icons.settings({ size: 20 })}
        title="الإعدادات"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-caption text-text-muted tabular-nums" dir="ltr">
              {APP_VERSION}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={updateBusy}
              onClick={() => void runUpdateCheck()}
              className="!px-2.5 !py-1"
            >
              {Icons.refresh({ size: 13 })}
              {updateBusy
                ? updateProgress
                  ? formatProgress(updateProgress)
                  : "جاري التحقق…"
                : "تحديث"}
            </Button>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-2">
        <div className="flex min-h-0 flex-col">
          <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(e) => void saveStore(e)}
            >
              <SectionTitle
                title="بيانات المكتبة"
                icon={Icons.bag({ size: 13 })}
                trailing={
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-text-muted">ظاهرة</span>
                    <SwitchControl
                      compact
                      checked={storeActive}
                      aria-label="المكتبة ظاهرة للعملاء"
                      disabled={savingProfile || opsBusy || !token}
                      onChange={(next) => {
                        setStoreActive(next);
                        void patchOps(
                          { is_active: next },
                          next
                            ? "المكتبة ظاهرة للعملاء"
                            : "المكتبة مخفية عن العملاء",
                        );
                      }}
                    />
                    <Button
                      type="submit"
                      disabled={savingProfile || !token}
                      className="!px-2.5 !py-1"
                    >
                      {savingProfile ? "…" : "حفظ"}
                    </Button>
                  </div>
                }
              />
              <div className="scroll-y min-h-0 flex-1 p-2">
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                  <Field label="الاسم">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="!py-1.5"
                    />
                  </Field>
                  <Field label="الهاتف">
                    <Input
                      dir="ltr"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+968…"
                      className="!py-1.5"
                    />
                  </Field>
                  <Field label="المحافظة">
                    <Input
                      value={editGov}
                      onChange={(e) => setEditGov(e.target.value)}
                      className="!py-1.5"
                    />
                  </Field>
                  <Field label="الولاية">
                    <Input
                      value={editWilayat}
                      onChange={(e) => setEditWilayat(e.target.value)}
                      className="!py-1.5"
                    />
                  </Field>
                  <Field label="المنطقة">
                    <Input
                      value={editArea}
                      onChange={(e) => setEditArea(e.target.value)}
                      className="!py-1.5"
                    />
                  </Field>
                  <Field label="بادئة الطلب">
                    <Input
                      dir="ltr"
                      value={editPrefix}
                      onChange={(e) => setEditPrefix(e.target.value.slice(0, 8))}
                      placeholder="#"
                      className="!py-1.5"
                    />
                  </Field>
                  <Field label="العنوان" className="col-span-2">
                    <Input
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="!py-1.5"
                    />
                  </Field>
                  <Field label="خط العرض">
                    <Input
                      dir="ltr"
                      inputMode="decimal"
                      value={editLat}
                      onChange={(e) => setEditLat(e.target.value)}
                      placeholder="23.5880"
                      className="!py-1.5"
                    />
                  </Field>
                  <Field label="خط الطول">
                    <Input
                      dir="ltr"
                      inputMode="decimal"
                      value={editLng}
                      onChange={(e) => setEditLng(e.target.value)}
                      placeholder="58.3829"
                      className="!py-1.5"
                    />
                  </Field>
                </div>
              </div>
            </form>
          </Panel>
        </div>

        <div className="flex min-h-0 flex-col gap-2">
          <Panel className="shrink-0 overflow-hidden">
            <SectionTitle title="الطباعة والتشغيل" icon={Icons.printer({ size: 13 })} />
            <div className="space-y-2 p-2">
              <ToggleRow
                title="طباعة تلقائية للمدفوع مسبقاً"
                description="بعد الدفع الإلكتروني يُرسل للطابعة مباشرة"
                checked={autoPrintPaid}
                disabled={opsBusy || !token}
                onChange={(next) => {
                  setAutoPrintPaid(next);
                  void patchOps(
                    { auto_print_paid_orders: next },
                    next
                      ? "تم تفعيل الطباعة التلقائية"
                      : "تم إيقاف الطباعة التلقائية",
                  );
                }}
              />
              <div className="grid grid-cols-3 gap-1.5">
                <SelectField
                  label="الدفع عند الاستلام"
                  value={pickupPolicy}
                  disabled={opsBusy || !token}
                  options={PICKUP_POLICIES.map((v) => ({
                    value: v,
                    label: pickupPolicyAr(v),
                  }))}
                  onChange={(v) => {
                    setPickupPolicy(v);
                    void patchOps(
                      { pay_at_pickup_print_policy: v },
                      "تم حفظ سياسة الدفع عند الاستلام",
                    );
                  }}
                />
                <SelectField
                  label="احتفاظ الملفات"
                  value={retention}
                  disabled={opsBusy || !token}
                  options={RETENTION_POLICIES.map((v) => ({
                    value: v,
                    label: fileRetentionAr(v),
                  }))}
                  onChange={(v) => {
                    setRetention(v);
                    void patchOps(
                      { file_retention_policy: v },
                      "تم حفظ سياسة احتفاظ الملفات",
                    );
                  }}
                />
                <SelectField
                  label="أولوية المدفوع"
                  value={priority}
                  disabled={opsBusy || !token}
                  options={PRIORITIES.map((v) => ({
                    value: v,
                    label: queuePriorityAr(v),
                  }))}
                  onChange={(v) => {
                    setPriority(v);
                    void patchOps(
                      { paid_orders_priority: v },
                      "تم حفظ أولوية الطلبات المدفوعة",
                    );
                  }}
                />
              </div>
              <p className="text-caption text-text-muted">
                الدفع داخل المكتبة لا يطبع تلقائياً — استخدم زر الطباعة.
              </p>
            </div>
          </Panel>

          <Panel className="shrink-0 overflow-hidden">
            <form onSubmit={(e) => void saveDeviceSecurity(e)}>
              <SectionTitle
                title="أمان الجهاز"
                icon={Icons.settings({ size: 13 })}
                trailing={
                  <Button
                    type="submit"
                    disabled={savingSecurity || !token}
                    className="!px-2.5 !py-1"
                  >
                    {savingSecurity ? "…" : "حفظ"}
                  </Button>
                }
              />
              <div className="grid grid-cols-3 gap-1.5 p-2">
                <Field label="هاتف تأكيد OTP">
                  <Input
                    dir="ltr"
                    value={deviceConfirmPhone}
                    onChange={(e) => setDeviceConfirmPhone(e.target.value)}
                    placeholder="+968…"
                    required
                    className="!py-1.5"
                  />
                </Field>
                <Field label="كلمة مرور الجهاز">
                  <Input
                    type="password"
                    dir="ltr"
                    value={devicePassword}
                    onChange={(e) => setDevicePassword(e.target.value)}
                    minLength={6}
                    required
                    placeholder="••••••••"
                    className="!py-1.5"
                  />
                </Field>
                <Field label="تأكيد كلمة المرور">
                  <Input
                    type="password"
                    dir="ltr"
                    value={devicePasswordConfirm}
                    onChange={(e) => setDevicePasswordConfirm(e.target.value)}
                    minLength={6}
                    required
                    placeholder="••••••••"
                    className="!py-1.5"
                  />
                </Field>
              </div>
            </form>
          </Panel>

          <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SectionTitle
              title="ساعات العمل"
              icon={Icons.clock({ size: 13 })}
              trailing={
                <Button
                  type="button"
                  variant="secondary"
                  disabled={savingHours || !token}
                  onClick={() => void saveHours()}
                  className="!px-2.5 !py-1"
                >
                  {savingHours ? "…" : "حفظ"}
                </Button>
              }
            />
            <div className="scroll-y min-h-0 flex-1 p-2">
              <div className="mb-1 grid grid-cols-[4.25rem_2.5rem_1fr_1fr] gap-1.5 px-1 text-[10px] text-text-muted">
                <span>اليوم</span>
                <span className="text-center">مغلق</span>
                <span>من</span>
                <span>إلى</span>
              </div>
              <div className="space-y-1">
                {hours.map((h) => (
                  <div
                    key={h.day_of_week}
                    className={`grid grid-cols-[4.25rem_2.5rem_1fr_1fr] items-center gap-1.5 rounded-lg border px-1.5 py-1 ${
                      h.is_closed
                        ? "border-border-default/50 bg-bg-base/40"
                        : "border-border-default bg-bg-elevated/50"
                    }`}
                  >
                    <span className="truncate text-meta font-medium text-text-primary">
                      {DAY_LABELS[h.day_of_week]}
                    </span>
                    <div className="flex justify-center">
                      <SwitchControl
                        compact
                        checked={h.is_closed}
                        aria-label={`${DAY_LABELS[h.day_of_week]} مغلق`}
                        onChange={(next) =>
                          setHour(h.day_of_week, { is_closed: next })
                        }
                      />
                    </div>
                    <TimeSelect
                      aria-label={`${DAY_LABELS[h.day_of_week]} من`}
                      disabled={h.is_closed}
                      value={h.open_time}
                      onChange={(open_time) =>
                        setHour(h.day_of_week, { open_time })
                      }
                    />
                    <TimeSelect
                      aria-label={`${DAY_LABELS[h.day_of_week]} إلى`}
                      disabled={h.is_closed}
                      value={h.close_time}
                      onChange={(close_time) =>
                        setHour(h.day_of_week, { close_time })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
