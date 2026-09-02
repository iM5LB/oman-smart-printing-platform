'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Package, X } from 'lucide-react';
import { ORDER_STATUS_AR, PAYMENT_STATUS_AR } from '@omsp/types';
import {
  fetchMyOrders,
  logoutCustomer,
  requestOtp,
  verifyOtp,
  type MyOrder,
} from '@/lib/api';
import {
  clearCustomerSession,
  getCustomerPhone,
  getCustomerToken,
  setCustomerSession,
} from '@/lib/customer-session';

type Mode = 'phone' | 'code' | 'orders';

interface CustomerAuthPanelProps {
  storeSlug: string;
  open: boolean;
  initialMode?: Mode;
  onClose: () => void;
  onSessionChange?: () => void;
}

export function CustomerAuthPanel({
  storeSlug,
  open,
  initialMode = 'phone',
  onClose,
  onSessionChange,
}: CustomerAuthPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sessionPhone, setSessionPhone] = useState<string | null>(null);
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [selected, setSelected] = useState<MyOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('auth-open');
    return () => document.body.classList.remove('auth-open');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelected(null);
    const token = getCustomerToken();
    const savedPhone = getCustomerPhone();

    if (initialMode === 'orders' && token) {
      setSessionPhone(savedPhone);
      setMode('orders');
      void loadOrders(token);
      return;
    }

    setMode('phone');
    setSessionPhone(savedPhone);
    setOrders([]);
  }, [open, storeSlug, initialMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selected) setSelected(null);
        else onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, selected]);

  async function loadOrders(token: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyOrders(storeSlug, token);
      setOrders(data.orders);
      setSessionPhone(data.phone);
      setMode('orders');
      onSessionChange?.();
    } catch (e) {
      clearCustomerSession();
      setSessionPhone(null);
      setMode('phone');
      setError(e instanceof Error ? e.message : 'انتهت الجلسة');
      onSessionChange?.();
    } finally {
      setLoading(false);
    }
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDevCode(null);
    try {
      const res = await requestOtp(phone);
      setPhone(res.phone);
      if (res.dev_code) setDevCode(res.dev_code);
      setMode('code');
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إرسال الرمز');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await verifyOtp(phone, code);
      setCustomerSession(res.token, res.phone);
      setSessionPhone(res.phone);
      onSessionChange?.();
      await loadOrders(res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'رمز غير صحيح');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    const token = getCustomerToken();
    if (token) {
      try {
        await logoutCustomer(token);
      } catch {
        /* ignore */
      }
    }
    clearCustomerSession();
    setSessionPhone(null);
    setOrders([]);
    setSelected(null);
    setMode('phone');
    setPhone('');
    setCode('');
    setDevCode(null);
    onSessionChange?.();
    onClose();
  }

  if (!mounted || !open) return null;

  const isOrdersFull = mode === 'orders';

  return createPortal(
    <div
      className={`auth-overlay${isOrdersFull ? ' auth-overlay-full' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'orders' ? 'طلباتي' : 'تسجيل الدخول'}
    >
      {!isOrdersFull && (
        <button type="button" className="auth-backdrop" aria-label="إغلاق" onClick={onClose} />
      )}
      <div className={`auth-sheet${isOrdersFull ? ' auth-sheet-full' : ''}`}>
        {!isOrdersFull && <div className="auth-sheet-handle" aria-hidden />}
        <div className="auth-sheet-head">
          {selected ? (
            <button
              type="button"
              className="nav-icon-btn"
              onClick={() => setSelected(null)}
              aria-label="رجوع"
            >
              <ArrowRight className="size-5" />
            </button>
          ) : (
            <h2 className="text-base font-bold">
              {mode === 'orders' ? 'طلباتي' : 'تسجيل الدخول'}
            </h2>
          )}
          <div className="flex items-center gap-2">
            {mode === 'orders' && !selected && sessionPhone && (
              <span className="text-xs text-text-muted" dir="ltr">
                {sessionPhone}
              </span>
            )}
            <button type="button" className="nav-icon-btn" onClick={onClose} aria-label="إغلاق">
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className={`auth-sheet-body${isOrdersFull ? ' auth-sheet-body-full' : ''}`}>
          {mode === 'phone' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <p className="text-sm text-text-muted">
                أدخل رقم هاتفك لعرض طلباتك ومتابعة حالتها
              </p>
              <label className="block">
                <span className="option-label">رقم الهاتف</span>
                <input
                  className="input-field"
                  dir="ltr"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+968 9XXXXXXX أو رقم دولي"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </label>
              {error && <p className="text-sm text-error">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
              </button>
            </form>
          )}

          {mode === 'code' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-sm text-text-muted">
                أدخل الرمز المرسل إلى{' '}
                <span className="font-semibold text-text" dir="ltr">
                  {phone}
                </span>
              </p>
              {devCode && (
                <p className="rounded-lg bg-accent px-3 py-2 text-xs text-primary">
                  للتطوير — الرمز: <strong dir="ltr">{devCode}</strong>
                </p>
              )}
              <label className="block">
                <span className="option-label">رمز التحقق</span>
                <input
                  className="input-field text-center text-lg tracking-[0.35em]"
                  dir="ltr"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
              </label>
              {error && <p className="text-sm text-error">{error}</p>}
              <button type="submit" className="btn-primary w-full" disabled={loading || code.length < 4}>
                {loading ? 'جاري التحقق...' : 'تأكيد الدخول'}
              </button>
              <button
                type="button"
                className="btn-ghost w-full"
                disabled={loading}
                onClick={() => {
                  setMode('phone');
                  setCode('');
                  setError(null);
                }}
              >
                تغيير الرقم
              </button>
            </form>
          )}

          {mode === 'orders' && !selected && (
            <div className="orders-overview">
              {loading && <p className="py-10 text-center text-sm text-text-muted">جاري التحميل...</p>}

              {!loading && orders.length === 0 && (
                <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
                  <Package className="mx-auto mb-2 size-8 text-text-muted" />
                  <p className="text-sm font-medium">لا توجد طلبات بعد</p>
                  <p className="mt-1 text-xs text-text-muted">عند إنشاء طلب بهذا الرقم سيظهر هنا</p>
                </div>
              )}

              {!loading &&
                orders.map((o) => (
                  <button
                    key={o.tracking_token}
                    type="button"
                    className="order-overview-card"
                    onClick={() => setSelected(o)}
                  >
                    <div className="my-orders-card-row">
                      <div className="my-orders-card-main">
                        <p className="font-bold text-primary">{o.order_number}</p>
                        <p className="mt-1 text-sm font-medium">
                          {ORDER_STATUS_AR[o.status] ?? o.status}
                        </p>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {new Date(o.created_at).toLocaleDateString('ar-OM')}
                          {o.files[0] ? ` · ${o.files[0]}` : ''}
                        </p>
                      </div>
                      <span className="my-orders-card-price">{o.total_display}</span>
                    </div>
                  </button>
                ))}
            </div>
          )}

          {mode === 'orders' && selected && (
            <div className="order-detail-view">
              <div className="order-detail-hero">
                <p className="text-2xl font-bold text-primary">{selected.order_number}</p>
                <p className="mt-2 text-base font-semibold">
                  {ORDER_STATUS_AR[selected.status] ?? selected.status}
                </p>
                <p className="mt-1 text-lg font-bold text-text">{selected.total_display}</p>
              </div>

              <div className="order-detail-grid">
                <div>
                  <p className="order-detail-label">الدفع</p>
                  <p className="order-detail-value">
                    {PAYMENT_STATUS_AR[selected.payment_status] ?? selected.payment_status}
                  </p>
                </div>
                <div>
                  <p className="order-detail-label">التاريخ</p>
                  <p className="order-detail-value">
                    {new Date(selected.created_at).toLocaleString('ar-OM')}
                  </p>
                </div>
                <div className="order-detail-full">
                  <p className="order-detail-label">الملفات</p>
                  <ul className="mt-1 space-y-1">
                    {(selected.files.length ? selected.files : ['—']).map((f) => (
                      <li key={f} className="order-detail-value truncate">
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <a
                href={`/track/${selected.tracking_token}`}
                className="btn-primary mt-6 flex w-full items-center justify-center"
              >
                متابعة الحالة
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
