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
import { WhatsAppBotPanel } from "../components/WhatsAppBotPanel";

const APP_VERSION = "v0.1.1";

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

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGov, setEditGov] = useState("");
  const [editWilayat, setEditWilayat] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [devicePassword, setDevicePassword] = useState("");
  const [devicePasswordConfirm, setDevicePasswordConfirm] = useState("");
  const [deviceConfirmPhone, setDeviceConfirmPhone] = useState("");

  useEffect(() => {
    if (!store) return;
    setEditName(store.name ?? "");
    setEditPhone(store.phone ?? "");
    setEditGov(store.governorate ?? "");
    setEditWilayat(store.wilayat ?? "");
    setEditArea(store.area ?? "");
    setEditAddress(store.address ?? "");
    setDeviceConfirmPhone(store.device_confirm_phone ?? "");
  }, [store]);

  const saveStore = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSaveErr(null);
    setSaveMsg(null);
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
      setSaveMsg("تم حفظ بيانات المكتبة");
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const saveDeviceSecurity = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (devicePassword.length < 6) {
      setSaveErr("كلمة مرور الجهاز يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (devicePassword !== devicePasswordConfirm) {
      setSaveErr("كلمتا مرور الجهاز غير متطابقتين");
      return;
    }
    setSaving(true);
    setSaveErr(null);
    setSaveMsg(null);
    try {
      await shopApi.setDeviceSecurity(token, {
        device_password: devicePassword,
        device_confirm_phone: deviceConfirmPhone.trim(),
      });
      setDevicePassword("");
      setDevicePasswordConfirm("");
      await refreshMe();
      setSaveMsg("تم حفظ أمان الجهاز");
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "فشل الحفظ");
    } finally {
      setSaving(false);
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
    <div className="page-fit gap-2.5">
      <PageHeading
        icon={Icons.settings({ size: 22 })}
        title="الإعدادات"
        description="تعديل بيانات المكتبة وأمان الجهاز وربط واتساب OTP"
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
              className="min-w-[11rem]"
            >
              {!updateMsg || updateBusy ? Icons.refresh({ size: 14 }) : null}
              {updateButtonLabel}
            </Button>
          </div>
        }
      />

      {(saveMsg || saveErr) && (
        <div
          className={`rounded-xl border px-3 py-2 text-meta ${
            saveErr
              ? "border-danger/30 bg-danger/10 text-danger"
              : "border-success/30 bg-success/10 text-success"
          }`}
        >
          {saveErr ?? saveMsg}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-auto lg:grid-cols-2 lg:overflow-hidden">
        <div className="flex min-h-0 flex-col gap-2.5 lg:overflow-auto">
          <Panel className="overflow-hidden">
            <SectionTitle title="بيانات المكتبة" icon={Icons.bag({ size: 14 })} />
            <form className="space-y-2.5 p-3" onSubmit={(e) => void saveStore(e)}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-caption text-text-muted">الاسم</span>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-caption text-text-muted">الهاتف</span>
                  <Input
                    dir="ltr"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+968…"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-caption text-text-muted">المحافظة</span>
                  <Input
                    value={editGov}
                    onChange={(e) => setEditGov(e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-caption text-text-muted">الولاية</span>
                  <Input
                    value={editWilayat}
                    onChange={(e) => setEditWilayat(e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-caption text-text-muted">المنطقة</span>
                  <Input
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-caption text-text-muted">العنوان</span>
                  <Input
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                  />
                </label>
              </div>
              <Button
                type="submit"
                disabled={saving || !token}
                className="w-full sm:w-auto"
              >
                {saving ? "جاري الحفظ…" : "حفظ بيانات المكتبة"}
              </Button>
            </form>
          </Panel>

          <Panel className="overflow-hidden">
            <SectionTitle title="أمان الجهاز" icon={Icons.settings({ size: 14 })} />
            <form
              className="space-y-2.5 p-3"
              onSubmit={(e) => void saveDeviceSecurity(e)}
            >
              <label className="block space-y-1">
                <span className="text-caption text-text-muted">هاتف تأكيد OTP</span>
                <Input
                  dir="ltr"
                  value={deviceConfirmPhone}
                  onChange={(e) => setDeviceConfirmPhone(e.target.value)}
                  placeholder="+968…"
                  required
                />
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block space-y-1">
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
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-caption text-text-muted">تأكيد كلمة المرور</span>
                  <Input
                    type="password"
                    dir="ltr"
                    value={devicePasswordConfirm}
                    onChange={(e) => setDevicePasswordConfirm(e.target.value)}
                    minLength={6}
                    required
                  />
                </label>
              </div>
              <Button
                type="submit"
                disabled={saving || !token}
                className="w-full sm:w-auto"
              >
                {saving ? "جاري الحفظ…" : "حفظ أمان الجهاز"}
              </Button>
            </form>
          </Panel>
        </div>

        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <SectionTitle title="بوت واتساب OTP" icon={Icons.phone({ size: 14 })} />
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <WhatsAppBotPanel />
          </div>
        </Panel>
      </div>
    </div>
  );
}
