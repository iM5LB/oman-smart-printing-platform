import { useState } from "react";
import { useAuth } from "../lib/auth";
import { getApiBase, setApiBase, shopApi } from "../lib/api";
import { Badge, Button, Input, Panel } from "../components/ui";
import { Icons } from "../components/icons";
import { PageHeading } from "../components/PageHeading";
import { deviceStatusAr, pickupPolicyAr } from "../lib/labels";
import type { ReactNode } from "react";

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border-default/80 bg-bg-elevated/60 px-3.5 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-caption text-text-muted">{label}</p>
        <div className="mt-0.5 text-body font-medium text-text-primary">{children}</div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { me, logout, token, refreshMe } = useAuth();
  const [apiBase, setApiBaseInput] = useState(() => getApiBase());
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"ok" | "err">("ok");
  const [busy, setBusy] = useState(false);

  const deviceOnline =
    me?.device.status === "connected" || me?.device.status === "online";

  const saveApi = async () => {
    setApiBase(apiBase);
    setMsgTone("ok");
    setMsg("تم حفظ عنوان الـ API.");
    if (!token) return;
    setBusy(true);
    try {
      await refreshMe();
      setMsgTone("ok");
      setMsg("تم التحقق من الاتصال بنجاح.");
    } catch (e) {
      setMsgTone("err");
      setMsg(e instanceof Error ? e.message : "تعذر التحقق");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-fit">
      <PageHeading
        icon={Icons.settings({ size: 22 })}
        title="الإعدادات"
        description="بيانات المكتبة والجهاز واتصال السحابة"
      />

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-2.5 border-b border-border-default px-3.5 py-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
              {Icons.home({ size: 15 })}
            </div>
            <div>
              <h2 className="text-section">المكتبة والجهاز</h2>
              <p className="text-caption text-text-muted">معلومات التشغيل الحالية</p>
            </div>
          </div>

          <div className="scroll-y min-h-0 flex-1 space-y-2.5 p-3">
            <InfoRow icon={Icons.bag({ size: 16 })} label="اسم المكتبة">
              {me?.store.name ?? "—"}
            </InfoRow>
            <InfoRow icon={Icons.tag({ size: 16 })} label="المعرّف">
              <span dir="ltr">{me?.store.slug ?? "—"}</span>
            </InfoRow>
            <InfoRow icon={Icons.phone({ size: 16 })} label="هاتف المكتبة">
              <span dir="ltr">{me?.store.phone ?? "—"}</span>
            </InfoRow>
            <InfoRow icon={Icons.printer({ size: 16 })} label="الجهاز">
              <div className="flex flex-wrap items-center gap-2">
                <span>{me?.device.name ?? "—"}</span>
                <Badge tone={deviceOnline ? "success" : "warning"}>
                  {deviceStatusAr(me?.device.status)}
                </Badge>
              </div>
            </InfoRow>
            <InfoRow icon={Icons.checkCircle({ size: 16 })} label="طباعة تلقائية للمدفوع">
              <Badge tone={me?.store.auto_print_paid_orders ? "success" : "neutral"}>
                {me?.store.auto_print_paid_orders ? "مفعّلة" : "متوقفة"}
              </Badge>
            </InfoRow>
            <InfoRow icon={Icons.queue({ size: 16 })} label="سياسة الدفع عند الاستلام">
              {pickupPolicyAr(me?.store.pay_at_pickup_print_policy)}
            </InfoRow>
          </div>
        </Panel>

        <div className="flex min-h-0 flex-col gap-3">
          <Panel className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-2.5 border-b border-border-default px-3.5 py-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-success/15 text-success">
                {Icons.settings({ size: 15 })}
              </div>
              <div>
                <h2 className="text-section">الاتصال</h2>
                <p className="text-caption text-text-muted">عنوان واجهة البرمجة</p>
              </div>
            </div>

            <div className="scroll-y min-h-0 flex-1 space-y-3 p-3.5">
              <label className="block space-y-1.5">
                <span className="text-meta text-text-muted">عنوان الـ API</span>
                <Input
                  dir="ltr"
                  value={apiBase}
                  placeholder="http://localhost:4000"
                  onChange={(e) => setApiBaseInput(e.target.value)}
                />
              </label>

              <div className="rounded-xl border border-border-default bg-bg-elevated px-3.5 py-2.5">
                <p className="text-caption text-text-muted">النشط حالياً</p>
                <p className="mt-0.5 truncate text-meta font-medium text-text-secondary" dir="ltr">
                  {shopApi.apiUrl}
                </p>
              </div>

              {msg ? (
                <p
                  className={`rounded-lg px-3 py-2 text-meta ${
                    msgTone === "ok"
                      ? "bg-success/10 text-success"
                      : "bg-danger/10 text-danger"
                  }`}
                >
                  {msg}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={busy} onClick={() => void saveApi()}>
                  {busy ? "جاري التحقق…" : "حفظ والتحقق"}
                </Button>
                <Button type="button" variant="danger" onClick={logout}>
                  {Icons.logout({ size: 15 })}
                  تسجيل الخروج
                </Button>
              </div>
            </div>
          </Panel>

          <Panel className="shrink-0 overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-border-default px-3.5 py-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-warning/15 text-warning">
                {Icons.bell({ size: 15 })}
              </div>
              <h2 className="text-section">اختصارات ومعلومات</h2>
            </div>
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border-default bg-bg-elevated px-3 py-2.5">
                <p className="text-caption text-text-muted">الاستلام السريع</p>
                <p className="mt-0.5 text-body font-semibold">
                  F2 <span className="font-normal text-text-secondary">· صفحة الاستلام</span>
                </p>
              </div>
              <div className="rounded-xl border border-border-default bg-bg-elevated px-3 py-2.5">
                <p className="text-caption text-text-muted">الإصدار</p>
                <p className="mt-0.5 text-body font-semibold">v0.1.0</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
