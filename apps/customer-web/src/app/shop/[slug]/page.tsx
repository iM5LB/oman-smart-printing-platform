import { notFound } from 'next/navigation';
import { OrderFlow } from '@/components/order-flow';
import type { StorePublicInfo } from '@omsp/types';

async function getStore(slug: string): Promise<StorePublicInfo | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
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

export default async function ShopPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getStore(slug);

  if (!store) notFound();

  return <OrderFlow store={store} />;
}
