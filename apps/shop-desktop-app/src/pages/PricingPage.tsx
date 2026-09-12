import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "../lib/auth";
import {
  shopApi,
  type FinishingService,
  type PricingRule,
  type ShopPricing,
} from "../lib/api";
import { toUserMessage } from "../lib/errors";
import { useToast } from "../components/Toast";
import { Badge, Button, EmptyState, Input, Panel } from "../components/ui";
import { Icons } from "../components/icons";
import { PageHeading } from "../components/PageHeading";
import { colorModeAr } from "../lib/labels";

function baisaToOmr(baisa: number) {
  if (!Number.isFinite(baisa)) return "—";
  return `${(baisa / 1000).toFixed(3)} ر.ع`;
}

function ActiveSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      dir="rtl"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-1.5 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "border-success/40 bg-success/15"
          : "border-border-default bg-bg-hover/80"
      }`}
      title={checked ? "ظاهر للعملاء — اضغط للإخفاء" : "مخفي عن العملاء — اضغط للإظهار"}
    >
      <span
        className={`text-[11px] font-semibold ${
          checked ? "text-success" : "text-text-muted"
        }`}
      >
        {checked ? "ظاهر" : "مخفي"}
      </span>
      <span
        dir="ltr"
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-success" : "bg-[#3a4558]"
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

function PriceEditorCard({
  title,
  active,
  icon,
  tone,
  display,
  draft,
  dirty,
  saving,
  onChange,
  onSave,
  onToggleActive,
}: {
  title: string;
  active: boolean;
  icon: ReactNode;
  tone: "primary" | "success" | "info" | "warning";
  display: string;
  draft: string;
  dirty: boolean;
  saving: boolean;
  onChange: (v: string) => void;
  onSave: () => void;
  onToggleActive: (next: boolean) => void;
}) {
  const toneBox = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    info: "bg-info/15 text-info",
    warning: "bg-warning/15 text-warning",
  }[tone];

  const preview = baisaToOmr(Number(draft));

  return (
    <li
      className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2.5 transition-colors sm:grid-cols-[auto_minmax(0,1fr)_auto] ${
        !active
          ? "border-border-default/70 bg-bg-base/50"
          : dirty
            ? "border-primary/40 bg-primary/5"
            : "border-border-default bg-bg-elevated"
      }`}
    >
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${toneBox} ${
          active ? "" : "opacity-50"
        }`}
      >
        {icon}
      </div>

      <div className={`min-w-0 ${active ? "" : "opacity-70"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-body font-semibold text-text-primary">
            {title}
          </p>
          {dirty ? <Badge tone="info">معدّل</Badge> : null}
        </div>
        <p className="mt-0.5 truncate text-meta text-text-secondary">
          الحالي: <span className="font-medium text-text-primary">{display}</span>
          <span className="text-text-muted"> · ≈ {preview}</span>
        </p>
      </div>

      <div className="col-span-2 flex flex-wrap items-center justify-end gap-2 sm:col-span-1">
        <ActiveSwitch
          checked={active}
          disabled={saving}
          onChange={onToggleActive}
        />
        <Input
          dir="ltr"
          inputMode="numeric"
          aria-label="السعر بالبيسة"
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          className="!w-20 shrink-0 py-1.5 text-center tabular-nums"
        />
        <Button
          type="button"
          disabled={saving || !dirty}
          onClick={onSave}
          className="shrink-0 px-3 py-1.5"
        >
          {saving ? "…" : "حفظ"}
        </Button>
      </div>
    </li>
  );
}

export function PricingPage() {
  const { token } = useAuth();
  const { push: pushToast } = useToast();
  const [data, setData] = useState<ShopPricing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [draftRules, setDraftRules] = useState<Record<string, string>>({});
  const [draftFinish, setDraftFinish] = useState<Record<string, string>>({});

  const notify = (title: string, ok = true) => {
    pushToast({ title, tone: ok ? "success" : "danger", osNotify: false });
  };

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const pricing = await shopApi.pricing(token);
      setData(pricing);
      const rules: Record<string, string> = {};
      for (const r of pricing.rules) rules[r.id] = String(r.price_per_page);
      setDraftRules(rules);
      const finish: Record<string, string> = {};
      for (const f of pricing.finishing) finish[f.id] = String(f.price_baisa);
      setDraftFinish(finish);
      setError(null);
    } catch (e) {
      setError(toUserMessage(e, "تعذر التحميل"));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirtyCount = useMemo(() => {
    if (!data) return 0;
    let n = 0;
    for (const r of data.rules) {
      if (String(r.price_per_page) !== (draftRules[r.id] ?? "")) n += 1;
    }
    for (const f of data.finishing) {
      if (String(f.price_baisa) !== (draftFinish[f.id] ?? "")) n += 1;
    }
    return n;
  }, [data, draftRules, draftFinish]);

  const saveRule = async (rule: PricingRule) => {
    if (!token) return;
    const value = Number(draftRules[rule.id]);
    if (!Number.isFinite(value) || value < 0) {
      notify("أدخل سعراً صالحاً (بيسة)", false);
      return;
    }
    setSaving(rule.id);
    try {
      await shopApi.updatePricingRule(token, rule.id, {
        price_per_page: Math.round(value),
      });
      notify("تم حفظ قاعدة التسعير");
      await load();
    } catch (e) {
      notify(toUserMessage(e, "فشل الحفظ"), false);
    } finally {
      setSaving(null);
    }
  };

  const toggleRule = async (rule: PricingRule, next: boolean) => {
    if (!token) return;
    setSaving(`toggle-rule-${rule.id}`);
    setData((prev) =>
      prev
        ? {
            ...prev,
            rules: prev.rules.map((r) =>
              r.id === rule.id ? { ...r, is_active: next } : r,
            ),
          }
        : prev,
    );
    try {
      await shopApi.updatePricingRule(token, rule.id, { is_active: next });
      notify(next ? "ظاهر للعملاء" : "مخفي عن العملاء");
    } catch (e) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              rules: prev.rules.map((r) =>
                r.id === rule.id ? { ...r, is_active: rule.is_active } : r,
              ),
            }
          : prev,
      );
      notify(toUserMessage(e, "فشل التحديث"), false);
    } finally {
      setSaving(null);
    }
  };

  const saveFinish = async (svc: FinishingService) => {
    if (!token) return;
    const value = Number(draftFinish[svc.id]);
    if (!Number.isFinite(value) || value < 0) {
      notify("أدخل سعراً صالحاً (بيسة)", false);
      return;
    }
    setSaving(svc.id);
    try {
      await shopApi.updateFinishing(token, svc.id, {
        price_baisa: Math.round(value),
      });
      notify("تم حفظ خدمة التجهيز");
      await load();
    } catch (e) {
      notify(toUserMessage(e, "فشل الحفظ"), false);
    } finally {
      setSaving(null);
    }
  };

  const toggleFinish = async (svc: FinishingService, next: boolean) => {
    if (!token) return;
    setSaving(`toggle-finish-${svc.id}`);
    setData((prev) =>
      prev
        ? {
            ...prev,
            finishing: prev.finishing.map((f) =>
              f.id === svc.id ? { ...f, is_active: next } : f,
            ),
          }
        : prev,
    );
    try {
      await shopApi.updateFinishing(token, svc.id, { is_active: next });
      notify(next ? "ظاهر للعملاء" : "مخفي عن العملاء");
    } catch (e) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              finishing: prev.finishing.map((f) =>
                f.id === svc.id ? { ...f, is_active: svc.is_active } : f,
              ),
            }
          : prev,
      );
      notify(toUserMessage(e, "فشل التحديث"), false);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <EmptyState title="جاري التحميل..." />;
  if (error) return <EmptyState title="تعذر التحميل" detail={error} />;

  return (
    <div className="page-fit">
      <PageHeading
        icon={Icons.pricing({ size: 22 })}
        title="الأسعار"
        description="خيارات الطباعة والتجهيز جاهزة تلقائياً — عدّل السعر أو أخفِ ما لا تقدمه (بالبيسة)"
        actions={
          <>
            {dirtyCount > 0 ? (
              <Badge tone="warning">{dirtyCount} تعديل غير محفوظ</Badge>
            ) : (
              <Badge tone="success">متزامن</Badge>
            )}
            <Button type="button" variant="secondary" onClick={() => void load()}>
              {Icons.refresh({ size: 14 })}
              تحديث
            </Button>
          </>
        }
      />

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-default px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                {Icons.pages({ size: 15 })}
              </div>
              <div>
                <h2 className="text-section">سعر الصفحة</h2>
                <p className="text-caption text-text-muted">A4 · A3 · A5 × أبيض وأسود / ملون / رمادي</p>
              </div>
            </div>
            <Badge tone="info">{data?.rules.length ?? 0}</Badge>
          </div>

          <div className="scroll-y min-h-0 flex-1 space-y-3 p-3">
            {(data?.rules ?? []).length === 0 ? (
              <EmptyState title="لا توجد قواعد تسعير" />
            ) : (
              <ul className="space-y-2">
                {data!.rules.map((r) => {
                  const draft = draftRules[r.id] ?? "";
                  const dirty = String(r.price_per_page) !== draft;
                  return (
                    <PriceEditorCard
                      key={r.id}
                      title={`${r.paper_size} · ${colorModeAr(r.color_mode)}`}
                      active={r.is_active}
                      icon={
                        r.color_mode === "color"
                          ? Icons.color({ size: 16 })
                          : Icons.pages({ size: 16 })
                      }
                      tone={r.color_mode === "color" ? "warning" : "primary"}
                      display={`${r.price_display} / صفحة`}
                      draft={draft}
                      dirty={dirty}
                      saving={
                        saving === r.id || saving === `toggle-rule-${r.id}`
                      }
                      onChange={(v) =>
                        setDraftRules((d) => ({ ...d, [r.id]: v }))
                      }
                      onSave={() => void saveRule(r)}
                      onToggleActive={(next) => void toggleRule(r, next)}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        </Panel>

        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-default px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-success/15 text-success">
                {Icons.staple({ size: 15 })}
              </div>
              <div>
                <h2 className="text-section">خدمات التجهيز</h2>
                <p className="text-caption text-text-muted">تدبيس · تجليد · تغليف · ثقب</p>
              </div>
            </div>
            <Badge tone="success">{data?.finishing.length ?? 0}</Badge>
          </div>

          <div className="scroll-y min-h-0 flex-1 space-y-3 p-3">
            {(data?.finishing ?? []).length === 0 ? (
              <EmptyState title="لا توجد خدمات" />
            ) : (
              <ul className="space-y-2">
                {data!.finishing.map((f) => {
                  const draft = draftFinish[f.id] ?? "";
                  const dirty = String(f.price_baisa) !== draft;
                  return (
                    <PriceEditorCard
                      key={f.id}
                      title={f.name_ar}
                      active={f.is_active}
                      icon={Icons.staple({ size: 16 })}
                      tone="success"
                      display={f.price_display}
                      draft={draft}
                      dirty={dirty}
                      saving={
                        saving === f.id || saving === `toggle-finish-${f.id}`
                      }
                      onChange={(v) =>
                        setDraftFinish((d) => ({ ...d, [f.id]: v }))
                      }
                      onSave={() => void saveFinish(f)}
                      onToggleActive={(next) => void toggleFinish(f, next)}
                    />
                  );
                })}
              </ul>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
