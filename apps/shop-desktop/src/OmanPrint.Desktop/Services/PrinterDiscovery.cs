using System.Drawing.Printing;
using System.Printing;
using OmanPrint.Core.Models;

namespace OmanPrint.Desktop.Services;

public static class PrinterDiscovery
{
    public static string? LastError { get; private set; }

    public static List<PrinterInfo> GetInstalledPrinters()
    {
        LastError = null;

        try
        {
            return GetFromPrintServer();
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
        }

        try
        {
            return GetFromPrinterSettings();
        }
        catch (Exception ex)
        {
            LastError = ex.Message;
            return new List<PrinterInfo>();
        }
    }

    private static List<PrinterInfo> GetFromPrintServer()
    {
        var printers = new List<PrinterInfo>();
        using var server = new LocalPrintServer();

        foreach (var queue in server.GetPrintQueues())
        {
            try
            {
                var caps = queue.GetPrintCapabilities(queue.DefaultPrintTicket);
                var supportsColor = caps.OutputColorCapability?.Contains(OutputColor.Color) ?? false;
                var supportsDuplex = caps.DuplexingCapability?.Any(d => d != Duplexing.OneSided) ?? false;

                printers.Add(new PrinterInfo(
                    OsName: queue.Name,
                    DisplayName: queue.Name,
                    Status: queue.IsOffline ? "offline" : "online",
                    SupportsColor: supportsColor,
                    SupportsDuplex: supportsDuplex,
                    PaperSizes: new[] { "A4", "A3", "A5" }
                ));
            }
            catch
            {
                printers.Add(new PrinterInfo(
                    OsName: queue.Name,
                    DisplayName: queue.Name,
                    Status: "offline",
                    SupportsColor: false,
                    SupportsDuplex: false,
                    PaperSizes: new[] { "A4" }
                ));
            }
        }

        return printers;
    }

    private static List<PrinterInfo> GetFromPrinterSettings()
    {
        var printers = new List<PrinterInfo>();
        foreach (string name in PrinterSettings.InstalledPrinters)
        {
            printers.Add(new PrinterInfo(
                OsName: name,
                DisplayName: name,
                Status: "online",
                SupportsColor: name.Contains("color", StringComparison.OrdinalIgnoreCase),
                SupportsDuplex: true,
                PaperSizes: new[] { "A4", "A3", "A5" }
            ));
        }
        return printers;
    }
}
