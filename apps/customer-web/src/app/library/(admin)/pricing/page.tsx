'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Tags } from 'lucide-react';
import {
  fetchLibraryPricing,
  FinishingService,
  PricingRule,
  updateLibraryFinishing,
  updateLibraryPricingRule,
} from '@/lib/library-api';
import { PageHeading } from '@/components/library-admin/page-heading';

export default function LibraryPricingPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [finishing, setFinishing] = useState<FinishingService[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchLibraryPricing();
    setRules(data.rules);
    setFinishing(data.finishing);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'فشل التحميل'));
  }, [load]);

  async function saveRule(e: FormEvent<HTMLFormElement>, ruleId: string) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const baisa = Number(fd.get('price_per_page'));
    try {
      await updateLibraryPricingRule(ruleId, baisa);
      setNotice('تم تحديث السعر');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  }

  async function saveFinishing(e: FormEvent<HTMLFormElement>, serviceId: string) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    const baisa = Number(fd.get('price_baisa'));
    try {
      await updateLibraryFinishing(serviceId, baisa);
      setNotice('تم تحديث خدمة التجهيز');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل الحفظ');
    } finally {
      setLoading(false);
    }
  }

  const colorLabel = (mode: string) => (mode === 'color' ? 'ملون' : 'أبيض وأسود');

  return (
    <div>
      <PageHeading
        icon={<Tags className="size-5" />}
        title="الأسعار"
        description="تسعير الطباعة وخدمات التجهيز (بالبيسة)"
      />

      {(error || notice) && (
        <div
          className={`admin-card mb-4 px-4 py-3 text-sm ${
            error ? 'text-[var(--admin-danger)]' : 'text-[var(--admin-success)]'
          }`}
        >
          {error || notice}
        </div>
      )}

      <section className="mb-5">
        <h2 className="mb-3 font-semibold text-[var(--admin-text)]">قواعد الطباعة</h2>
        {rules.length === 0 ? (
          <div className="admin-card px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">
            لا قواعد تسعير بعد — تُنشأ تلقائياً عند إعداد المكتبة
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rules.map((r) => (
              <form
                key={r.id}
                onSubmit={(e) => saveRule(e, r.id)}
                className="admin-card space-y-3 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {r.paper_size} · {colorLabel(r.color_mode)}
                  </p>
                  <span className="text-xs text-[var(--admin-text-muted)]">{r.price_display}</span>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-[var(--admin-text-muted)]">
                    السعر لكل صفحة (بيسة)
                  </label>
                  <input
                    name="price_per_page"
                    type="number"
                    min={0}
                    step={1}
                    className="admin-input"
                    dir="ltr"
                    defaultValue={r.price_per_page}
                    key={`${r.id}-${r.price_per_page}`}
                  />
                </div>
                <button type="submit" className="admin-btn-primary" disabled={loading}>
                  حفظ
                </button>
              </form>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-[var(--admin-text)]">خدمات التجهيز</h2>
        {finishing.length === 0 ? (
          <div className="admin-card px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">
            لا خدمات تجهيز مضافة بعد
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {finishing.map((f) => (
              <form
                key={f.id}
                onSubmit={(e) => saveFinishing(e, f.id)}
                className="admin-card space-y-3 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{f.name_ar}</p>
                  <span className="text-xs text-[var(--admin-text-muted)]">{f.price_display}</span>
                </div>
                {f.description ? (
                  <p className="text-xs text-[var(--admin-text-muted)]">{f.description}</p>
                ) : null}
                <div>
                  <label className="mb-1.5 block text-xs text-[var(--admin-text-muted)]">
                    السعر (بيسة)
                  </label>
                  <input
                    name="price_baisa"
                    type="number"
                    min={0}
                    step={1}
                    className="admin-input"
                    dir="ltr"
                    defaultValue={f.price_baisa}
                    key={`${f.id}-${f.price_baisa}`}
                  />
                </div>
                <button type="submit" className="admin-btn-primary" disabled={loading}>
                  حفظ
                </button>
              </form>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
