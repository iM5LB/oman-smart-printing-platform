/** Production API — release builds always use this (no trailing slash). */
export const PRODUCTION_API_BASE = "https://omsp-api.onrender.com";

const LEGACY_API_URL_KEY = "omsp.apiUrl";

function normalizeApiBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** Ignore any previously saved custom API URL from older app versions. */
function clearLegacyStoredApiUrl() {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(LEGACY_API_URL_KEY);
    }
  } catch {
    /* ignore */
  }
}

clearLegacyStoredApiUrl();

/**
 * API origin (no trailing slash).
 * Defaults to Render. Set VITE_API_URL=http://localhost:4000 only for a local API.
 */
export function getApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv) return normalizeApiBase(fromEnv);
  return PRODUCTION_API_BASE;
}

/** Customer web origin (no trailing slash). */
export function getWebBase(): string {
  const fromEnv = import.meta.env.VITE_WEB_URL;
  if (fromEnv) return normalizeApiBase(fromEnv);
  return "https://omsp-web.onrender.com";
}

/** Full public shop URL for customers (scan / share). */
export function getCustomerShopUrl(store: {
  slug?: string | null;
  customer_shop_url?: string | null;
  customer_shop_path?: string | null;
} | null | undefined): string | null {
  if (!store) return null;
  if (store.customer_shop_url) return store.customer_shop_url;
  if (store.slug) return `${getWebBase()}/${store.slug}`;
  if (store.customer_shop_path?.startsWith("/")) {
    return `${getWebBase()}${store.customer_shop_path}`;
  }
  return null;
}

/** Display form without scheme, e.g. `localhost:3000/m5lb`. */
export function formatCleanUrl(url: string | null | undefined): string {
  if (!url) return "";
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
}

/**
 * Absolute URL for a store logo image. Rejects platform Tibaa brand assets
 * so logged-in chrome never shows the app icon as the shop mark.
 */
export function resolveStoreLogoUrl(
  logoUrl: string | null | undefined,
): string | null {
  if (!logoUrl?.trim()) return null;
  const u = logoUrl.trim();
  if (/\/brand\/tibaa-/i.test(u) || /tibaa-(icon|logo)\.png/i.test(u)) {
    return null;
  }
  if (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("data:")
  ) {
    return u;
  }
  if (u.startsWith("/")) return `${getApiBase()}${u}`;
  return `${getApiBase()}/${u}`;
}

function apiUrl(): string {
  return `${getApiBase()}/api/v1`;
}

export type ShopMe = {
  store: {
    id: string;
    slug: string;
    name: string;
    phone: string | null;
    logo_url?: string | null;
    governorate?: string | null;
    wilayat?: string | null;
    area?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    is_active?: boolean;
    order_number_prefix?: string;
    auto_print_paid_orders: boolean;
    pay_at_pickup_print_policy: string;
    file_retention_policy?: string;
    paid_orders_priority?: string;
    tax_rate_bps?: number;
    device_confirm_phone?: string | null;
    has_device_password?: boolean;
    onboarding_completed_at?: string | null;
    customer_shop_path?: string;
    customer_shop_url?: string | null;
    created_at?: string;
    updated_at?: string;
    opening_hours?: Array<{
      day_of_week: number;
      open_time: string;
      close_time: string;
      is_closed: boolean;
    }>;
  };
  device: {
    id: string;
    name: string;
    status: string;
    last_connected_at: string | null;
    app_version?: string | null;
    os_version?: string | null;
    created_at?: string;
  };
};

export type ShopOrder = {
  id: string;
  display_number?: string;
  order_number?: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  customer_name?: string | null;
  customer_phone: string | null;
  total_baisa?: number;
  total?: number;
  total_display?: string;
  created_at: string;
  notes?: string | null;
  items?: unknown[];
};

export type ShopStats = {
  today_orders?: number;
  ready_count?: number;
  printing_count?: number;
  today_revenue_baisa?: number;
  today_revenue_display?: string;
  yesterday_orders?: number;
  yesterday_revenue_display?: string;
  orders_delta_percent?: number;
  week_orders?: number;
  week_revenue_display?: string;
  [key: string]: unknown;
};

export type ShopPayment = {
  id: string;
  order_id: string;
  order_number: string;
  customer_name: string | null;
  amount_display: string;
  status: string;
  method: string | null;
  in_store_method: string | null;
  paid_at: string | null;
  created_at: string;
};

export type ShopCustomer = {
  phone: string;
  name: string;
  order_count: number;
  total_baisa: number;
  total_display?: string;
  last_order_at: string;
};

export type PricingRule = {
  id: string;
  paper_size: string;
  color_mode: string;
  price_per_page: number;
  price_display: string;
  is_active: boolean;
};

export type FinishingService = {
  id: string;
  name_ar: string;
  description: string | null;
  price_baisa: number;
  price_display: string;
  is_active: boolean;
};

export type ShopPricing = {
  rules: PricingRule[];
  finishing: FinishingService[];
};

function mapFetchError(err: unknown): Error {
  if (err instanceof TypeError) {
    return new Error(
      "تعذر الاتصال بالخادم. تحقق من الإنترنت أو شغّل الـ API محلياً في وضع التطوير.",
    );
  }
  if (err instanceof Error) return err;
  return new Error("فشل الاتصال");
}

async function request<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-Device-Token": token,
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    throw mapFetchError(err);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new Error(msg ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const shopApi = {
  get apiUrl() {
    return getApiBase();
  },
  /** Public pairing — no device token yet. */
  pairStart: async (body: {
    store_slug: string;
    device_password: string;
    device_name: string;
  }) => {
    let res: Response;
    try {
      res = await fetch(`${apiUrl()}/devices/pair/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw mapFetchError(err);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      const msg = Array.isArray(err.message) ? err.message[0] : err.message;
      throw new Error(msg ?? `HTTP ${res.status}`);
    }
    return (await res.json()) as {
      challenge_id: string;
      phone_hint: string;
      expires_in_seconds: number;
      message: string;
      dev_code?: string;
    };
  },
  pairConfirm: async (body: { challenge_id: string; code: string }) => {
    let res: Response;
    try {
      res = await fetch(`${apiUrl()}/devices/pair/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw mapFetchError(err);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      const msg = Array.isArray(err.message) ? err.message[0] : err.message;
      throw new Error(msg ?? `HTTP ${res.status}`);
    }
    return (await res.json()) as {
      device_id: string;
      device_token: string;
      store_slug: string;
      store_name: string;
      ws_url: string;
    };
  },
  me: (token: string) => request<ShopMe>("/shop/me", token),
  stats: (token: string) => request<ShopStats>("/shop/stats", token),
  orders: (token: string, status = "active") =>
    request<ShopOrder[]>(`/shop/orders?status=${encodeURIComponent(status)}`, token),
  payments: (token: string) => request<ShopPayment[]>("/shop/payments", token),
  customers: (token: string) => request<ShopCustomer[]>("/shop/customers", token),
  pricing: (token: string) => request<ShopPricing>("/shop/pricing", token),
  updatePricingRule: (token: string, ruleId: string, price_per_page: number) =>
    request(`/shop/pricing/rules/${ruleId}`, token, {
      method: "PATCH",
      body: JSON.stringify({ price_per_page }),
    }),
  updateFinishing: (token: string, serviceId: string, price_baisa: number) =>
    request(`/shop/pricing/finishing/${serviceId}`, token, {
      method: "PATCH",
      body: JSON.stringify({ price_baisa }),
    }),
  dispatch: (token: string, orderId: string) =>
    request(`/shop/orders/${orderId}/dispatch`, token, { method: "POST" }),
  retry: (token: string, orderId: string) =>
    request(`/shop/orders/${orderId}/retry`, token, { method: "POST" }),
  markReady: (token: string, orderId: string) =>
    request(`/shop/orders/${orderId}/ready`, token, { method: "POST" }),
  markCollected: (token: string, orderId: string) =>
    request(`/shop/orders/${orderId}/collected`, token, { method: "POST" }),
  payInStore: (token: string, orderId: string, method: "cash" | "card_pos" = "cash") =>
    request(`/shop/orders/${orderId}/pay`, token, {
      method: "POST",
      body: JSON.stringify({ method }),
    }),
};
