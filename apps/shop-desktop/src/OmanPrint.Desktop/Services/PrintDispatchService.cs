using System.Diagnostics;
using System.Drawing.Printing;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using OmanPrint.Core.Models;

namespace OmanPrint.Desktop.Services;

public class PrintDispatchService
{
    private readonly HashSet<string> _processedJobs = new();
    private readonly HttpClient _http = new();

    public event Action<string>? OnLog;

    public async Task HandleDispatchAsync(PrintDispatchPayload job, IEnumerable<PrinterInfo> printers, Func<string, string, string, int, long, Task> onCompleted, Func<string, string, string, string, Task> onFailed)
    {
        if (_processedJobs.Contains(job.IdempotencyKey))
        {
            Log($"تخطي مهمة مكررة: {job.IdempotencyKey}");
            return;
        }

        _processedJobs.Add(job.IdempotencyKey);
        var sw = Stopwatch.StartNew();

        try
        {
            var printerName = job.PrinterOsName
                ?? printers.FirstOrDefault(p => p.Status == "online")?.OsName;

            if (string.IsNullOrEmpty(printerName))
            {
                await onFailed(job.PrintJobId, job.OrderId, "no_printer", "لا توجد طابعة متاحة");
                return;
            }

            Log($"تحميل المستند: {job.PrintJobId}");
            var tempFile = Path.Combine(Path.GetTempPath(), $"omsp_{job.PrintJobId}.pdf");
            var bytes = await _http.GetByteArrayAsync(job.DocumentUrl);
            await File.WriteAllBytesAsync(tempFile, bytes);

            Log($"طباعة على: {printerName}");
            await PrintPdfAsync(tempFile, printerName, job.Settings);

            sw.Stop();
            await onCompleted(job.PrintJobId, job.OrderId, printerName, job.Settings.Copies, sw.ElapsedMilliseconds);

            try { File.Delete(tempFile); } catch { /* ignore */ }
        }
        catch (Exception ex)
        {
            sw.Stop();
            await onFailed(job.PrintJobId, job.OrderId, "print_error", ex.Message);
        }
    }

    private static Task PrintPdfAsync(string filePath, string printerName, PrintSettings settings)
    {
        return Task.Run(() =>
        {
            // Prefer Shell PrintTo (uses installed PDF handler: Edge/Adobe/etc.)
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = filePath,
                    Verb = "PrintTo",
                    Arguments = $"\"{printerName}\"",
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden,
                    UseShellExecute = true,
                };
                using var proc = Process.Start(psi);
                if (proc != null)
                {
                    proc.WaitForExit(60_000);
                    return;
                }
            }
            catch
            {
                // Fall through to GDI fallback
            }

            using var doc = new PrintDocument();
            doc.PrinterSettings.PrinterName = printerName;
            doc.PrinterSettings.Copies = (short)Math.Clamp(settings.Copies, 1, 99);
            if (settings.Sides != "single")
                doc.PrinterSettings.Duplex = Duplex.Vertical;
            doc.DocumentName = Path.GetFileName(filePath);

            var printed = false;
            doc.PrintPage += (_, e) =>
            {
                if (printed) { e.HasMorePages = false; return; }
                printed = true;
                e.HasMorePages = false;
                e.Graphics?.DrawString(
                    $"[OMSP] طباعة: {Path.GetFileName(filePath)} — {settings.Copies} نسخة\n(ثبّت قارئ PDF لاستخدام الطباعة الحقيقية)",
                    new System.Drawing.Font("Arial", 12),
                    System.Drawing.Brushes.Black,
                    50, 50);
            };
            doc.Print();
        });
    }

    private void Log(string msg) => OnLog?.Invoke(msg);

    public static PrintDispatchPayload? ParseDispatch(JsonElement payload)
    {
        try
        {
            var settings = payload.GetProperty("settings");
            return new PrintDispatchPayload(
                PrintJobId: payload.GetProperty("print_job_id").GetString()!,
                OrderId: payload.GetProperty("order_id").GetString()!,
                OrderItemId: payload.GetProperty("order_item_id").GetString()!,
                IdempotencyKey: payload.GetProperty("idempotency_key").GetString()!,
                DocumentUrl: payload.GetProperty("document_url").GetString()!,
                DocumentExpiresAt: payload.GetProperty("document_expires_at").GetString()!,
                Settings: new PrintSettings(
                    Copies: settings.GetProperty("copies").GetInt32(),
                    ColorMode: settings.GetProperty("color_mode").GetString() ?? "bw",
                    PaperSize: settings.GetProperty("paper_size").GetString() ?? "A4",
                    Sides: settings.GetProperty("sides").GetString() ?? "single",
                    Orientation: settings.GetProperty("orientation").GetString() ?? "auto",
                    PageRange: settings.GetProperty("page_range").GetString() ?? "all"
                ),
                SuggestedPrinterId: payload.TryGetProperty("suggested_printer_id", out var sp) && sp.ValueKind != JsonValueKind.Null ? sp.GetString() : null,
                Priority: payload.GetProperty("priority").GetString() ?? "normal",
                PrinterOsName: payload.TryGetProperty("printer_os_name", out var pn) && pn.ValueKind != JsonValueKind.Null ? pn.GetString() : null
            );
        }
        catch
        {
            return null;
        }
    }
}
