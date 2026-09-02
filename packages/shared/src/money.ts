/**
 * Format baisa amount as OMR display string.
 * 1700 baisa → "1.700 ر.ع"
 */
export function formatOMR(baisa: number): string {
  const omr = baisa / 1000;
  return `${omr.toFixed(3)} ر.ع`;
}

/**
 * Parse OMR display string to baisa.
 * "1.700" → 1700
 */
export function parseOMRToBaisa(value: string): number {
  const cleaned = value.replace(/[^\d.]/g, '');
  const omr = parseFloat(cleaned);
  if (isNaN(omr)) throw new Error('Invalid OMR amount');
  return Math.round(omr * 1000);
}

/**
 * Calculate price for an order item.
 * All arithmetic in integer baisa.
 */
export function calculateItemPrice(params: {
  pageCount: number;
  pagesToPrint: number;
  copies: number;
  pricePerPageBaisa: number;
  sides: 'single' | 'duplex_long' | 'duplex_short';
  finishingBaisa: number;
  paperTypeSurchargeBaisa: number;
  discountPercent: number;
}): number {
  const {
    pagesToPrint,
    copies,
    pricePerPageBaisa,
    sides,
    finishingBaisa,
    paperTypeSurchargeBaisa,
    discountPercent,
  } = params;

  let sheets = pagesToPrint * copies;
  if (sides !== 'single') {
    sheets = Math.ceil(sheets / 2);
  }

  const printCost = sheets * pricePerPageBaisa;
  const paperCost = sheets * paperTypeSurchargeBaisa;
  const subtotal = printCost + paperCost + finishingBaisa;

  if (discountPercent > 0) {
    const discount = Math.round(subtotal * discountPercent / 100);
    return subtotal - discount;
  }

  return subtotal;
}

/**
 * Normalize a phone number to E.164 (+digits) when possible.
 * Oman-friendly defaults: 8-digit local numbers starting with 7/9 → +968XXXXXXXX.
 * Also accepts +968… / 968… and other international numbers (+CC…).
 */
export function normalizePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  // Oman local: 8 digits starting with 7 or 9
  if (digits.length === 8 && /^[79]/.test(digits)) {
    return `+968${digits}`;
  }

  // Oman with country code
  if (digits.startsWith('968') && digits.length === 11) {
    return `+${digits}`;
  }

  // Explicit international (+…): E.164 allows 8–15 digits total
  if (hasPlus && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }

  // Digits without +: treat 10–15 digit values as international
  if (!hasPlus && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

/**
 * Validate a phone number (international-friendly; Oman local still accepted).
 */
export function isValidPhone(phone: string): boolean {
  return normalizePhone(phone) !== null;
}

/** @deprecated Use normalizePhone — kept for older imports. */
export const normalizeOmaniPhone = normalizePhone;

/** @deprecated Use isValidPhone — kept for older imports. */
export const isValidOmaniPhone = isValidPhone;

/**
 * Parse page range string into array of page numbers.
 * "1-5,8,12-20" → [1,2,3,4,5,8,12,13,...,20]
 */
export function parsePageRange(range: string, totalPages: number): number[] {
  if (range === 'all' || range === '') {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  const parts = range.split(',').map((p) => p.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
        throw new Error(`Invalid page range: ${part}`);
      }
      for (let i = start; i <= end; i++) pages.add(i);
    } else {
      const page = parseInt(part, 10);
      if (isNaN(page) || page < 1 || page > totalPages) {
        throw new Error(`Invalid page number: ${part}`);
      }
      pages.add(page);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Count pages from a page range string.
 */
export function countPagesInRange(range: string, totalPages: number): number {
  return parsePageRange(range, totalPages).length;
}

/**
 * Generate secure tracking token.
 */
export function generateTrackingToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Apply tax to subtotal (basis points: 500 = 5%).
 */
export function calculateTax(subtotalBaisa: number, taxRateBps: number): number {
  return Math.round(subtotalBaisa * taxRateBps / 10000);
}
