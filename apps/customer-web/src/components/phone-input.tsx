'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

function CountrySelect({
  id,
  country,
  callingCode,
  disabled,
  onChange,
  onBlur,
}: {
  id: string;
  country: PhoneCountryCode;
  callingCode: string;
  disabled?: boolean;
  onChange: (next: PhoneCountryCode) => void;
  onBlur?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220 });
  const current = PHONE_COUNTRIES.find((c) => c.code === country);
  const label = current ? `${current.nameAr} +${current.callingCode}` : `+${callingCode}`;

  const place = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 220);
    const height = 280;
    const padEdge = 8;
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - padEdge) {
      top = Math.max(padEdge, rect.top - height - 6);
    }
    let left = rect.left;
    if (left + width > window.innerWidth - padEdge) {
      left = window.innerWidth - width - padEdge;
    }
    if (left < padEdge) left = padEdge;
    setPos({ top, left, width });
  };

  useEffect(() => {
    if (!open) return;
    place();
    activeRef.current?.scrollIntoView({ block: 'nearest' });
    const onReposition = () => place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
      onBlur?.();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onBlur]);

  const extras = !isCuratedPhoneCountry(country)
    ? [{ code: country, callingCode, nameAr: `+${callingCode}`, nameEn: country }]
    : [];

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label="دولة رقم الهاتف"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          'phone-input-country phone-input-country-btn',
          open && 'phone-input-country-open',
        )}
      >
        <span className="min-w-0 truncate">{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open
        ? createPortal(
            <div
              ref={popRef}
              role="listbox"
              aria-label="دولة رقم الهاتف"
              className="fixed z-[80] max-h-72 overflow-auto rounded-2xl border border-border bg-surface p-1 shadow-xl shadow-primary/10"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              {[...extras, ...PHONE_COUNTRIES].map((c) => {
                const active = c.code === country;
                return (
                  <button
                    key={c.code}
                    ref={active ? activeRef : undefined}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(c.code);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                      active
                        ? 'bg-primary/10 text-text'
                        : 'text-text hover:bg-primary/[0.06]'
                    }`}
                  >
                    <span>{c.nameAr}</span>
                    <span className="tabular-nums text-text-muted" dir="ltr">
                      +{c.callingCode}
                    </span>
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
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
        <CountrySelect
          id={`${fieldId}-country`}
          country={country}
          callingCode={callingCode}
          disabled={disabled}
          onChange={handleCountryChange}
          onBlur={() => {
            setTouched(true);
            onBlur?.();
          }}
        />
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
