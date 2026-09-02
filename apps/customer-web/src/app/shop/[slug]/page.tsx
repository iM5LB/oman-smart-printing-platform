import { redirect } from 'next/navigation';

/** Legacy URL — storefronts live at /{slug} now. */
export default async function LegacyShopRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/${slug}`);
}
