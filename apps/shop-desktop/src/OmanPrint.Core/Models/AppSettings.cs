namespace OmanPrint.Core.Models;

public class AppSettings
{
    public string ApiUrl { get; set; } = "https://omsp-api.onrender.com";
    public string DeviceToken { get; set; } = "";
    public string DeviceName { get; set; } = "جهاز الكاونتر";
    public string StoreSlug { get; set; } = "al-noor";
    public bool AutoConnect { get; set; } = true;
    public bool SetupCompleted { get; set; }
    public Dictionary<string, string[]> PrinterRoles { get; set; } = new();
}
