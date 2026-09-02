import { Suspense } from 'react';
import PayPageClient from './pay-client';

export default function PayPage({ params }: { params: Promise<{ paymentId: string }> }) {
  return (
    <Suspense fallback={<div className="p-6 text-center">جاري التحميل...</div>}>
      <PayPageClient params={params} />
    </Suspense>
  );
}
