'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  callingCodeForCountry,
  composePhone,
  getPhoneErrorMessageAr,
  isCuratedPhoneCountry,
  parsePhoneParts,
  type PhoneCountryCode,
} from '@omsp/shared';
import { cn } from '@/lib/utils';

export interface PhoneInputProps {
  id?: string;
  name?: string;
  /** Controlled E.164 (or raw) value. */
  value?: string;
  defaultValue?: string;
  onChange?: (e164: string) => void;
  onBlur?: () => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Show inline Arabic validation under the field. */
  showError?: boolean;
  /** External error overrides local validation message. */
  error?: string | null;
  autoComplete?: string;
  placeholder?: string;
}

function initialParts(seed: string | undefined) {
  return parsePhoneParts(seed ?? '', DEFAULT_PHONE_COUNTRY);
}

/**
 * Country selector + national number. Emits/stores E.164 via `onChange` / hidden `name`.
 */
export function PhoneInput({
  id,
  name,
  value,
  defaultValue,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  className,
  showError = false,
  error = null,
  autoComplete = 'tel-national',
  placeholder,
}: PhoneInputProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const nationalRef = useRef<HTMLInputElement>(null);
  const controlled = value !== undefined;

  const [country, setCountry] = useState<PhoneCountryCode>(() => initialParts(value ?? defaultValue).country);
  const [national, setNational] = useState(() => initialParts(value ?? defaultValue).nationalNumber);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!controlled) return;
    const parts = parsePhoneParts(value ?? '', DEFAULT_PHONE_COUNTRY);
    setCountry(parts.country);
    setNational(parts.nationalNumber);
  }, [controlled, value]);

  const e164 = useMemo(() => {
    if (!national.trim()) return '';
    return composePhone(national, country) ?? '';
  }, [national, country]);

  useEffect(() => {
    const el = nationalRef.current;
    if (!el) return;
    if (!national.trim()) {
      el.setCustomValidity(required ? 'يرجى إدخال رقم الهاتف' : '');
      return;
    }
    if (!e164) {
      el.setCustomValidity(
        getPhoneErrorMessageAr(national, { required: true, defaultCountry: country }) ??
          'رقم الهاتف غير صالح. اختر الدولة وأدخل الرقم بشكل صحيح',
      );
      return;
    }
    el.setCustomValidity('');
  }, [national, e164, required, country]);

  const localError = useMemo(() => {
    if (error) return error;
    if (!showError) return null;
    if (!touched && !national.trim()) return null;
    if (!national.trim()) {
      return required ? getPhoneErrorMessageAr('', { required: true }) : null;
    }
    if (!e164) {
      return getPhoneErrorMessageAr(national, { required: true, defaultCountry: country });
    }
    return null;
  }, [showError, error, touched, required, national, e164, country]);

  function emit(nextCountry: PhoneCountryCode, nextNational: string) {
    const composed = nextNational.trim() ? composePhone(nextNational, nextCountry) ?? '' : '';
    onChange?.(composed);
  }

  function handleCountryChange(next: PhoneCountryCode) {
    setCountry(next);
    setTouched(true);
    emit(next, national);
  }

  function handleNationalChange(raw: string) {
    if (raw.trim().startsWith('+') || /^\s*00/.test(raw)) {
      const parts = parsePhoneParts(raw, country);
      setCountry(parts.country);
      setNational(parts.nationalNumber);
      setTouched(true);
      onChange?.(parts.e164 ?? '');
      return;
    }
    const cleaned = raw.replace(/[^\d\s-]/g, '');
    setNational(cleaned);
    setTouched(true);
    emit(country, cleaned);
  }

  let callingCode = '';
  try {
    callingCode = callingCodeForCountry(country);
  } catch {
    callingCode = '';
  }
  const nationalPlaceholder =
    placeholder ?? (country === 'OM' ? '9XXX XXXX' : 'رقم الهاتف');

  return (
    <div className={cn('phone-input', className)}>
      {name ? <input type="hidden" name={name} value={e164} readOnly /> : null}
      <div className="phone-input-row" dir="ltr">
        <label className="sr-only" htmlFor={`${fieldId}-country`}>
          الدولة
        </label>
        <select
          id={`${fieldId}-country`}
          className="phone-input-country"
          value={country}
          disabled={disabled}
          aria-label="دولة رقم الهاتف"
          onChange={(e) => handleCountryChange(e.target.value as PhoneCountryCode)}
          onBlur={() => {
            setTouched(true);
            onBlur?.();
          }}
        >
          {!isCuratedPhoneCountry(country) ? (
            <option value={country}>+{callingCode}</option>
          ) : null}
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.nameAr} (+{c.callingCode})
            </option>
          ))}
        </select>
        <div className="phone-input-national-wrap">
          <span className="phone-input-prefix" aria-hidden>
            +{callingCode}
          </span>
          <input
            ref={nationalRef}
            id={fieldId}
            className="phone-input-national"
            type="tel"
            inputMode="tel"
            autoComplete={autoComplete}
            disabled={disabled}
            required={required}
            placeholder={nationalPlaceholder}
            value={national}
            onChange={(e) => handleNationalChange(e.target.value)}
            onBlur={() => {
              setTouched(true);
              onBlur?.();
            }}
            aria-invalid={Boolean(localError)}
            aria-describedby={localError ? `${fieldId}-error` : undefined}
          />
        </div>
      </div>
      {localError ? (
        <p id={`${fieldId}-error`} className="phone-input-error" role="alert">
          {localError}
        </p>
      ) : null}
    </div>
  );
}
