const TOKEN_API_URL_KEY = "omsp.apiUrl";

function defaultApiBase(): string {
  return import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:4000";
}

export function getApiBase(): string {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(TOKEN_API_URL_KEY)?.replace(/\/$/, "");
    if (stored) return stored;
  }
  return defaultApiBase();
}

export function setApiBase(url: string) {
  const cleaned = url.trim().replace(/\/$/, "");
  if (cleaned) localStorage.setItem(TOKEN_API_URL_KEY, cleaned);
  else localStorage.removeItem(TOKEN_API_URL_KEY);
}

function apiUrl(): string {
  return `${getApiBase()}/api/v1`;
}

export type ShopMe = {
  store: {
    id: string;
    slug: string;
    name: string;
    phone: string;
    auto_print_paid_orders: boolean;
    pay_at_pickup_print_policy: string;
  };
  device: {
    id: string;
    name: string;
    status: string;
    last_connected_at: string | null;
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
      "تعذر الاتصال بالخادم. شغّل الـ API أولاً (npm run start:api) على المنفذ المحدد.",
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
