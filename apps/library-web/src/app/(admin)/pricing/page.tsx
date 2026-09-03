'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchPricing,
  FinishingService,
  PricingRule,
  updateFinishing,
  updatePricingRule,
} from '@/lib/api';

export default function PricingPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [finishing, setFinishing] = useState<FinishingService[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const data = await fetchPricing();
    setRules(data.rules);
    setFinishing(data.finishing);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'فشل'));
  }, [load]);

  return (
    <div className="animate-fade-in-up space-y-5">
      <h1 className="text-xl font-semibold">الأسعار</h1>
      {(error || notice) && (
        <div className={`card px-4 py-3 text-sm ${error ? 'text-danger' : 'text-success'}`}>
          {error || notice}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {rules.map((r) => (
          <form
            key={r.id}
            className="card space-y-3 p-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              try {
                await updatePricingRule(r.id, Number(fd.get('price_per_page')));
                setNotice('تم الحفظ');
                await load();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'فشل');
              }
            }}
          >
            <p className="font-medium">
              {r.paper_size} · {r.color_mode === 'color' ? 'ملون' : 'أبيض وأسود'}
            </p>
            <input
              name="price_per_page"
              type="number"
              className="input-field"
              dir="ltr"
              defaultValue={r.price_per_page}
              key={`${r.id}-${r.price_per_page}`}
            />
            <button type="submit" className="btn-primary">
              حفظ
            </button>
          </form>
        ))}
      </div>
      {finishing.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {finishing.map((f) => (
            <form
              key={f.id}
              className="card space-y-3 p-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                try {
                  await updateFinishing(f.id, Number(fd.get('price_baisa')));
                  setNotice('تم الحفظ');
                  await load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'فشل');
                }
              }}
            >
              <p className="font-medium">{f.name_ar}</p>
              <input
                name="price_baisa"
                type="number"
                className="input-field"
                dir="ltr"
                defaultValue={f.price_baisa}
                key={`${f.id}-${f.price_baisa}`}
              />
              <button type="submit" className="btn-primary">
                حفظ
              </button>
            </form>
          ))}
        </div>
      )}
      {rules.length === 0 && finishing.length === 0 && !error && (
        <p className="text-sm text-text-muted">لا أسعار بعد</p>
      )}
    </div>
  );
}
