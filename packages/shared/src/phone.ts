import {
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

/** Default country for Oman-first UX. */
export const DEFAULT_PHONE_COUNTRY: CountryCode = 'OM';

export type PhoneCountryCode = CountryCode;

export interface PhoneCountryOption {
  code: CountryCode;
  callingCode: string;
  nameAr: string;
  nameEn: string;
}

/**
 * Curated countries for selectors: Oman first, then GCC + common international.
 * Validation still accepts any valid libphonenumber country if the full E.164 is entered.
 */
export const PHONE_COUNTRIES: readonly PhoneCountryOption[] = [
  { code: 'OM', callingCode: '968', nameAr: 'عُمان', nameEn: 'Oman' },
  { code: 'AE', callingCode: '971', nameAr: 'الإمارات', nameEn: 'UAE' },
  { code: 'SA', callingCode: '966', nameAr: 'السعودية', nameEn: 'Saudi Arabia' },
  { code: 'KW', callingCode: '965', nameAr: 'الكويت', nameEn: 'Kuwait' },
  { code: 'QA', callingCode: '974', nameAr: 'قطر', nameEn: 'Qatar' },
  { code: 'BH', callingCode: '973', nameAr: 'البحرين', nameEn: 'Bahrain' },
  { code: 'YE', callingCode: '967', nameAr: 'اليمن', nameEn: 'Yemen' },
  { code: 'EG', callingCode: '20', nameAr: 'مصر', nameEn: 'Egypt' },
  { code: 'JO', callingCode: '962', nameAr: 'الأردن', nameEn: 'Jordan' },
  { code: 'IQ', callingCode: '964', nameAr: 'العراق', nameEn: 'Iraq' },
  { code: 'IN', callingCode: '91', nameAr: 'الهند', nameEn: 'India' },
  { code: 'PK', callingCode: '92', nameAr: 'باكستان', nameEn: 'Pakistan' },
  { code: 'BD', callingCode: '880', nameAr: 'بنغلاديش', nameEn: 'Bangladesh' },
  { code: 'PH', callingCode: '63', nameAr: 'الفلبين', nameEn: 'Philippines' },
  { code: 'ID', callingCode: '62', nameAr: 'إندونيسيا', nameEn: 'Indonesia' },
  { code: 'GB', callingCode: '44', nameAr: 'بريطانيا', nameEn: 'United Kingdom' },
  { code: 'US', callingCode: '1', nameAr: 'الولايات المتحدة', nameEn: 'United States' },
  { code: 'CA', callingCode: '1', nameAr: 'كندا', nameEn: 'Canada' },
  { code: 'DE', callingCode: '49', nameAr: 'ألمانيا', nameEn: 'Germany' },
  { code: 'FR', callingCode: '33', nameAr: 'فرنسا', nameEn: 'France' },
  { code: 'TR', callingCode: '90', nameAr: 'تركيا', nameEn: 'Turkey' },
  { code: 'CN', callingCode: '86', nameAr: 'الصين', nameEn: 'China' },
] as const;

const COUNTRY_SET = new Set(PHONE_COUNTRIES.map((c) => c.code));

export function isCuratedPhoneCountry(code: CountryCode): boolean {
  return COUNTRY_SET.has(code);
}

export function isPhoneCountryCode(value: string): value is CountryCode {
  try {
    getCountryCallingCode(value as CountryCode);
    return true;
  } catch {
    return false;
  }
}

export function getPhoneCountryOption(code: CountryCode): PhoneCountryOption | undefined {
  return PHONE_COUNTRIES.find((c) => c.code === code);
}

export function callingCodeForCountry(code: CountryCode): string {
  return getCountryCallingCode(code);
}

export interface PhoneParts {
  country: CountryCode;
  nationalNumber: string;
  e164: string | null;
  valid: boolean;
}

/**
 * Parse a phone into country + national parts for UI.
 * Prefers the number's detected country when present; otherwise uses defaultCountry.
 */
export function parsePhoneParts(
  phone: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): PhoneParts {
  const trimmed = phone.trim();
  if (!trimmed) {
    return {
      country: defaultCountry,
      nationalNumber: '',
      e164: null,
      valid: false,
    };
  }

  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
  if (!parsed) {
    return {
      country: defaultCountry,
      nationalNumber: trimmed.replace(/\D/g, ''),
      e164: null,
      valid: false,
    };
  }

  const detected = parsed.country;
  const country = (
    detected && isPhoneCountryCode(detected) ? detected : defaultCountry
  ) as CountryCode;

  const valid = parsed.isValid();
  return {
    country,
    nationalNumber: parsed.nationalNumber,
    e164: valid ? parsed.format('E.164') : null,
    valid,
  };
}

/**
 * Build E.164 from an explicit country + national number.
 */
export function composePhone(
  nationalNumber: string,
  country: CountryCode = DEFAULT_PHONE_COUNTRY,
): string | null {
  const digits = nationalNumber.replace(/\D/g, '');
  if (!digits) return null;
  const parsed = parsePhoneNumberFromString(digits, country);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.format('E.164');
}

/**
 * Normalize a phone number to E.164 (+digits).
 * Oman-first: national numbers are interpreted with `defaultCountry` (OM by default).
 * Oman mobiles are 8 digits starting with 7 or 9 (e.g. 76655365 → +96876655365).
 * Rejects junk that fails libphonenumber length/country rules.
 */
export function normalizePhone(
  phone: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;

  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.format('E.164');
}

/**
 * Validate a phone number (libphonenumber-backed; Oman local still accepted via defaultCountry).
 * Oman mobiles: 8 digits, 7xxxxxxxx or 9xxxxxxxx.
 */
export function isValidPhone(
  phone: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): boolean {
  return normalizePhone(phone, defaultCountry) !== null;
}

/**
 * WhatsApp Cloud API `to` field: E.164 digits without leading `+`.
 */
export function formatPhoneForWhatsApp(
  phone: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): string | null {
  const e164 = normalizePhone(phone, defaultCountry);
  return e164 ? e164.replace(/\D/g, '') : null;
}

export type PhoneValidationIssue =
  | 'empty'
  | 'no_country'
  | 'invalid'
  | 'too_short'
  | 'too_long';

const PHONE_ERROR_AR: Record<PhoneValidationIssue, string> = {
  empty: 'يرجى إدخال رقم الهاتف',
  no_country: 'يرجى اختيار الدولة',
  invalid: 'رقم الهاتف غير صالح. اختر الدولة وأدخل الرقم بشكل صحيح',
  too_short: 'رقم الهاتف قصير جداً',
  too_long: 'رقم الهاتف طويل جداً',
};

export function phoneValidationIssue(
  phone: string,
  options?: { required?: boolean; defaultCountry?: CountryCode; countrySelected?: boolean },
): PhoneValidationIssue | null {
  const required = options?.required ?? true;
  const defaultCountry = options?.defaultCountry ?? DEFAULT_PHONE_COUNTRY;
  const trimmed = phone.trim();

  if (!trimmed) {
    return required ? 'empty' : null;
  }

  if (options?.countrySelected === false) {
    return 'no_country';
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length > 0 && digits.length < 5) {
    return 'too_short';
  }
  if (digits.length > 15) {
    return 'too_long';
  }

  if (!isValidPhone(trimmed, defaultCountry)) {
    return 'invalid';
  }

  return null;
}

/** Arabic validation message, or null when valid. */
export function getPhoneErrorMessageAr(
  phone: string,
  options?: { required?: boolean; defaultCountry?: CountryCode; countrySelected?: boolean },
): string | null {
  const issue = phoneValidationIssue(phone, options);
  return issue ? PHONE_ERROR_AR[issue] : null;
}

export function phoneErrorMessageForIssue(issue: PhoneValidationIssue): string {
  return PHONE_ERROR_AR[issue];
}

/** @deprecated Use normalizePhone — kept for older imports. */
export const normalizeOmaniPhone = normalizePhone;

/** @deprecated Use isValidPhone — kept for older imports. */
export const isValidOmaniPhone = isValidPhone;
