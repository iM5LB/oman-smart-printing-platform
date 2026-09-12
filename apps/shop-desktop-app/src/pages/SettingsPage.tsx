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
import { Icons } from "../components/icons";
import { PageHeading } from "../components/PageHeading";
import {
  fileRetentionAr,
  pickupPolicyAr,
  queuePriorityAr,
} from "../lib/labels";

const APP_VERSION = "v0.1.1";

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
    <div className="flex shrink-0 items-center gap-2 border-b border-border-default px-2.5 py-1.5">
      <span className="flex size-5 items-center justify-center rounded-md bg-primary/15 text-primary">
        {icon}
      </span>
      <h2 className="text-section">{title}</h2>
      {trailing ? <div className="ms-auto">{trailing}</div> : null}
    </div>
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
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border-default bg-bg-elevated/40 px-2.5 py-2">
      <div className="min-w-0">
        <p className="text-meta font-medium text-text-primary">{title}</p>
        <p className="truncate text-caption text-text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        dir="ltr"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors disabled:opacity-45 ${
          checked ? "bg-primary" : "bg-bg-hover"
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
            checked ? "left-4" : "left-0.5"
          }`}
        />
      </button>
    </div>
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
    <label className="block min-w-0 space-y-0.5">
      <span className="text-caption text-text-muted">{label}</span>
      <select
        className="w-full rounded-lg border border-border-default bg-bg-elevated px-2.5 py-1.5 text-meta text-text-primary outline-none transition-colors focus:border-primary disabled:opacity-45"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SettingsPage() {
  const { me, token, refreshMe } = useAuth();
  const store = me?.store;

  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [updateBusy, setUpdateBusy] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<InstallProgress | null>(
    null,
  );
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [opsBusy, setOpsBusy] = useState(false);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGov, setEditGov] = useState("");
  const [editWilayat, setEditWilayat] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [devicePassword, setDevicePassword] = useState("");
  const [devicePasswordConfirm, setDevicePasswordConfirm] = useState("");
  const [deviceConfirmPhone, setDeviceConfirmPhone] = useState("");

  const [autoPrintPaid, setAutoPrintPaid] = useState(true);
  const [pickupPolicy, setPickupPolicy] = useState("require_approval");
  const [retention, setRetention] = useState("twenty_four_hours");
  const [priority, setPriority] = useState("urgent");
  const [taxPercent, setTaxPercent] = useState("0");

  useEffect(() => {
    if (!store) return;
    setEditName(store.name ?? "");
    setEditPhone(store.phone ?? "");
    setEditGov(store.governorate ?? "");
    setEditWilayat(store.wilayat ?? "");
    setEditArea(store.area ?? "");
    setEditAddress(store.address ?? "");
    setDeviceConfirmPhone(store.device_confirm_phone ?? "");
    setAutoPrintPaid(store.auto_print_paid_orders ?? true);
    setPickupPolicy(store.pay_at_pickup_print_policy ?? "require_approval");
    setRetention(store.file_retention_policy ?? "twenty_four_hours");
    setPriority(store.paid_orders_priority ?? "urgent");
    setTaxPercent(
      store.tax_rate_bps != null
        ? String((store.tax_rate_bps / 100).toFixed(2)).replace(/\.00$/, "")
        : "0",
    );
  }, [store]);

  const flash = (ok: string | null, err: string | null = null) => {
    setSaveMsg(ok);
    setSaveErr(err);
  };

  const saveStore = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    flash(null);
    try {
      await shopApi.updateStore(token, {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        governorate: editGov.trim() || null,
        wilayat: editWilayat.trim() || null,
        area: editArea.trim() || null,
        address: editAddress.trim() || null,
      });
      await refreshMe();
      flash("تم حفظ بيانات المكتبة");
    } catch (err) {
      flash(null, err instanceof Error ? err.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const saveDeviceSecurity = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (devicePassword.length < 6) {
      flash(null, "كلمة مرور الجهاز يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (devicePassword !== devicePasswordConfirm) {
      flash(null, "كلمتا مرور الجهاز غير متطابقتين");
      return;
    }
    setSaving(true);
    flash(null);
    try {
      await shopApi.setDeviceSecurity(token, {
        device_password: devicePassword,
        device_confirm_phone: deviceConfirmPhone.trim(),
      });
      setDevicePassword("");
      setDevicePasswordConfirm("");
      await refreshMe();
      flash("تم حفظ أمان الجهاز");
    } catch (err) {
      flash(null, err instanceof Error ? err.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const patchOps = async (
    body: Parameters<typeof shopApi.updateStore>[1],
    okMsg: string,
  ) => {
    if (!token) return;
    setOpsBusy(true);
    flash(null);
    try {
      await shopApi.updateStore(token, body);
      await refreshMe();
      flash(okMsg);
    } catch (err) {
      flash(null, err instanceof Error ? err.message : "فشل الحفظ");
      await refreshMe().catch(() => undefined);
    } finally {
      setOpsBusy(false);
    }
  };

  const saveTax = async (e: FormEvent) => {
    e.preventDefault();
    const pct = Number(taxPercent.replace(",", "."));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      flash(null, "نسبة الضريبة يجب أن تكون بين 0 و 100");
      return;
    }
    await patchOps(
      { tax_rate_bps: Math.round(pct * 100) },
      "تم حفظ نسبة الضريبة",
    );
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
    if (!saveMsg && !saveErr) return;
    const id = window.setTimeout(() => {
      setSaveMsg(null);
      setSaveErr(null);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [saveMsg, saveErr]);

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
    <div className="page-fit gap-2 overflow-hidden">
      <PageHeading
        icon={Icons.settings({ size: 22 })}
        title="الإعدادات"
        description="طباعة وتشغيل المكتبة، بياناتها، وأمان هذا الجهاز"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-meta text-text-muted tabular-nums" dir="ltr">
              {APP_VERSION}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={updateBusy}
              onClick={() => void runUpdateCheck()}
              className="min-w-[10rem] !py-1.5"
            >
              {!updateMsg || updateBusy ? Icons.refresh({ size: 14 }) : null}
              {updateButtonLabel}
            </Button>
          </div>
        }
      />

      {(saveMsg || saveErr) && (
        <div
          className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-caption ${
            saveErr
              ? "border-danger/30 bg-danger/10 text-danger"
              : "border-success/30 bg-success/10 text-success"
          }`}
        >
          {saveErr ?? saveMsg}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-2">
        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <SectionTitle
            title="الطباعة والتشغيل"
            icon={Icons.printer({ size: 13 })}
          />
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2.5">
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
                    ? "تم تفعيل الطباعة التلقائية للمدفوع مسبقاً"
                    : "تم إيقاف الطباعة التلقائية للمدفوع مسبقاً",
                );
              }}
            />

            <div className="grid min-h-0 grid-cols-1 gap-2 sm:grid-cols-2">
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
              <form
                className="flex min-w-0 items-end gap-2"
                onSubmit={(e) => void saveTax(e)}
              >
                <label className="min-w-0 flex-1 space-y-0.5">
                  <span className="text-caption text-text-muted">الضريبة %</span>
                  <Input
                    dir="ltr"
                    inputMode="decimal"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    placeholder="0"
                    className="!py-1.5"
                  />
                </label>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={opsBusy || saving || !token}
                  className="shrink-0 !px-2.5 !py-1.5"
                >
                  حفظ
                </Button>
              </form>
            </div>

            <p className="mt-auto text-caption text-text-muted">
              الدفع داخل المكتبة لا يطبع تلقائياً — استخدم زر الطباعة.
            </p>
          </div>
        </Panel>

        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <SectionTitle title="أمان الجهاز" icon={Icons.settings({ size: 13 })} />
          <form
            className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2.5"
            onSubmit={(e) => void saveDeviceSecurity(e)}
          >
            <label className="block space-y-0.5">
              <span className="text-caption text-text-muted">هاتف تأكيد OTP</span>
              <Input
                dir="ltr"
                value={deviceConfirmPhone}
                onChange={(e) => setDeviceConfirmPhone(e.target.value)}
                placeholder="+968…"
                required
                className="!py-1.5"
              />
            </label>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <label className="block space-y-0.5">
                <span className="text-caption text-text-muted">
                  كلمة مرور الجهاز الجديدة
                </span>
                <Input
                  type="password"
                  dir="ltr"
                  value={devicePassword}
                  onChange={(e) => setDevicePassword(e.target.value)}
                  minLength={6}
                  required
                  className="!py-1.5"
                />
              </label>
              <label className="block space-y-0.5">
                <span className="text-caption text-text-muted">تأكيد كلمة المرور</span>
                <Input
                  type="password"
                  dir="ltr"
                  value={devicePasswordConfirm}
                  onChange={(e) => setDevicePasswordConfirm(e.target.value)}
                  minLength={6}
                  required
                  className="!py-1.5"
                />
              </label>
            </div>
            <Button
              type="submit"
              disabled={saving || !token}
              className="mt-auto w-full shrink-0 !py-1.5 sm:w-auto"
            >
              {saving ? "جاري الحفظ…" : "حفظ أمان الجهاز"}
            </Button>
          </form>
        </Panel>

        <Panel className="flex min-h-0 flex-col overflow-hidden lg:col-span-2">
          <SectionTitle title="بيانات المكتبة" icon={Icons.bag({ size: 13 })} />
          <form
            className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2.5"
            onSubmit={(e) => void saveStore(e)}
          >
            <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-x-2 gap-y-1.5 lg:grid-cols-3">
              <label className="block space-y-0.5">
                <span className="text-caption text-text-muted">الاسم</span>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="!py-1.5"
                />
              </label>
              <label className="block space-y-0.5">
                <span className="text-caption text-text-muted">الهاتف</span>
                <Input
                  dir="ltr"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+968…"
                  className="!py-1.5"
                />
              </label>
              <label className="block space-y-0.5">
                <span className="text-caption text-text-muted">المحافظة</span>
                <Input
                  value={editGov}
                  onChange={(e) => setEditGov(e.target.value)}
                  className="!py-1.5"
                />
              </label>
              <label className="block space-y-0.5">
                <span className="text-caption text-text-muted">الولاية</span>
                <Input
                  value={editWilayat}
                  onChange={(e) => setEditWilayat(e.target.value)}
                  className="!py-1.5"
                />
              </label>
              <label className="block space-y-0.5">
                <span className="text-caption text-text-muted">المنطقة</span>
                <Input
                  value={editArea}
                  onChange={(e) => setEditArea(e.target.value)}
                  className="!py-1.5"
                />
              </label>
              <label className="block space-y-0.5">
                <span className="text-caption text-text-muted">العنوان</span>
                <Input
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="!py-1.5"
                />
              </label>
            </div>
            <Button
              type="submit"
              disabled={saving || !token}
              className="w-full shrink-0 !py-1.5 sm:w-auto"
            >
              {saving ? "جاري الحفظ…" : "حفظ بيانات المكتبة"}
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
