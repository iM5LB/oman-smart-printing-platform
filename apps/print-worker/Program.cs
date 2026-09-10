using System.Diagnostics;
using System.Drawing;
using System.Drawing.Printing;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace OmanPrint.PrintWorker;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    public static int Main()
    {
        Console.InputEncoding = Encoding.UTF8;
        Console.OutputEncoding = Encoding.UTF8;

        string? line;
        while ((line = Console.ReadLine()) is not null)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;

            try
            {
                var req = JsonNode.Parse(line)?.AsObject();
                if (req is null)
                {
                    Write(new { ok = false, messageAr = "طلب غير صالح" });
                    continue;
                }

                var cmd = req["cmd"]?.GetValue<string>() ?? "";
                switch (cmd)
                {
                    case "printers.list":
                        Write(new { printers = ListPrinters() });
                        break;
                    case "print.test":
                    {
                        var printerId = req["printerId"]?.GetValue<string>() ?? "";
                        Write(PrintTest(printerId));
                        break;
                    }
                    case "print.document":
                    {
                        var filePath = req["filePath"]?.GetValue<string>() ?? "";
                        var printerId = req["printerId"]?.GetValue<string>() ?? "";
                        var copies = req["copies"]?.GetValue<int?>() ?? 1;
                        var sides = req["sides"]?.GetValue<string>() ?? "single";
                        Write(PrintDocumentFile(filePath, printerId, copies, sides));
                        break;
                    }
                    case "ping":
                        Write(new { ok = true, pong = true });
                        break;
                    default:
                        Write(new { ok = false, messageAr = $"أمر غير معروف: {cmd}" });
                        break;
                }
            }
            catch (Exception ex)
            {
                Write(new { ok = false, messageAr = ex.Message });
            }
        }

        return 0;
    }

    private static void Write(object payload)
    {
        Console.WriteLine(JsonSerializer.Serialize(payload, JsonOpts));
        Console.Out.Flush();
    }

    private static List<object> ListPrinters()
    {
        var printers = new List<object>();
        var defaultName = new PrinterSettings().PrinterName;

        foreach (string name in PrinterSettings.InstalledPrinters)
        {
            var settings = new PrinterSettings { PrinterName = name };
            printers.Add(new
            {
                id = name,
                name,
                status = settings.IsValid ? "online" : "offline",
                isDefault = string.Equals(name, defaultName, StringComparison.OrdinalIgnoreCase),
                supportsColor = settings.SupportsColor,
                supportsDuplex = settings.CanDuplex,
                queueCount = 0,
            });
        }

        return printers;
    }

    private static object PrintTest(string printerId)
    {
        if (string.IsNullOrWhiteSpace(printerId))
        {
            return new { ok = false, messageAr = "لم يتم تحديد الطابعة" };
        }

        var installed = PrinterSettings.InstalledPrinters.Cast<string>()
            .Any(n => string.Equals(n, printerId, StringComparison.OrdinalIgnoreCase));

        if (!installed)
        {
            return new { ok = false, messageAr = "الطابعة غير موجودة على هذا الجهاز" };
        }

        try
        {
            using var doc = new PrintDocument();
            doc.PrinterSettings.PrinterName = printerId;
            doc.DocumentName = "OMSP Test Page";
            doc.PrintPage += (_, e) =>
            {
                using var titleFont = new Font("Segoe UI", 18, FontStyle.Bold);
                using var bodyFont = new Font("Segoe UI", 12);
                var g = e.Graphics!;
                var y = e.MarginBounds.Top;
                g.DrawString("عمان للطباعة الذكية — صفحة اختبار", titleFont, Brushes.Black, e.MarginBounds.Left, y);
                y += 40;
                g.DrawString($"الطابعة: {printerId}", bodyFont, Brushes.Black, e.MarginBounds.Left, y);
                y += 28;
                g.DrawString($"الوقت: {DateTime.Now:yyyy-MM-dd HH:mm:ss}", bodyFont, Brushes.Black, e.MarginBounds.Left, y);
                y += 28;
                g.DrawString("إذا ظهرت هذه الصفحة، فالاتصال بالطابعة يعمل.", bodyFont, Brushes.Black, e.MarginBounds.Left, y);
                e.HasMorePages = false;
            };
            doc.Print();
            return new { ok = true };
        }
        catch (Exception ex)
        {
            return new { ok = false, messageAr = $"فشلت طباعة الاختبار: {ex.Message}" };
        }
    }

    private static object PrintDocumentFile(string filePath, string printerId, int copies, string sides)
    {
        if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
        {
            return new { ok = false, messageAr = "ملف الطباعة غير موجود" };
        }

        if (string.IsNullOrWhiteSpace(printerId))
        {
            printerId = new PrinterSettings().PrinterName;
        }

        var installed = PrinterSettings.InstalledPrinters.Cast<string>()
            .Any(n => string.Equals(n, printerId, StringComparison.OrdinalIgnoreCase));

        if (!installed)
        {
            return new { ok = false, messageAr = "الطابعة غير موجودة على هذا الجهاز" };
        }

        try
        {
            // Prefer Shell PrintTo (Edge/Adobe PDF handler).
            var psi = new ProcessStartInfo
            {
                FileName = filePath,
                Verb = "PrintTo",
                Arguments = $"\"{printerId}\"",
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                UseShellExecute = true,
            };

            var printedViaShell = false;
            try
            {
                using var proc = Process.Start(psi);
                if (proc != null)
                {
                    proc.WaitForExit(90_000);
                    printedViaShell = true;
                }
            }
            catch
            {
                printedViaShell = false;
            }

            if (printedViaShell)
            {
                // Extra copies via additional PrintTo calls when shell ignores copies.
                var extra = Math.Clamp(copies, 1, 99) - 1;
                for (var i = 0; i < extra; i++)
                {
                    try
                    {
                        using var again = Process.Start(psi);
                        again?.WaitForExit(90_000);
                    }
                    catch
                    {
                        break;
                    }
                }

                return new { ok = true };
            }

            using var doc = new PrintDocument();
            doc.PrinterSettings.PrinterName = printerId;
            doc.PrinterSettings.Copies = (short)Math.Clamp(copies, 1, 99);
            if (!string.Equals(sides, "single", StringComparison.OrdinalIgnoreCase))
            {
                doc.PrinterSettings.Duplex = Duplex.Vertical;
            }
            doc.DocumentName = Path.GetFileName(filePath);

            var printed = false;
            doc.PrintPage += (_, e) =>
            {
                if (printed)
                {
                    e.HasMorePages = false;
                    return;
                }
                printed = true;
                e.HasMorePages = false;
                e.Graphics?.DrawString(
                    $"[OMSP] {Path.GetFileName(filePath)}\nثبّت قارئ PDF لاستخدام الطباعة الحقيقية",
                    new Font("Segoe UI", 12),
                    Brushes.Black,
                    50,
                    50);
            };
            doc.Print();
            return new { ok = true };
        }
        catch (Exception ex)
        {
            return new { ok = false, messageAr = $"فشلت الطباعة: {ex.Message}" };
        }
    }
}
