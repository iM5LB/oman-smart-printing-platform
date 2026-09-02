namespace OmanPrint.Core.Models;

public record ShopInfo(
    string StoreName,
    string StoreSlug,
    string DeviceName,
    bool AutoPrintPaidOrders
);

public record ShopOrderItem(
    string Filename,
    int PageCount,
    int Copies,
    string ColorMode,
    string PaperSize,
    string Sides
);

public record ShopOrder(
    string Id,
    string OrderNumber,
    string Status,
    string PaymentStatus,
    string? PaymentMethod,
    string? CustomerName,
    string? CustomerPhone,
    string TotalDisplay,
    int TotalBaisa,
    int ItemCount,
    DateTime CreatedAt,
    string PrintJobStatus,
    ShopOrderItem[] Items
);

public record ShopStats(
    int TodayOrders,
    string TodayRevenueDisplay,
    int PrintingCount,
    int ReadyCount,
    int OrdersDeltaPercent,
    int WeekOrders,
    string WeekRevenueDisplay
);

public record ShopPrinter(
    string Id,
    string OsName,
    string DisplayName,
    string Status,
    bool SupportsColor,
    bool SupportsDuplex,
    string[] SupportedSizes,
    string[] Roles,
    bool IsDefault,
    int QueueLength
);

public record ShopPayment(
    string Id,
    string OrderId,
    string OrderNumber,
    string? CustomerName,
    string AmountDisplay,
    string Status,
    string Method,
    string? InStoreMethod,
    DateTime? PaidAt
);

public record ShopCustomer(
    string Phone,
    string Name,
    int OrderCount,
    string TotalDisplay,
    DateTime LastOrderAt
);

public record PricingRuleItem(
    string Id,
    string PaperSize,
    string ColorMode,
    int PricePerPage,
    string PriceDisplay
);

public record FinishingItem(
    string Id,
    string NameAr,
    int PriceBaisa,
    string PriceDisplay
);

public record ShopPricing(
    PricingRuleItem[] Rules,
    FinishingItem[] Finishing
);
