import Link from 'next/link';
import { notFound } from 'next/navigation';
import { OrderFlow } from '@/components/order-flow';
import type { StorePublicInfo } from '@omsp/types';
import { getApiBase } from '@/lib/api';
import { isReservedSlug } from '@/lib/slugs';

type StoreResult =
  | { ok: true; store: StorePublicInfo }
  | { ok: false; reason: 'not_found' | 'api_down' };

async function getStore(slug: string): Promise<StoreResult> {
  const apiUrl = getApiBase();
  try {
    const res = await fetch(`${apiUrl}/api/v1/stores/${slug}`, {
      cache: 'no-store',
    });
    if (res.status === 404) return { ok: false, reason: 'not_found' };
    if (!res.ok) return { ok: false, reason: 'api_down' };
    return { ok: true, store: await res.json() };
  } catch {
    return { ok: false, reason: 'api_down' };
  }
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (isReservedSlug(slug)) notFound();

  const result = await getStore(slug);
  if (!result.ok) {
    if (result.reason === 'not_found') notFound();
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-2 text-2xl font-bold">الخدمة غير متاحة مؤقتاً</h1>
        <p className="mb-6 text-text-muted">
          تعذر الاتصال بخادم المكتبة. حاول مرة أخرى بعد قليل.
        </p>
        <Link href="/" className="text-primary underline">
          العودة للرئيسية
        </Link>
      </main>
    );
  }

  return <OrderFlow store={result.store} />;
}
