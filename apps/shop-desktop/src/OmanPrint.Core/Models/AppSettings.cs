namespace OmanPrint.Core.Models;

public class AppSettings
{
    public string ApiUrl { get; set; } = "http://localhost:4000";
    public string DeviceToken { get; set; } = "";
    public string DeviceName { get; set; } = "جهاز الكاونتر";
    public string StoreSlug { get; set; } = "al-noor";
    public bool AutoConnect { get; set; } = true;
    public bool SetupCompleted { get; set; }
    public Dictionary<string, string[]> PrinterRoles { get; set; } = new();
}
