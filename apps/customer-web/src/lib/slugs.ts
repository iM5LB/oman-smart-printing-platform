/** Paths that must not be treated as a store brand slug. */
export const RESERVED_SLUGS = new Set([
  'api',
  'track',
  'pay',
  'shop',
  'library',
  'onboarding',
  'login',
  'setup',
  'admin',
  'favicon.ico',
  '_next',
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}

export function slugifyBrand(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'store';
}
