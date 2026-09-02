'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { confirmMockPayment } from '@/lib/api';

export default function PayPageClient({ params }: { params: Promise<{ paymentId: string }> }) {
  const searchParams = useSearchParams();
  const [paymentId, setPaymentId] = useState('');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [trackingToken, setTrackingToken] = useState('');

  useEffect(() => {
    params.then((p) => setPaymentId(p.paymentId));
  }, [params]);

  useEffect(() => {
    if (!paymentId) return;
    const token = searchParams.get('token') ?? '';
    confirmMockPayment(paymentId)
      .then(() => {
        setStatus('success');
        setTrackingToken(token);
      })
      .catch(() => setStatus('error'));
  }, [paymentId, searchParams]);

  return (
    <div className="page-shell">
      <div className="page-content flex min-h-dvh items-center justify-center p-6">
        {status === 'loading' && (
          <div className="text-center">
            <p className="text-lg font-semibold">جاري معالجة الدفع...</p>
          </div>
        )}
        {status === 'success' && (
          <div className="space-y-4 text-center animate-fade-in-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold">تم الدفع بنجاح</h1>
            <p className="text-text-muted">سيتم طباعة طلبك تلقائياً</p>
            {trackingToken && (
              <a href={`/track/${trackingToken}`} className="btn-primary inline-block">
                تتبع الطلب
              </a>
            )}
          </div>
        )}
        {status === 'error' && (
          <div className="text-center">
            <p className="text-lg font-semibold text-error">فشلت عملية الدفع</p>
          </div>
        )}
      </div>
    </div>
  );
}
