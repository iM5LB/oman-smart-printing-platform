import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "../lib/auth";
import {
  shopApi,
  type FinishingService,
  type PricingRule,
  type ShopPricing,
} from "../lib/api";
import { Badge, Button, EmptyState, Input, Panel } from "../components/ui";
import { Icons } from "../components/icons";
import { PageHeading } from "../components/PageHeading";
import { colorModeAr } from "../lib/labels";

function baisaToOmr(baisa: number) {
  if (!Number.isFinite(baisa)) return "—";
  return `${(baisa / 1000).toFixed(3)} ر.ع`;
}

function PriceEditorCard({
  title,
  subtitle,
  icon,
  tone,
  display,
  draft,
  dirty,
  saving,
  onChange,
  onSave,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  tone: "primary" | "success" | "info" | "warning";
  display: string;
  draft: string;
  dirty: boolean;
  saving: boolean;
  onChange: (v: string) => void;
  onSave: () => void;
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
      className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2.5 transition-colors ${
        dirty
          ? "border-primary/40 bg-primary/5"
          : "border-border-default bg-bg-elevated"
      }`}
    >
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${toneBox}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-body font-semibold text-text-primary">
            {title}
          </p>
          {dirty ? <Badge tone="info">معدّل</Badge> : null}
          {subtitle ? (
            <span className="text-meta text-text-muted">{subtitle}</span>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-meta text-text-secondary">
          الحالي: <span className="font-medium text-text-primary">{display}</span>
          <span className="text-text-muted"> · ≈ {preview}</span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
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
  const [data, setData] = useState<ShopPricing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [draftRules, setDraftRules] = useState<Record<string, string>>({});
  const [draftFinish, setDraftFinish] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(true);

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
      setError(e instanceof Error ? e.message : "تعذر التحميل");
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
      setMsgOk(false);
      setMsg("أدخل سعراً صالحاً (بيسة)");
      return;
    }
    setSaving(rule.id);
    setMsg(null);
    try {
      await shopApi.updatePricingRule(token, rule.id, Math.round(value));
      setMsgOk(true);
      setMsg("تم حفظ قاعدة التسعير");
      await load();
    } catch (e) {
      setMsgOk(false);
      setMsg(e instanceof Error ? e.message : "فشل الحفظ");
    } finally {
      setSaving(null);
    }
  };

  const saveFinish = async (svc: FinishingService) => {
    if (!token) return;
    const value = Number(draftFinish[svc.id]);
    if (!Number.isFinite(value) || value < 0) {
      setMsgOk(false);
      setMsg("أدخل سعراً صالحاً (بيسة)");
      return;
    }
    setSaving(svc.id);
    setMsg(null);
    try {
      await shopApi.updateFinishing(token, svc.id, Math.round(value));
      setMsgOk(true);
      setMsg("تم حفظ خدمة التجهيز");
      await load();
    } catch (e) {
      setMsgOk(false);
      setMsg(e instanceof Error ? e.message : "فشل الحفظ");
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
        description="سعر الصفحة وخدمات التجهيز — الإدخال بالبيسة (1000 = 1 ر.ع)"
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

      {msg ? (
        <div
          className={`shrink-0 rounded-xl border px-3.5 py-2.5 text-meta ${
            msgOk
              ? "border-success/25 bg-success/10 text-success"
              : "border-danger/25 bg-danger/10 text-danger"
          }`}
        >
          {msg}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-default px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                {Icons.pages({ size: 15 })}
              </div>
              <div>
                <h2 className="text-section">سعر الصفحة</h2>
                <p className="text-caption text-text-muted">حسب المقاس واللون</p>
              </div>
            </div>
            <Badge tone="info">{data?.rules.length ?? 0}</Badge>
          </div>

          <div className="scroll-y min-h-0 flex-1 p-3">
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
                      subtitle={r.is_active ? "نشط" : "غير نشط"}
                      icon={
                        r.color_mode === "color"
                          ? Icons.color({ size: 16 })
                          : Icons.pages({ size: 16 })
                      }
                      tone={r.color_mode === "color" ? "warning" : "primary"}
                      display={`${r.price_display} / صفحة`}
                      draft={draft}
                      dirty={dirty}
                      saving={saving === r.id}
                      onChange={(v) =>
                        setDraftRules((d) => ({ ...d, [r.id]: v }))
                      }
                      onSave={() => void saveRule(r)}
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
                <p className="text-caption text-text-muted">تدبيس وتغليف وغيرها</p>
              </div>
            </div>
            <Badge tone="success">{data?.finishing.length ?? 0}</Badge>
          </div>

          <div className="scroll-y min-h-0 flex-1 p-3">
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
                      subtitle={f.is_active ? "نشط" : "غير نشط"}
                      icon={Icons.staple({ size: 16 })}
                      tone="success"
                      display={f.price_display}
                      draft={draft}
                      dirty={dirty}
                      saving={saving === f.id}
                      onChange={(v) =>
                        setDraftFinish((d) => ({ ...d, [f.id]: v }))
                      }
                      onSave={() => void saveFinish(f)}
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
