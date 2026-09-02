namespace OmanPrint.Core.Models;

public record PrintSettings(
    int Copies,
    string ColorMode,
    string PaperSize,
    string Sides,
    string Orientation,
    string PageRange
);

public record PrintDispatchPayload(
    string PrintJobId,
    string OrderId,
    string OrderItemId,
    string IdempotencyKey,
    string DocumentUrl,
    string DocumentExpiresAt,
    PrintSettings Settings,
    string? SuggestedPrinterId,
    string Priority,
    string? PrinterOsName
);

public record PrinterInfo(
    string OsName,
    string DisplayName,
    string Status,
    bool SupportsColor,
    bool SupportsDuplex,
    string[] PaperSizes
);

public record WsMessage(
    string Type,
    object Payload,
    string? Timestamp,
    string? MessageId
);
