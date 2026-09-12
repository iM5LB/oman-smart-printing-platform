import { normalizePhone } from '@omsp/shared';

/** Comma-separated phones in PLATFORM_ADMIN_PHONES (E.164 or local Oman). */
export function platformAdminPhones(): string[] {
  const raw = process.env.PLATFORM_ADMIN_PHONES ?? process.env.ADMIN_PHONE ?? '';
  return raw
    .split(/[,;\s]+/)
    .map((p) => normalizePhone(p.trim()))
    .filter((p): p is string => Boolean(p));
}

export function isPlatformAdminPhone(phone: string | null | undefined): boolean {
  const normalized = normalizePhone(phone ?? '');
  if (!normalized) return false;
  return platformAdminPhones().includes(normalized);
}
