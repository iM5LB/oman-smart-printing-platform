'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Upload,
} from 'lucide-react';
import type { StorePublicInfo } from '@omsp/types';
import { COLOR_MODE_AR, PAPER_SIZE_AR, PRINT_SIDES_AR } from '@omsp/types';
import { formatOMR } from '@omsp/shared';
import { FileUploadZone } from '@/components/file-upload-zone';
import type { Step } from '@/components/order-flow-types';
import { StepIndicator } from '@/components/step-indicator';
import { StatusTimeline } from '@/components/status-timeline';
import { StoreFooter } from '@/components/store-footer';
import { StoreInfoCard } from '@/components/store-info-card';
import { StoreNavbar } from '@/components/store-navbar';
import { getCustomerPhone, isLoggedIn } from '@/lib/customer-session';
import { cn } from '@/lib/utils';
import type { SelectedFile } from '@/lib/files';
import {
  createOrder,
  getOrderConfig,
  quoteOrder,
  uploadFile,
  type OrderConfig,
  type OrderItemInput,
  type QuoteResult,
  type UploadedFile,
} from '@/lib/api';

interface ItemConfig {
  upload: UploadedFile;
  color_mode: 'bw' | 'color';
  paper_size: 'A4' | 'A3';
  sides: 'single' | 'duplex_long';
  copies: number;
  finishing_service_ids: string[];
}

interface OrderFlowProps {
  store: StorePublicInfo;
}

export function OrderFlow({ store }: OrderFlowProps) {
  const [step, setStep] = useState<Step>('landing');
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [items, setItems] = useState<ItemConfig[]>([]);
  const [config, setConfig] = useState<OrderConfig | null>(null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pay_at_pickup' | 'online'>('pay_at_pickup');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<{
    order_number: string;
    tracking_token: string;
    total_display: string;
    status?: string;
    payment_url?: string;
  } | null>(null);

  useEffect(() => {
    getOrderConfig(store.slug).then(setConfig).catch(() => {});
  }, [store.slug]);

  useEffect(() => {
    if (step !== 'checkout') return;
    if (!isLoggedIn()) return;
    const phone = getCustomerPhone();
    if (phone) setCustomerPhone((prev) => prev || phone);
  }, [step]);

  const handleContinueFromUpload = useCallback(async () => {
    const valid = files.filter((f) => !f.error);
    if (!valid.length) return;

    setUploading(true);
    setUploadError(null);
    try {
      const uploaded: ItemConfig[] = [];
      for (const f of valid) {
        const result = await uploadFile(store.slug, f.file);
        uploaded.push({
          upload: { ...result, original_filename: f.name },
          color_mode: 'bw',
          paper_size: 'A4',
          sides: 'single',
          copies: 1,
          finishing_service_ids: [],
        });
      }
      setItems(uploaded);
      setStep('options');
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'فشل رفع الملفات');
    } finally {
      setUploading(false);
    }
  }, [files, store.slug]);

  const buildOrderItems = useCallback((): OrderItemInput[] => {
    return items.map((item) => ({
      file_key: item.upload.file_key,
      original_filename: item.upload.original_filename,
      page_count: item.upload.page_count,
      mime_type: item.upload.mime_type,
      file_size_bytes: item.upload.file_size_bytes,
      color_mode: item.color_mode,
      paper_size: item.paper_size,
      sides: item.sides,
      copies: item.copies,
      finishing_service_ids: item.finishing_service_ids,
    }));
  }, [items]);

  const refreshQuote = useCallback(async () => {
    if (!items.length) return;
    try {
      const result = await quoteOrder(store.slug, buildOrderItems());
      setQuote(result);
    } catch {
      setQuote(null);
    }
  }, [items, store.slug, buildOrderItems]);

  useEffect(() => {
    if (step === 'options' || step === 'checkout') refreshQuote();
  }, [step, items, refreshQuote]);

  const updateItem = (index: number, patch: Partial<ItemConfig>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createOrder(store.slug, {
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone,
        customer_notes: customerNotes || undefined,
        payment_method: paymentMethod,
        items: buildOrderItems(),
      });
      setOrderResult({
        order_number: result.order_number,
        tracking_token: result.tracking_token,
        total_display: result.total_display,
        status: result.status,
        payment_url: result.payment_url,
      });
      setStep('done');
      if (result.requires_payment && result.payment_url) {
        window.location.href = result.payment_url;
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'فشل إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  const fitBody = step === 'upload' || step === 'landing';

  return (
    <div className="page-shell">
      <div className="page-content animate-fade-in">
        <StoreNavbar store={store} />
        <StepIndicator current={step} />

        <div className={`page-body px-4 ${fitBody ? 'page-body-fit' : 'page-body-scroll'}`}>
          {step === 'landing' && (
            <div className="landing-layout animate-fade-in-up">
              <div className="landing-hero">
                <h2 className="landing-title">اطبع ملفاتك بسهولة</h2>
                <p className="landing-sub">ارفع ملفاتك واطلب الطباعة قبل وصولك للمكتبة</p>
              </div>

              <button type="button" className="btn-primary landing-cta flex w-full items-center justify-center gap-2" onClick={() => setStep('upload')}>
                <Upload className="size-5" />
                رفع الملفات
              </button>

              <StoreInfoCard store={store} compact fill />
            </div>
          )}

          {step === 'upload' && (
            <div className="flex h-full min-h-0 flex-col py-3">
              <div className="upload-heading shrink-0 pb-3">
                <p className="upload-heading-desc">PDF أو صور — حتى 50 ميغابايت</p>
                <h2 className="upload-heading-title">رفع الملفات</h2>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <FileUploadZone files={files} onFilesChange={setFiles} disabled={uploading} compact showContinue={false} />
              </div>

              {uploadError && <p className="shrink-0 pt-2 text-center text-xs text-error">{uploadError}</p>}
            </div>
          )}

          {step === 'options' && (
            <div className="space-y-4 py-3 animate-fade-in-up">
              <h2 className="text-lg font-bold">خيارات الطباعة</h2>
              {items.map((item, i) => (
                <div key={item.upload.file_key} className="card space-y-4 p-4">
                  <div>
                    <p className="truncate text-sm font-bold">{item.upload.original_filename}</p>
                    <p className="text-xs text-text-muted">{item.upload.page_count} صفحة</p>
                  </div>

                  <div>
                    <span className="option-label">عدد النسخ</span>
                    <div className="stepper">
                      <button type="button" className="stepper-btn" onClick={() => updateItem(i, { copies: Math.max(1, item.copies - 1) })}>−</button>
                      <span className="stepper-value">{item.copies}</span>
                      <button type="button" className="stepper-btn" onClick={() => updateItem(i, { copies: Math.min(99, item.copies + 1) })}>+</button>
                    </div>
                  </div>

                  <div>
                    <span className="option-label">نوع الطباعة</span>
                    <div className="option-pills">
                      {(['bw', 'color'] as const).map((mode) => (
                        <button key={mode} type="button" className={cn('option-pill', item.color_mode === mode && 'option-pill-active')} onClick={() => updateItem(i, { color_mode: mode })}>
                          {COLOR_MODE_AR[mode]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="option-label">حجم الورق</span>
                    <div className="option-toggle-group">
                      {(['A4', 'A3'] as const).map((size) => (
                        <button key={size} type="button" className={cn('option-toggle', item.paper_size === size && 'option-toggle-active')} onClick={() => updateItem(i, { paper_size: size })}>
                          {PAPER_SIZE_AR[size]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="option-label">الطباعة</span>
                    <div className="option-pills">
                      {(['single', 'duplex_long'] as const).map((side) => (
                        <button key={side} type="button" className={cn('option-pill', item.sides === side && 'option-pill-active')} onClick={() => updateItem(i, { sides: side })}>
                          {PRINT_SIDES_AR[side]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {config?.finishing_services.length ? (
                    <div>
                      <span className="option-label">خدمات إضافية</span>
                      <div className="space-y-2">
                        {config.finishing_services.map((fs) => (
                          <label key={fs.id} className={cn('payment-option', item.finishing_service_ids.includes(fs.id) && 'payment-option-active')}>
                            <input
                              type="checkbox"
                              className="accent-primary"
                              checked={item.finishing_service_ids.includes(fs.id)}
                              onChange={(e) => {
                                const ids = e.target.checked
                                  ? [...item.finishing_service_ids, fs.id]
                                  : item.finishing_service_ids.filter((id) => id !== fs.id);
                                updateItem(i, { finishing_service_ids: ids });
                              }}
                            />
                            <span className="text-sm font-medium">{fs.name_ar}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {step === 'checkout' && (
            <div className="space-y-4 py-3 animate-fade-in-up">
              <h2 className="text-lg font-bold">مراجعة ودفع</h2>

              {quote && (
                <div className="card p-4">
                  {items.map((item, idx) => (
                    <div key={item.upload.file_key} className="summary-row summary-row-muted">
                      <span className="truncate">{item.upload.original_filename}</span>
                      <span>{quote.items[idx] ? formatOMR(quote.items[idx].amount_baisa) : '—'}</span>
                    </div>
                  ))}
                  <div className="summary-row summary-row-muted">
                    <span>المجموع الفرعي</span>
                    <span>{formatOMR(quote.subtotal_baisa)}</span>
                  </div>
                  {quote.tax_baisa > 0 && (
                    <div className="summary-row summary-row-muted">
                      <span>ضريبة القيمة المضافة</span>
                      <span>{formatOMR(quote.tax_baisa)}</span>
                    </div>
                  )}
                  <div className="summary-row summary-total">
                    <span>الإجمالي</span>
                    <span className="text-primary">{quote.total_display}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="block">
                  <span className="option-label">
                    الاسم الكامل <span className="font-normal text-text-muted">(اختياري)</span>
                  </span>
                  <input
                    className="input-field"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="اسمك"
                  />
                </label>
                <label className="block">
                  <span className="option-label">رقم الهاتف</span>
                  <input
                    className="input-field"
                    dir="ltr"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+968 9XXXXXXX"
                    required
                  />
                </label>
              </div>

              <div>
                <span className="option-label">طريقة الدفع</span>
                <div className="space-y-2">
                  <label className={cn('payment-option', paymentMethod === 'pay_at_pickup' && 'payment-option-active')}>
                    <input type="radio" name="payment" checked={paymentMethod === 'pay_at_pickup'} onChange={() => setPaymentMethod('pay_at_pickup')} className="accent-primary" />
                    <Banknote className="size-5 text-primary" />
                    <span className="text-sm font-medium">الدفع عند الاستلام</span>
                  </label>
                  <label className={cn('payment-option', paymentMethod === 'online' && 'payment-option-active')}>
                    <input type="radio" name="payment" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="accent-primary" />
                    <CreditCard className="size-5 text-primary" />
                    <span className="text-sm font-medium">الدفع الآن (بطاقة / محفظة)</span>
                  </label>
                </div>
              </div>

              {submitError && <p className="text-center text-sm text-error">{submitError}</p>}
            </div>
          )}

          {step === 'done' && orderResult && !orderResult.payment_url && (
            <div className="space-y-5 py-4 text-center animate-fade-in-up">
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="size-10" />
              </div>
              <div>
                <h2 className="text-xl font-bold">تم استلام طلبك بنجاح!</h2>
                <p className="mt-2 text-2xl font-bold text-primary">{orderResult.order_number}</p>
                <p className="mt-1 text-sm text-text-muted">الإجمالي: {orderResult.total_display}</p>
              </div>

              <div className="card overflow-hidden p-0 text-start">
                <StatusTimeline status={orderResult.status} embedded />
              </div>

              <StoreInfoCard store={store} compact />

              <button type="button" className="btn-outline w-full" onClick={() => { setStep('landing'); setFiles([]); setItems([]); setOrderResult(null); }}>
                العودة للصفحة الرئيسية
              </button>
              <a href={`/track/${orderResult.tracking_token}`} className="btn-primary block w-full">
                تتبع الطلب
              </a>
            </div>
          )}
        </div>

        {(step === 'upload' && files.some((f) => !f.error)) && (
          <div className="fixed-bottom-cta">
            <button type="button" className="btn-primary btn-compact w-full" disabled={uploading} onClick={handleContinueFromUpload}>
              {uploading ? 'جاري الرفع...' : 'التالي: خيارات الطباعة'}
            </button>
          </div>
        )}

        {step === 'options' && (
          <div className="fixed-bottom-cta">
            <button type="button" className="btn-primary btn-compact w-full" onClick={() => setStep('checkout')}>
              التالي: مراجعة ودفع
            </button>
          </div>
        )}

        {step === 'checkout' && (
          <div className="fixed-bottom-cta flex gap-2">
            <button type="button" className="btn-ghost flex-1" onClick={() => setStep('options')}>رجوع</button>
            <button type="button" className="btn-primary flex-1" disabled={submitting || !customerPhone.trim()} onClick={handleSubmit}>
              {submitting ? 'جاري الإرسال...' : 'تأكيد الطلب'}
            </button>
          </div>
        )}

        {step !== 'upload' && step !== 'options' && step !== 'checkout' && <StoreFooter store={store} />}
      </div>
    </div>
  );
}
