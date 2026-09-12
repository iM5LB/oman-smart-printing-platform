export const OMAN_TIME_ZONE = 'Asia/Muscat';

const omanDateTime: Intl.DateTimeFormatOptions = {
  timeZone: OMAN_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
};

const omanDate: Intl.DateTimeFormatOptions = {
  timeZone: OMAN_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
};

export function formatOmanDateTime(value: string | Date): string {
  return new Date(value).toLocaleString('ar-OM', omanDateTime);
}

export function formatOmanDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('ar-OM', omanDate);
}
