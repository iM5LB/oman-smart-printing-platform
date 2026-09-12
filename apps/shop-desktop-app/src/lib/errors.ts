/** Map unknown failures to short Arabic messages safe for end users. */

const TECHNICAL =
  /\b(HTTP|ECONN|ENOTFOUND|ETIMEDOUT|CORS|TypeError|fetch failed|stack|at\s+\S+\(|WHATSAPP_|TWILIO_|NODE_ENV|localhost:\d+)\b/i;

export function toUserMessage(err: unknown, fallback = "حدث خطأ. حاول مجدداً"): string {
  if (typeof err === "string" && err.trim()) {
    return sanitizeUserMessage(err, fallback);
  }
  if (err instanceof Error && err.message.trim()) {
    return sanitizeUserMessage(err.message, fallback);
  }
  return fallback;
}

export function sanitizeUserMessage(raw: string, fallback = "حدث خطأ. حاول مجدداً"): string {
  const msg = raw.trim();
  if (!msg) return fallback;

  // Prefer Arabic server messages as-is when they look user-facing.
  if (/[\u0600-\u06FF]/.test(msg) && !TECHNICAL.test(msg) && msg.length < 220) {
    return msg;
  }

  const lower = msg.toLowerCase();
  if (
    /network|fetch|cors|failed to fetch|econn|enotfound|etimedout|offline|dns/i.test(
      lower,
    )
  ) {
    return "تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مجدداً.";
  }
  if (/\b401\b|unauthorized|غير مصرح|يجب تسجيل/.test(lower)) {
    return "انتهت الجلسة أو غير مصرح. سجّل الدخول مجدداً.";
  }
  if (/\b403\b|forbidden/.test(lower)) {
    return "ليس لديك صلاحية لتنفيذ هذا الإجراء.";
  }
  if (/\b404\b|not found|غير موجود/.test(lower) && !/[\u0600-\u06FF]/.test(msg)) {
    return "المطلوب غير موجود.";
  }
  if (/\b429\b|too many|محاولات كثيرة/.test(lower)) {
    return "محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً.";
  }
  if (/\b5\d\d\b|internal server|service unavailable|bad gateway/.test(lower)) {
    return "الخدمة غير متاحة مؤقتاً. حاول بعد قليل.";
  }
  if (TECHNICAL.test(msg) || !/[\u0600-\u06FF]/.test(msg)) {
    return fallback;
  }
  return msg.length > 220 ? fallback : msg;
}

export async function parseApiErrorMessage(
  res: Response,
  fallback = "تعذر إكمال الطلب",
): Promise<string> {
  const statusFallback = statusMessage(res.status, fallback);
  try {
    const body = (await res.json()) as { message?: string | string[] };
    const raw = Array.isArray(body.message) ? body.message[0] : body.message;
    if (typeof raw === "string" && raw.trim()) {
      return sanitizeUserMessage(raw, statusFallback);
    }
  } catch {
    /* ignore non-JSON bodies */
  }
  return statusFallback;
}

function statusMessage(status: number, fallback: string): string {
  if (status === 400) return "البيانات غير صالحة. تحقق وأعد المحاولة.";
  if (status === 401) return "انتهت الجلسة أو غير مصرح. سجّل الدخول مجدداً.";
  if (status === 403) return "ليس لديك صلاحية لتنفيذ هذا الإجراء.";
  if (status === 404) return "المطلوب غير موجود.";
  if (status === 429) return "محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً.";
  if (status >= 500) return "الخدمة غير متاحة مؤقتاً. حاول بعد قليل.";
  return fallback;
}
