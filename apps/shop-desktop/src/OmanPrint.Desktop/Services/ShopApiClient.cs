using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using OmanPrint.Core.Models;

namespace OmanPrint.Desktop.Services;

public class ShopApiClient
{
    private readonly HttpClient _http = new();
    private string _apiUrl = "";

    public void Configure(string apiUrl, string deviceToken)
    {
        _apiUrl = apiUrl.TrimEnd('/');
        _http.DefaultRequestHeaders.Remove("X-Device-Token");
        if (!string.IsNullOrEmpty(deviceToken))
            _http.DefaultRequestHeaders.Add("X-Device-Token", deviceToken);
    }

    public async Task<bool> HealthCheckAsync()
    {
        try
        {
            var res = await _http.GetAsync($"{_apiUrl}/api/v1/health");
            return res.IsSuccessStatusCode;
        }
        catch { return false; }
    }

    public async Task<ShopInfo?> GetMeAsync()
    {
        try
        {
            var res = await _http.GetAsync($"{_apiUrl}/api/v1/shop/me");
            if (!res.IsSuccessStatusCode) return null;
            var data = await res.Content.ReadFromJsonAsync<JsonElement>();
            return new ShopInfo(
                data.GetProperty("store").GetProperty("name").GetString() ?? "",
                data.GetProperty("store").GetProperty("slug").GetString() ?? "",
                data.GetProperty("device").GetProperty("name").GetString() ?? "",
                data.GetProperty("store").GetProperty("auto_print_paid_orders").GetBoolean()
            );
        }
        catch { return null; }
    }

    public async Task<ShopStats?> GetStatsAsync()
    {
        try
        {
            var res = await _http.GetAsync($"{_apiUrl}/api/v1/shop/stats");
            if (!res.IsSuccessStatusCode) return null;
            var d = await res.Content.ReadFromJsonAsync<JsonElement>();
            return new ShopStats(
                d.GetProperty("today_orders").GetInt32(),
                d.GetProperty("today_revenue_display").GetString() ?? "0.000 ر.ع",
                d.GetProperty("printing_count").GetInt32(),
                d.GetProperty("ready_count").GetInt32(),
                d.TryGetProperty("orders_delta_percent", out var od) ? od.GetInt32() : 0,
                d.TryGetProperty("week_orders", out var wo) ? wo.GetInt32() : 0,
                d.TryGetProperty("week_revenue_display", out var wr) ? wr.GetString() ?? "—" : "—"
            );
        }
        catch { return null; }
    }

    public async Task<List<ShopOrder>> GetOrdersAsync(string status = "active")
    {
        try
        {
            var res = await _http.GetAsync($"{_apiUrl}/api/v1/shop/orders?status={status}");
            if (!res.IsSuccessStatusCode) return new List<ShopOrder>();
            var data = await res.Content.ReadFromJsonAsync<JsonElement[]>();
            if (data == null) return new List<ShopOrder>();
            return data.Select(ParseOrder).ToList();
        }
        catch { return new List<ShopOrder>(); }
    }

    private static ShopOrder ParseOrder(JsonElement o)
    {
        var jobs = o.TryGetProperty("print_jobs", out var pj) && pj.GetArrayLength() > 0
            ? pj[0].GetProperty("status").GetString() ?? "" : "";
        var items = o.TryGetProperty("items", out var ia)
            ? ia.EnumerateArray().Select(i => new ShopOrderItem(
                i.GetProperty("filename").GetString() ?? "",
                i.GetProperty("page_count").GetInt32(),
                i.GetProperty("copies").GetInt32(),
                i.GetProperty("color_mode").GetString() ?? "bw",
                i.GetProperty("paper_size").GetString() ?? "A4",
                i.GetProperty("sides").GetString() ?? "single"
            )).ToArray()
            : Array.Empty<ShopOrderItem>();

        return new ShopOrder(
            o.GetProperty("id").GetString() ?? "",
            o.GetProperty("order_number").GetString() ?? "",
            o.GetProperty("status").GetString() ?? "",
            o.GetProperty("payment_status").GetString() ?? "",
            o.TryGetProperty("payment_method", out var pm) && pm.ValueKind != JsonValueKind.Null ? pm.GetString() : null,
            o.TryGetProperty("customer_name", out var cn) ? cn.GetString() : null,
            o.TryGetProperty("customer_phone", out var cp) ? cp.GetString() : null,
            o.GetProperty("total_display").GetString() ?? "",
            o.TryGetProperty("total_baisa", out var tb) ? tb.GetInt32() : 0,
            o.GetProperty("item_count").GetInt32(),
            DateTime.Parse(o.GetProperty("created_at").GetString() ?? DateTime.UtcNow.ToString("o")),
            jobs,
            items
        );
    }

    public async Task<List<ShopPayment>> GetPaymentsAsync()
    {
        try
        {
            var res = await _http.GetAsync($"{_apiUrl}/api/v1/shop/payments");
            if (!res.IsSuccessStatusCode) return new List<ShopPayment>();
            var data = await res.Content.ReadFromJsonAsync<JsonElement[]>();
            if (data == null) return new List<ShopPayment>();
            return data.Select(p => new ShopPayment(
                p.GetProperty("id").GetString() ?? "",
                p.GetProperty("order_id").GetString() ?? "",
                p.GetProperty("order_number").GetString() ?? "",
                p.TryGetProperty("customer_name", out var cn) ? cn.GetString() : null,
                p.GetProperty("amount_display").GetString() ?? "",
                p.GetProperty("status").GetString() ?? "",
                p.GetProperty("method").GetString() ?? "",
                p.TryGetProperty("in_store_method", out var im) && im.ValueKind != JsonValueKind.Null ? im.GetString() : null,
                p.TryGetProperty("paid_at", out var pa) && pa.ValueKind != JsonValueKind.Null
                    ? DateTime.Parse(pa.GetString()!) : null
            )).ToList();
        }
        catch { return new List<ShopPayment>(); }
    }

    public async Task<List<ShopCustomer>> GetCustomersAsync()
    {
        try
        {
            var res = await _http.GetAsync($"{_apiUrl}/api/v1/shop/customers");
            if (!res.IsSuccessStatusCode) return new List<ShopCustomer>();
            var data = await res.Content.ReadFromJsonAsync<JsonElement[]>();
            if (data == null) return new List<ShopCustomer>();
            return data.Select(c => new ShopCustomer(
                c.GetProperty("phone").GetString() ?? "",
                c.GetProperty("name").GetString() ?? "—",
                c.GetProperty("order_count").GetInt32(),
                c.GetProperty("total_display").GetString() ?? "",
                DateTime.Parse(c.GetProperty("last_order_at").GetString() ?? DateTime.UtcNow.ToString("o"))
            )).ToList();
        }
        catch { return new List<ShopCustomer>(); }
    }

    public async Task<ShopPricing?> GetPricingAsync()
    {
        try
        {
            var res = await _http.GetAsync($"{_apiUrl}/api/v1/shop/pricing");
            if (!res.IsSuccessStatusCode) return null;
            var d = await res.Content.ReadFromJsonAsync<JsonElement>();
            var rules = d.GetProperty("rules").EnumerateArray().Select(r => new PricingRuleItem(
                r.GetProperty("id").GetString() ?? "",
                r.GetProperty("paper_size").GetString() ?? "",
                r.GetProperty("color_mode").GetString() ?? "",
                r.GetProperty("price_per_page").GetInt32(),
                r.GetProperty("price_display").GetString() ?? ""
            )).ToArray();
            var finishing = d.GetProperty("finishing").EnumerateArray().Select(f => new FinishingItem(
                f.GetProperty("id").GetString() ?? "",
                f.GetProperty("name_ar").GetString() ?? "",
                f.GetProperty("price_baisa").GetInt32(),
                f.GetProperty("price_display").GetString() ?? ""
            )).ToArray();
            return new ShopPricing(rules, finishing);
        }
        catch { return null; }
    }

    public async Task<bool> UpdatePricingRuleAsync(string ruleId, int pricePerPage)
    {
        var res = await _http.PatchAsJsonAsync(
            $"{_apiUrl}/api/v1/shop/pricing/rules/{ruleId}",
            new { price_per_page = pricePerPage });
        return res.IsSuccessStatusCode;
    }

    public async Task<bool> UpdateFinishingAsync(string serviceId, int priceBaisa)
    {
        var res = await _http.PatchAsJsonAsync(
            $"{_apiUrl}/api/v1/shop/pricing/finishing/{serviceId}",
            new { price_baisa = priceBaisa });
        return res.IsSuccessStatusCode;
    }

    public async Task<bool> MarkReadyAsync(string orderId)
    {
        var res = await _http.PostAsync($"{_apiUrl}/api/v1/shop/orders/{orderId}/ready", null);
        return res.IsSuccessStatusCode;
    }

    public async Task<bool> MarkCollectedAsync(string orderId)
    {
        var res = await _http.PostAsync($"{_apiUrl}/api/v1/shop/orders/{orderId}/collected", null);
        return res.IsSuccessStatusCode;
    }

    public async Task<bool> PayInStoreAsync(string orderId, string method = "cash")
    {
        var res = await _http.PostAsJsonAsync(
            $"{_apiUrl}/api/v1/shop/orders/{orderId}/pay",
            new { method });
        return res.IsSuccessStatusCode;
    }

    public async Task<bool> DispatchAsync(string orderId)
    {
        var res = await _http.PostAsync($"{_apiUrl}/api/v1/shop/orders/{orderId}/dispatch", null);
        return res.IsSuccessStatusCode;
    }

    public async Task<bool> RetryAsync(string orderId)
    {
        var res = await _http.PostAsync($"{_apiUrl}/api/v1/shop/orders/{orderId}/retry", null);
        return res.IsSuccessStatusCode;
    }

    public async Task<List<ShopPrinter>> GetPrintersAsync()
    {
        try
        {
            var res = await _http.GetAsync($"{_apiUrl}/api/v1/shop/printers");
            if (!res.IsSuccessStatusCode) return new List<ShopPrinter>();
            var data = await res.Content.ReadFromJsonAsync<JsonElement[]>();
            if (data == null) return new List<ShopPrinter>();
            return data.Select(p => new ShopPrinter(
                p.GetProperty("id").GetString() ?? "",
                p.GetProperty("os_name").GetString() ?? "",
                p.GetProperty("display_name").GetString() ?? p.GetProperty("os_name").GetString() ?? "",
                p.GetProperty("status").GetString() ?? "offline",
                p.GetProperty("supports_color").GetBoolean(),
                p.GetProperty("supports_duplex").GetBoolean(),
                p.GetProperty("supported_sizes").EnumerateArray().Select(s => s.GetString() ?? "A4").ToArray(),
                p.GetProperty("roles").EnumerateArray().Select(r => r.GetString() ?? "").ToArray(),
                p.GetProperty("is_default").GetBoolean(),
                p.TryGetProperty("queue_length", out var ql) ? ql.GetInt32() : 0
            )).ToList();
        }
        catch { return new List<ShopPrinter>(); }
    }

    public async Task<(string? ChallengeId, string? PhoneHint, string? Message, string? DevCode, string? Error)> StartDevicePairAsync(
        string storeSlug, string devicePassword, string deviceName)
    {
        try
        {
            var body = new { store_slug = storeSlug, device_password = devicePassword, device_name = deviceName };
            var res = await _http.PostAsJsonAsync($"{_apiUrl}/api/v1/devices/pair/start", body);
            var data = await res.Content.ReadFromJsonAsync<JsonElement>();
            if (!res.IsSuccessStatusCode)
            {
                var msg = data.TryGetProperty("message", out var m)
                    ? (m.ValueKind == JsonValueKind.Array ? m[0].GetString() : m.GetString())
                    : "فشل إرسال رمز التأكيد";
                return (null, null, null, null, msg);
            }
            return (
                data.GetProperty("challenge_id").GetString(),
                data.TryGetProperty("phone_hint", out var ph) ? ph.GetString() : null,
                data.TryGetProperty("message", out var msgEl) ? msgEl.GetString() : null,
                data.TryGetProperty("dev_code", out var dc) ? dc.GetString() : null,
                null
            );
        }
        catch (Exception ex) { return (null, null, null, null, ex.Message); }
    }

    public async Task<(string? Token, string? Error)> ConfirmDevicePairAsync(string challengeId, string code)
    {
        try
        {
            var body = new { challenge_id = challengeId, code };
            var res = await _http.PostAsJsonAsync($"{_apiUrl}/api/v1/devices/pair/confirm", body);
            var data = await res.Content.ReadFromJsonAsync<JsonElement>();
            if (!res.IsSuccessStatusCode)
            {
                var msg = data.TryGetProperty("message", out var m)
                    ? (m.ValueKind == JsonValueKind.Array ? m[0].GetString() : m.GetString())
                    : "فشل تأكيد الربط";
                return (null, msg);
            }
            return (data.GetProperty("device_token").GetString(), null);
        }
        catch (Exception ex) { return (null, ex.Message); }
    }

    [Obsolete("Use StartDevicePairAsync / ConfirmDevicePairAsync or a token from library web")]
    public Task<(string? DeviceId, string? Token, string? Error)> RegisterDeviceAsync(string storeSlug, string name)
    {
        return Task.FromResult<(string?, string?, string?)>(
            (null, null, "التسجيل المفتوح أُلغي — اربط بكلمة المرور ورمز التأكيد أو من لوحة المكتبة"));
    }
}
