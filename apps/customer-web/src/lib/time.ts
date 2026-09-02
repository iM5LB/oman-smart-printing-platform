/** Convert "08:00" / "22:00" to Arabic 12-hour display, e.g. "8:00 ص" / "10:00 م" */
export function formatTime12h(time24: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time24.trim());
  if (!match) return time24;

  let hour = parseInt(match[1], 10);
  const minute = match[2];
  if (Number.isNaN(hour) || hour < 0 || hour > 23) return time24;

  const period = hour < 12 ? 'ص' : 'م';
  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute} ${period}`;
}

export function formatHoursRange12h(open: string, close: string): string {
  return `${formatTime12h(open)} – ${formatTime12h(close)}`;
}
