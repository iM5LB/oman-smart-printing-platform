import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatOmr(baisa: number): string {
  return `${(baisa / 1000).toFixed(3)} ر.ع`;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('968') && digits.length === 11) {
    return `+968 ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 8) return `+968 ${digits.slice(0, 4)} ${digits.slice(4)}`;
  return phone;
}
