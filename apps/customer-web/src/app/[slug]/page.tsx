import { notFound } from 'next/navigation';
import { OrderFlow } from '@/components/order-flow';
import type { StorePublicInfo } from '@omsp/types';
import { getApiBase } from '@/lib/api';
import { isReservedSlug } from '@/lib/slugs';

async function getStore(slug: string): Promise<StorePublicInfo | null> {
  const apiUrl = getApiBase();
  try {
    const res = await fetch(`${apiUrl}/api/v1/stores/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (isReservedSlug(slug)) notFound();

  const store = await getStore(slug);
  if (!store) notFound();

  return <OrderFlow store={store} />;
}
