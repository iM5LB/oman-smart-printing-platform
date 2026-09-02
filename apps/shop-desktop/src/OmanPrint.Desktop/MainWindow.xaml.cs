using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Net.Sockets;
using System.ServiceProcess;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Threading;
using OmanPrint.ApiClient;
using OmanPrint.Core.Models;
using OmanPrint.Desktop.Services;

namespace OmanPrint.Desktop;

public partial class MainWindow : Window
{
    private readonly AppSettings _settings;
    private readonly ShopApiClient _api = new();
    private readonly PrintDispatchService _printService = new();
    private ShopWebSocketClient? _client;
    private readonly DispatcherTimer _heartbeatTimer = new() { Interval = TimeSpan.FromSeconds(30) };
    private readonly DispatcherTimer _refreshTimer = new() { Interval = TimeSpan.FromSeconds(15) };
    private readonly DispatcherTimer _toastTimer = new() { Interval = TimeSpan.FromSeconds(5) };
    private readonly DispatcherTimer _clockTimer = new() { Interval = TimeSpan.FromSeconds(30) };
    private List<ShopOrder> _orders = new();
    private ShopOrder? _selectedOrder;
    private ShopOrder? _pickupOrder;
    private List<PriceRuleVm> _priceRules = new();
    private List<FinishingVm> _finishing = new();
    private bool _uiReady;
    private bool _suppressSelection;
    private bool _wasConnected;
    private string _searchQuery = "";
    private string? _ordersStatusFilter;
    private string? _queueCurrentOrderId;

    private static readonly Dictionary<string, string[]> OrderStatusFilterGroups = new()
    {
        ["new"] = ["submitted", "draft", "payment_pending", "paid"],
        ["review"] = ["needs_review", "review_pending", "failed"],
        ["queued"] = ["queued"],
        ["printing"] = ["printing"],
        ["preparing"] = ["preparing", "awaiting_finishing"],
        ["ready"] = ["ready"],
        ["completed"] = ["collected", "completed"],
        ["cancelled"] = ["cancelled"],
    };

    private static readonly Dictionary<string, string> StatusAr = new()
    {
        ["draft"] = "مسودة",
        ["submitted"] = "تم استلام الطلب",
        ["payment_pending"] = "بانتظار الدفع",
        ["paid"] = "تم الدفع",
        ["review_pending"] = "قيد المراجعة",
        ["queued"] = "بانتظار الطباعة",
        ["preparing"] = "جاري التجهيز",
        ["printing"] = "جاري الطباعة",
        ["awaiting_finishing"] = "بانتظار التجهيز",
        ["ready"] = "جاهز للاستلام",
        ["collected"] = "تم الاستلام",
        ["completed"] = "مكتمل",
        ["needs_review"] = "يحتاج مراجعة",
        ["cancelled"] = "ملغي",
        ["failed"] = "تعذر التنفيذ",
    };

    private static readonly Dictionary<string, string> PaymentStatusAr = new()
    {
        ["unpaid"] = "غير مدفوع",
        ["pending"] = "بانتظار الدفع",
        ["processing"] = "جاري معالجة الدفع",
        ["completed"] = "مدفوع",
        ["failed"] = "فشل الدفع",
        ["cancelled"] = "أُلغي الدفع",
        ["refunded"] = "تم الاسترداد",
    };

    public MainWindow()
    {
        InitializeComponent();
        FitToScreen();
        _settings = SettingsService.Load();
        ApplySettingsToUi();

        _printService.OnLog += msg => Dispatcher.Invoke(() => AppendLog(msg));
        _heartbeatTimer.Tick += async (_, _) =>
        {
            try
            {
                if (_client?.IsConnected == true)
                    await _client.SendAsync("device.heartbeat", new { });
            }
            catch (Exception ex)
            {
                AppendLog($"نبضة الاتصال فشلت: {ex.Message}");
                SetConnectionStatus(false, "انقطع الاتصال");
            }
        };
        _refreshTimer.Tick += async (_, _) =>
        {
            try { await RefreshAllAsync(); }
            catch (Exception ex) { AppendLog($"تحديث دوري فشل: {ex.Message}"); }
        };
        _toastTimer.Tick += (_, _) => ToastBanner.Visibility = Visibility.Collapsed;
        _clockTimer.Tick += (_, _) => UpdateClock();

        foreach (var nav in new[] { NavDashboard, NavOrders, NavPrintQueue, NavPrinters, NavPayments, NavCustomers, NavPrices, NavReports, NavPickup, NavEmployees, NavNotifications, NavAudit, NavSettings })
            nav.Checked += Nav_Checked;

        Loaded += OnWindowLoaded;
        UpdateClock();
        _clockTimer.Start();
    }

    private void FitToScreen()
    {
        var work = SystemParameters.WorkArea;
        var targetW = Math.Min(1180, work.Width * 0.94);
        var targetH = Math.Min(780, work.Height * 0.92);
        MinWidth = Math.Min(900, work.Width * 0.9);
        MinHeight = Math.Min(560, work.Height * 0.85);
        Width = Math.Max(MinWidth, targetW);
        Height = Math.Max(MinHeight, targetH);
        Left = work.Left + (work.Width - Width) / 2;
        Top = work.Top + (work.Height - Height) / 2;

        // Small laptops / low resolution: open maximized so nothing is clipped
        if (work.Width < 1280 || work.Height < 800)
            WindowState = WindowState.Maximized;
    }

    private void Window_StateChanged(object sender, EventArgs e)
    {
        // Keep usable when restored from maximized
        if (WindowState == WindowState.Normal)
        {
            var work = SystemParameters.WorkArea;
            if (Width > work.Width) Width = work.Width * 0.94;
            if (Height > work.Height) Height = work.Height * 0.92;
        }
    }

    private void SetDetailVisible(bool visible)
    {
        DetailColumn.Width = visible
            ? new GridLength(Math.Min(360, Math.Max(320, (int)(SystemParameters.WorkArea.Width * 0.28))))
            : new GridLength(0);
    }

    private void SetQueueProgress(double value)
    {
        QueueProgress.Value = value;
        QueueProgressPct.Text = $"{(int)value}%";
    }

    private void HideAllPages()
    {
        PageDashboard.Visibility = Visibility.Collapsed;
        PageOrders.Visibility = Visibility.Collapsed;
        PagePrintQueue.Visibility = Visibility.Collapsed;
        PagePrinters.Visibility = Visibility.Collapsed;
        PagePayments.Visibility = Visibility.Collapsed;
        PageCustomers.Visibility = Visibility.Collapsed;
        PagePrices.Visibility = Visibility.Collapsed;
        PageReports.Visibility = Visibility.Collapsed;
        PageSettings.Visibility = Visibility.Collapsed;
        PagePickup.Visibility = Visibility.Collapsed;
        PageEmployees.Visibility = Visibility.Collapsed;
        PageNotifications.Visibility = Visibility.Collapsed;
        PageAudit.Visibility = Visibility.Collapsed;
    }

    private void OnWindowLoaded(object sender, RoutedEventArgs e)
    {
        try
        {
            _uiReady = true;
            HideAllPages();
            PageDashboard.Visibility = Visibility.Visible;
            ApplyNavState(NavDashboard);

            if (!_settings.SetupCompleted)
            {
                SetupOverlay.Visibility = Visibility.Visible;
                SetupApiUrl.Text = _settings.ApiUrl;
                SetupStoreSlug.Text = _settings.StoreSlug;
                SetupDeviceName.Text = _settings.DeviceName;
            }
            else
            {
                Dispatcher.BeginInvoke(DispatcherPriority.ApplicationIdle, () => FireAndForget(RunStartupWorkAsync()));
            }
        }
        catch (Exception ex)
        {
            var inner = ex;
            while (inner.InnerException != null) inner = inner.InnerException;
            MessageBox.Show($"خطأ عند التشغيل:\n{inner.Message}", "منصة الطباعة", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private async Task RunStartupWorkAsync()
    {
        try
        {
            await RefreshPrintersUiSafe();
            if (_settings.AutoConnect)
                await ConnectAsync();
        }
        catch (Exception ex)
        {
            AppendLog($"خطأ عند بدء التشغيل: {ex.Message}");
        }
    }

    private void ApplyNavState(RadioButton activeNav)
    {
        if (!_uiReady || PageDashboard == null) return;

        HideAllPages();
        ConnectBtn.Content = _client?.IsConnected == true ? "قطع الاتصال" : "اتصال";
        WelcomeText.Visibility = Visibility.Collapsed;
        SetDetailVisible(false);

        if (activeNav == NavDashboard)
        {
            PageDashboard.Visibility = Visibility.Visible;
            PageTitleText.Text = "لوحة التحكم";
            WelcomeText.Text = string.IsNullOrWhiteSpace(UserNameText.Text) || UserNameText.Text == "موظف الطباعة"
                ? "مرحباً، إليك نظرة عامة على عمليات اليوم"
                : $"مرحباً {UserNameText.Text}، إليك نظرة عامة على العمليات اليوم";
            WelcomeText.Visibility = Visibility.Visible;
            SetDetailVisible(true);
            FireAndForget(RefreshAllAsync());
        }
        else if (activeNav == NavOrders)
        {
            PageOrders.Visibility = Visibility.Visible;
            PageTitleText.Text = "الطلبات";
            SetDetailVisible(true);
            FireAndForget(RefreshOrdersAsync());
        }
        else if (activeNav == NavPrintQueue)
        {
            PagePrintQueue.Visibility = Visibility.Visible;
            PageTitleText.Text = "قائمة الطباعة";
            FireAndForget(RefreshOrdersAsync());
        }
        else if (activeNav == NavPrinters)
        {
            PagePrinters.Visibility = Visibility.Visible;
            PageTitleText.Text = "الطابعات";
            FireAndForget(RefreshPrintersUiSafe());
        }
        else if (activeNav == NavPayments)
        {
            PagePayments.Visibility = Visibility.Visible;
            PageTitleText.Text = "المدفوعات";
            FireAndForget(RefreshPaymentsAsync());
        }
        else if (activeNav == NavCustomers)
        {
            PageCustomers.Visibility = Visibility.Visible;
            PageTitleText.Text = "العملاء";
            FireAndForget(RefreshCustomersAsync());
        }
        else if (activeNav == NavPrices)
        {
            PagePrices.Visibility = Visibility.Visible;
            PageTitleText.Text = "الأسعار والخدمات";
            FireAndForget(RefreshPricingAsync());
        }
        else if (activeNav == NavReports)
        {
            PageReports.Visibility = Visibility.Visible;
            PageTitleText.Text = "التقارير";
            FireAndForget(RefreshStatsAsync());
        }
        else if (activeNav == NavPickup)
        {
            PagePickup.Visibility = Visibility.Visible;
            PageTitleText.Text = "الاستلام";
            ClearPickupResult();
            Dispatcher.BeginInvoke(DispatcherPriority.Input, () => PickupSearchBox.Focus());
        }
        else if (activeNav == NavEmployees)
        {
            PageEmployees.Visibility = Visibility.Visible;
            PageTitleText.Text = "الموظفون";
        }
        else if (activeNav == NavNotifications)
        {
            PageNotifications.Visibility = Visibility.Visible;
            PageTitleText.Text = "الإشعارات";
        }
        else if (activeNav == NavAudit)
        {
            PageAudit.Visibility = Visibility.Visible;
            PageTitleText.Text = "سجل العمليات";
        }
        else if (activeNav == NavSettings)
        {
            PageSettings.Visibility = Visibility.Visible;
            PageTitleText.Text = "الإعدادات";
        }
    }

    private void Nav_Checked(object sender, RoutedEventArgs e)
    {
        if (!_uiReady || sender is not RadioButton nav) return;
        ApplyNavState(nav);
    }

    private void ApplySettingsToUi()
    {
        ApiUrlBox.Text = _settings.ApiUrl;
        DeviceTokenBox.Text = _settings.DeviceToken;
        AutoConnectCheck.IsChecked = _settings.AutoConnect;
        RegisterStoreSlug.Text = _settings.StoreSlug;
        RegisterDeviceName.Text = _settings.DeviceName;
        _api.Configure(_settings.ApiUrl, _settings.DeviceToken);
    }

    private async void SetupSave_Click(object sender, RoutedEventArgs e)
    {
        SetupError.Visibility = Visibility.Collapsed;
        _settings.ApiUrl = SetupApiUrl.Text.Trim();
        _settings.StoreSlug = SetupStoreSlug.Text.Trim();
        _settings.DeviceName = SetupDeviceName.Text.Trim();

        if (SetupUseExistingToken.IsChecked == true)
        {
            _settings.DeviceToken = SetupDeviceToken.Text.Trim();
        }
        else
        {
            _api.Configure(_settings.ApiUrl, "");
            var (_, token, error) = await _api.RegisterDeviceAsync(_settings.StoreSlug, _settings.DeviceName);
            if (token == null)
            {
                SetupError.Text = error ?? "فشل تسجيل الجهاز";
                SetupError.Visibility = Visibility.Visible;
                return;
            }
            _settings.DeviceToken = token;
        }

        _settings.SetupCompleted = true;
        _settings.AutoConnect = true;
        SettingsService.Save(_settings);
        ApplySettingsToUi();
        SetupOverlay.Visibility = Visibility.Collapsed;
        await RefreshPrintersUiSafe();
        await ConnectAsync();
    }

    private async void ConnectBtn_Click(object sender, RoutedEventArgs e)
    {
        if (_client?.IsConnected == true)
            await DisconnectAsync();
        else
            await ConnectAsync();
    }

    private async Task ConnectAsync()
    {
        _settings.ApiUrl = ApiUrlBox.Text.Trim();
        _settings.DeviceToken = DeviceTokenBox.Text.Trim();
        SettingsService.Save(_settings);
        _api.Configure(_settings.ApiUrl, _settings.DeviceToken);

        try
        {
            SetConnectionStatus(false, "جاري الاتصال...");

            if (!await _api.HealthCheckAsync())
                AppendLog("تحذير: الخادم غير متاح — تحقق من رابط API");

            _client = new ShopWebSocketClient(_settings.ApiUrl, _settings.DeviceToken);
            _client.OnLog += msg => Dispatcher.Invoke(() => AppendLog(msg));
            _client.OnError += ex => Dispatcher.Invoke(() =>
            {
                AppendLog($"خطأ اتصال: {ex.Message}");
                if (_client?.IsConnected != true)
                    SetConnectionStatus(false, "انقطع الاتصال");
            });
            _client.OnMessage += msg => Dispatcher.Invoke(() => FireAndForget(HandleMessageAsync(msg)));

            await _client.ConnectAsync();
            var printers = PrinterDiscovery.GetInstalledPrinters();
            await _client.SendHelloAsync("1.0.0", printers);

            var me = await _api.GetMeAsync();
            if (me != null)
            {
                StoreNameText.Text = me.StoreName;
                SetUserProfile(me.DeviceName);
                WelcomeText.Text = $"مرحباً {me.DeviceName}، إليك نظرة عامة على عمليات اليوم";
                AppendLog($"متصل بمكتبة: {me.StoreName}");
            }

            SetConnectionStatus(true, "متصل بالإنترنت");
            _wasConnected = true;
            ConnectBtn.Content = "قطع الاتصال";
            _heartbeatTimer.Start();
            _refreshTimer.Start();
            await RefreshAllAsync();
            AppendLog("تم الاتصال وإرسال بيانات الطابعات");
        }
        catch (Exception ex)
        {
            AppendLog($"فشل الاتصال: {ex.Message}");
            SetConnectionStatus(false, "فشل الاتصال");
        }
    }

    private async Task DisconnectAsync()
    {
        _heartbeatTimer.Stop();
        _refreshTimer.Stop();
        if (_client != null)
        {
            await _client.DisposeAsync();
            _client = null;
        }
        SetConnectionStatus(false, "غير متصل");
        ConnectBtn.Content = "اتصال";
    }

    private void SetConnectionStatus(bool connected, string text)
    {
        var dotColor = connected
            ? Color.FromRgb(0x22, 0xC5, 0x5E)
            : Color.FromRgb(0xEF, 0x44, 0x44);
        StatusDot.Fill = new SolidColorBrush(dotColor);
        ConnectionStatus.Text = text;
        StatusBarDot.Fill = new SolidColorBrush(dotColor);
        ConnectionStatusBarText.Text = text;
        OfflineBanner.Visibility = !connected && _wasConnected
            ? Visibility.Visible
            : Visibility.Collapsed;
    }

    private void UpdateClock()
    {
        if (ClockText != null)
            ClockText.Text = FormatClock(DateTime.Now);
    }

    private void Window_PreviewKeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.F2)
        {
            NavPickup.IsChecked = true;
            PickupSearchBox.Focus();
            PickupSearchBox.SelectAll();
            e.Handled = true;
        }
        else if (e.Key == Key.K && Keyboard.Modifiers == ModifierKeys.Control)
        {
            GlobalSearchBox.Focus();
            GlobalSearchBox.SelectAll();
            e.Handled = true;
        }
    }

    private void GlobalSearchBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        _searchQuery = GlobalSearchBox.Text.Trim();
        if (GlobalSearchHint != null)
            GlobalSearchHint.Visibility = string.IsNullOrEmpty(GlobalSearchBox.Text)
                ? Visibility.Visible
                : Visibility.Collapsed;
        ApplyOrderFilters();
    }

    private void GlobalSearchBox_KeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter)
        {
            ApplyOrderFilters();
            e.Handled = true;
        }
    }

    private void ApplyOrderFilters()
    {
        var dashboardItems = BuildOrderViewModels(_orders);
        LiveOrdersGrid.ItemsSource = dashboardItems;

        var ordersSource = ApplyStatusFilter(_orders);
        var ordersItems = BuildOrderViewModels(ordersSource);
        OrdersGrid.ItemsSource = ordersItems;

        var hasDashboardOrders = dashboardItems.Count > 0;
        NoRecentOrders.Visibility = hasDashboardOrders ? Visibility.Collapsed : Visibility.Visible;
        LiveOrdersGrid.Visibility = hasDashboardOrders ? Visibility.Visible : Visibility.Collapsed;

        var hasOrdersPageItems = ordersItems.Count > 0;
        NoOrdersPanel.Visibility = hasOrdersPageItems ? Visibility.Collapsed : Visibility.Visible;
        OrdersGrid.Visibility = hasOrdersPageItems ? Visibility.Visible : Visibility.Collapsed;

        UpdateOrderFilterBadges();
    }

    private IEnumerable<ShopOrder> ApplyStatusFilter(IEnumerable<ShopOrder> orders)
    {
        if (string.IsNullOrEmpty(_ordersStatusFilter))
            return orders;

        if (!OrderStatusFilterGroups.TryGetValue(_ordersStatusFilter, out var statuses))
            return orders;

        return orders.Where(o =>
        {
            var key = (o.Status ?? "").Trim().ToLowerInvariant();
            return statuses.Contains(key);
        });
    }

    private void UpdateOrderFilterBadges()
    {
        if (FilterAllCount == null) return;

        int CountFor(string? key) => key switch
        {
            null or "" => _orders.Count,
            _ when OrderStatusFilterGroups.TryGetValue(key, out var statuses) =>
                _orders.Count(o => statuses.Contains((o.Status ?? "").Trim().ToLowerInvariant())),
            _ => 0,
        };

        FilterAllCount.Text = CountFor(null).ToString();
        FilterNewCount.Text = CountFor("new").ToString();
        FilterReviewCount.Text = CountFor("review").ToString();
        FilterQueuedCount.Text = CountFor("queued").ToString();
        FilterPrintingCount.Text = CountFor("printing").ToString();
        FilterPreparingCount.Text = CountFor("preparing").ToString();
        FilterReadyCount.Text = CountFor("ready").ToString();
        FilterCompletedCount.Text = CountFor("completed").ToString();
        FilterCancelledCount.Text = CountFor("cancelled").ToString();
    }

    private void OrdersFilter_Checked(object sender, RoutedEventArgs e)
    {
        if (!_uiReady || sender is not RadioButton nav) return;
        _ordersStatusFilter = string.IsNullOrEmpty(nav.Tag as string) ? null : nav.Tag as string;
        ApplyOrderFilters();
    }

    private List<OrderViewModel> BuildOrderViewModels(IEnumerable<ShopOrder> orders)
    {
        var items = orders.Select(o => new OrderViewModel(o)).ToList();
        if (string.IsNullOrWhiteSpace(_searchQuery))
            return items;

        var q = _searchQuery.Trim();
        var digits = new string(q.Where(char.IsDigit).ToArray());
        return items.Where(o =>
        {
            if (o.CustomerName.Contains(q, StringComparison.OrdinalIgnoreCase)) return true;
            if (!string.IsNullOrEmpty(o.CustomerPhone) && o.CustomerPhone.Contains(q, StringComparison.OrdinalIgnoreCase)) return true;
            if (!string.IsNullOrEmpty(digits))
            {
                var orderDigits = new string((o.OrderNumberShort ?? "").Where(char.IsDigit).ToArray());
                if (orderDigits.Contains(digits, StringComparison.Ordinal)) return true;
            }
            return o.OrderNumber.Contains(q, StringComparison.OrdinalIgnoreCase);
        }).ToList();
    }

    private void PickupSearchBox_KeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter)
        {
            PickupSearch_Click(sender, e);
            e.Handled = true;
        }
    }

    private async void PickupSearch_Click(object sender, RoutedEventArgs e)
    {
        var query = PickupSearchBox.Text.Trim().TrimStart('#');
        if (string.IsNullOrWhiteSpace(query))
        {
            ClearPickupResult();
            return;
        }

        if (_client?.IsConnected == true)
            await RefreshOrdersAsync();

        var order = FindOrderByNumber(query);
        if (order == null)
        {
            ClearPickupResult();
            PickupEmptyHint.Text = $"لم يتم العثور على طلب برقم {query}";
            PickupEmptyHint.Visibility = Visibility.Visible;
            return;
        }

        ShowPickupResult(order);
    }

    private ShopOrder? FindOrderByNumber(string query)
    {
        var digits = new string(query.Where(char.IsDigit).ToArray());
        return _orders.FirstOrDefault(o =>
        {
            var orderDigits = new string((o.OrderNumber ?? "").Where(char.IsDigit).ToArray());
            if (!string.IsNullOrEmpty(digits) && orderDigits == digits) return true;
            return (o.OrderNumber ?? "").Trim().TrimStart('#').Equals(query, StringComparison.OrdinalIgnoreCase);
        });
    }

    private void ShowPickupResult(ShopOrder order)
    {
        _pickupOrder = order;
        PickupEmptyHint.Visibility = Visibility.Collapsed;
        PickupResultPanel.Visibility = Visibility.Visible;
        PickupOrderNumber.Text = FormatOrderNumber(order.OrderNumber);
        PickupCustomerName.Text = string.IsNullOrWhiteSpace(order.CustomerName) ? "عميل" : order.CustomerName!;
        PickupCustomerPhone.Text = FormatPhoneDisplay(order.CustomerPhone);
        PickupAmount.Text = FormatMoney(order.TotalDisplay);
        PickupStatus.Text = StatusAr.GetValueOrDefault(order.Status, "حالة غير معروفة");
        PickupPayment.Text = FormatPaymentStatus(order.PaymentStatus);

        var paid = IsPaidStatus(order.PaymentStatus);
        PickupPayBtn.Visibility = paid ? Visibility.Collapsed : Visibility.Visible;
    }

    private void ClearPickupResult()
    {
        _pickupOrder = null;
        PickupResultPanel.Visibility = Visibility.Collapsed;
        PickupEmptyHint.Text = "أدخل رقم الطلب واضغط بحث للعثور على الطلب";
        PickupEmptyHint.Visibility = Visibility.Visible;
    }

    private async void PickupPay_Click(object sender, RoutedEventArgs e)
    {
        if (_pickupOrder == null) return;
        if (await _api.PayInStoreAsync(_pickupOrder.Id, "cash"))
        {
            AppendLog($"تم تحصيل دفع الطلب {_pickupOrder.OrderNumber}");
            ShowToast("تم الدفع بنجاح");
            await RefreshAllAsync();
            var updated = _orders.FirstOrDefault(o => o.Id == _pickupOrder.Id);
            if (updated != null) ShowPickupResult(updated);
        }
        else AppendLog("فشل تسجيل الدفع");
    }

    private async void PickupCollect_Click(object sender, RoutedEventArgs e)
    {
        if (_pickupOrder == null) return;
        if (await _api.MarkCollectedAsync(_pickupOrder.Id))
        {
            AppendLog("تم تسليم الطلب");
            ShowToast("تم تسليم الطلب");
            await RefreshAllAsync();
            ClearPickupResult();
            PickupSearchBox.Clear();
            PickupSearchBox.Focus();
        }
        else AppendLog("فشل تسجيل التسليم");
    }

    private void FireAndForget(Task task)
    {
        _ = task.ContinueWith(t =>
        {
            if (!t.IsFaulted || t.Exception == null) return;
            var ex = t.Exception.GetBaseException();
            Dispatcher.BeginInvoke(() =>
            {
                AppendLog($"مهمة خلفية: {ex.Message}");
                if (ex is IOException or SocketException or HttpRequestException
                    || (ex.Message?.Contains("forcibly closed", StringComparison.OrdinalIgnoreCase) ?? false)
                    || (ex.Message?.Contains("transport connection", StringComparison.OrdinalIgnoreCase) ?? false))
                {
                    SetConnectionStatus(false, "انقطع الاتصال");
                }
            });
        }, TaskContinuationOptions.OnlyOnFaulted);
    }

    private async Task HandleMessageAsync(WsMessage msg)
    {
        try
        {
            if (msg.Type != "device.heartbeat")
                AppendLog($"← {msg.Type}");

            if (!string.IsNullOrEmpty(msg.MessageId) && _client != null)
                await _client.SendAckAsync(msg.MessageId);

            switch (msg.Type)
            {
                case "print.dispatch" when msg.Payload is JsonElement payload:
                    await HandlePrintDispatch(payload);
                    break;
                case "order.created" when msg.Payload is JsonElement orderPayload:
                    var num = orderPayload.TryGetProperty("order_number", out var n) ? n.GetString() : "?";
                    AppendLog($"طلب جديد: {num}");
                    ShowToast($"طلب جديد #{num} — تم استلام طلب جديد من العميل");
                    await RefreshAllAsync();
                    break;
                case "order.updated":
                    await RefreshAllAsync();
                    break;
            }
        }
        catch (Exception ex)
        {
            AppendLog($"خطأ معالجة رسالة: {ex.Message}");
        }
    }

    private void ShowToast(string message)
    {
        ToastText.Text = message;
        ToastBanner.Visibility = Visibility.Visible;
        _toastTimer.Stop();
        _toastTimer.Start();
    }

    private async Task HandlePrintDispatch(JsonElement payload)
    {
        var job = PrintDispatchService.ParseDispatch(payload);
        if (job == null) { AppendLog("تعذر قراءة مهمة الطباعة"); return; }

        QueueCurrentJob.Text = $"طباعة: {job.PrintJobId[..Math.Min(8, job.PrintJobId.Length)]}…";
        SetQueueProgress(35);
        SetQueuePageProgress(35);

        var printers = PrinterDiscovery.GetInstalledPrinters();
        await _printService.HandleDispatchAsync(job, printers,
            async (jobId, orderId, printer, copies, duration) =>
            {
                SetQueueProgress(100);
                SetQueuePageProgress(100);
                AppendLog($"✓ اكتملت الطباعة على {printer}");
                await _client!.SendPrintCompletedAsync(jobId, orderId, printer, copies, copies, duration);
                await RefreshAllAsync();
            },
            async (jobId, orderId, code, message) =>
            {
                SetQueueProgress(0);
                SetQueuePageProgress(0);
                AppendLog($"✗ فشلت الطباعة: {message}");
                await _client!.SendPrintFailedAsync(jobId, orderId, code, message);
            });
    }

    private async Task RefreshAllAsync()
    {
        try
        {
            await RefreshOrdersAsync();
            await RefreshStatsAsync();
            await RefreshPrintersUiSafe();
        }
        catch (Exception ex)
        {
            AppendLog($"فشل التحديث: {ex.Message}");
        }
    }

    private async Task RefreshStatsAsync()
    {
        var stats = await _api.GetStatsAsync();
        if (stats == null) return;
        StatTodayOrders.Text = stats.TodayOrders.ToString();
        StatTodayRevenue.Text = FormatMoney(stats.TodayRevenueDisplay);
        StatPrinting.Text = stats.PrintingCount.ToString();
        StatReady.Text = stats.ReadyCount.ToString();
        var ordersDelta = FormatDeltaPercent(stats.OrdersDeltaPercent);
        StatOrdersDelta.Text = ordersDelta;
        StatRevenueDelta.Text = ordersDelta;
        SyncFooterText.Text = $"آخر مزامنة: اليوم {FormatClock(DateTime.Now)}";
        ReportWeekOrders.Text = stats.WeekOrders.ToString();
        ReportWeekRevenue.Text = FormatMoney(stats.WeekRevenueDisplay);
        ReportTodayOrders.Text = stats.TodayOrders.ToString();
        ReportTodayRevenue.Text = FormatMoney(stats.TodayRevenueDisplay);
    }

    private async Task RefreshOrdersAsync()
    {
        try
        {
            if (string.IsNullOrEmpty(_settings.DeviceToken)) return;
            _orders = await _api.GetOrdersAsync("active");
            ApplyOrderFilters();
            var dashboardItems = (LiveOrdersGrid.ItemsSource as IEnumerable<OrderViewModel>)?.ToList() ?? new List<OrderViewModel>();
            var allVms = _orders.Select(o => new OrderViewModel(o)).ToList();
            var hasAnyOrders = _orders.Count > 0;
            OrdersBadge.Visibility = hasAnyOrders ? Visibility.Visible : Visibility.Collapsed;
            OrdersBadgeText.Text = _orders.Count.ToString();

            var printing = allVms.FirstOrDefault(o => o.Status == "printing");
            var waiting = allVms.Where(o => o.Status is "queued" or "preparing" or "awaiting_finishing").ToList();
            var failed = allVms.Where(o => o.Status is "failed" or "needs_review").ToList();

            if (printing != null)
            {
                _queueCurrentOrderId = printing.Id;
                QueueCurrentJob.Text = $"{printing.OrderNumberShort} — {printing.ServiceLabel}";
                QueuePageCurrentJob.Text = $"{printing.OrderNumberShort} — {printing.ServiceLabel}";
                QueuePageCustomer.Text = printing.CustomerName;
                SetQueueProgress(55);
                SetQueuePageProgress(55);
                QueueOpenCurrentBtn.Visibility = Visibility.Visible;
            }
            else
            {
                _queueCurrentOrderId = null;
                QueueCurrentJob.Text = "لا توجد مهمة نشطة";
                QueuePageCurrentJob.Text = "لا توجد مهمة نشطة";
                QueuePageCustomer.Text = "";
                SetQueueProgress(0);
                SetQueuePageProgress(0);
                QueueOpenCurrentBtn.Visibility = Visibility.Collapsed;
            }

            QueueWaitingList.ItemsSource = waiting;
            NoQueueWaitingText.Visibility = waiting.Count == 0 ? Visibility.Visible : Visibility.Collapsed;

            QueueFailedList.ItemsSource = failed;
            NoQueueFailedText.Visibility = failed.Count == 0 ? Visibility.Visible : Visibility.Collapsed;

            QueueUpcomingList.ItemsSource = waiting.Select(o => $"{o.OrderNumberShort} — {o.CustomerName}").ToList();

            if (_selectedOrder != null)
            {
                var updated = _orders.FirstOrDefault(o => o.Id == _selectedOrder.Id);
                if (updated != null) ShowOrderDetail(updated);
                else ClearOrderDetail();
            }
            else if (dashboardItems.Count > 0 && NavDashboard.IsChecked == true && LiveOrdersGrid.SelectedIndex < 0)
            {
                _suppressSelection = true;
                LiveOrdersGrid.SelectedIndex = 0;
                _suppressSelection = false;
                if (LiveOrdersGrid.SelectedItem is OrderViewModel vm)
                {
                    var order = _orders.FirstOrDefault(o => o.Id == vm.Id);
                    if (order != null) ShowOrderDetail(order);
                }
            }
        }
        catch (Exception ex)
        {
            AppendLog($"خطأ في تحميل الطلبات: {ex.Message}");
        }
    }

    private async Task RefreshPaymentsAsync()
    {
        var list = await _api.GetPaymentsAsync();
        var vms = list.Select(p => new PaymentVm(p)).ToList();
        PaymentsList.ItemsSource = vms;
        NoPaymentsText.Visibility = vms.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
    }

    private async Task RefreshCustomersAsync()
    {
        var list = await _api.GetCustomersAsync();
        var vms = list.Select(c => new CustomerVm(c)).ToList();
        CustomersList.ItemsSource = vms;
        NoCustomersText.Visibility = vms.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
    }

    private async Task RefreshPricingAsync()
    {
        var pricing = await _api.GetPricingAsync();
        if (pricing == null) return;
        _priceRules = pricing.Rules.Select(r => new PriceRuleVm(r)).ToList();
        _finishing = pricing.Finishing.Select(f => new FinishingVm(f)).ToList();
        PricingRulesList.ItemsSource = _priceRules;
        FinishingList.ItemsSource = _finishing;
    }

    private void SetQueuePageProgress(double value)
    {
        QueuePageProgress.Value = value;
        QueuePageProgressPct.Text = $"{(int)value}%";
    }

    private void OrdersGrid_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_suppressSelection) return;
        if (OrdersGrid.SelectedItem is OrderViewModel vm)
        {
            var order = _orders.FirstOrDefault(o => o.Id == vm.Id);
            if (order != null)
            {
                SetDetailVisible(true);
                ShowOrderDetail(order);
            }
        }
    }

    private void QueueOpenOrder_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not Button btn || btn.Tag is not string id) return;
        var order = _orders.FirstOrDefault(o => o.Id == id);
        if (order == null) return;
        SetDetailVisible(true);
        ShowOrderDetail(order);
    }

    private void QueueOpenCurrent_Click(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrEmpty(_queueCurrentOrderId)) return;
        var order = _orders.FirstOrDefault(o => o.Id == _queueCurrentOrderId);
        if (order == null) return;
        SetDetailVisible(true);
        ShowOrderDetail(order);
    }

    private void LiveOrdersGrid_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (_suppressSelection) return;
        if (LiveOrdersGrid.SelectedItem is OrderViewModel vm)
        {
            var order = _orders.FirstOrDefault(o => o.Id == vm.Id);
            if (order != null) ShowOrderDetail(order);
        }
    }

    private void ShowOrderDetail(ShopOrder order)
    {
        _selectedOrder = order;
        DetailEmptyHint.Visibility = Visibility.Collapsed;
        DetailContent.Visibility = Visibility.Visible;
        DetailOrderNumber.Text = FormatOrderNumber(order.OrderNumber);

        var customer = string.IsNullOrWhiteSpace(order.CustomerName) ? "عميل" : order.CustomerName!;
        DetailCustomerName.Text = customer;
        DetailAvatarLetter.Text = customer.Trim()[0].ToString();
        DetailCustomerPhone.Text = FormatPhoneDisplay(order.CustomerPhone);
        DetailPaymentStatus.Text = FormatPaymentStatus(order.PaymentStatus);
        DetailPaymentMethod.Text = FormatPaymentMethod(order.PaymentMethod);
        DetailCreatedAt.Text = FormatDateTime(order.CreatedAt);

        var paid = IsPaidStatus(order.PaymentStatus);
        DetailPaymentBadge.Background = new SolidColorBrush(
            (Color)ColorConverter.ConvertFromString(paid ? "#166534" : "#92400E")!);
        DetailPaymentStatus.Foreground = new SolidColorBrush(
            (Color)ColorConverter.ConvertFromString(paid ? "#BBF7D0" : "#FDE68A")!);

        DetailPayBtn.Visibility = paid ? Visibility.Collapsed : Visibility.Visible;

        var item = order.Items.FirstOrDefault();
        if (item != null)
        {
            DetailFilename.Text = FormatFilename(item.Filename);
            DetailPages.Text = item.PageCount.ToString();
            DetailCopies.Text = item.Copies.ToString();
            DetailColor.Text = FormatColorMode(item.ColorMode);
            DetailPaper.Text = FormatPaperSize(item.PaperSize);
            DetailDuplex.Text = FormatSides(item.Sides);
        }
        else
        {
            DetailFilename.Text = order.ItemCount > 1 ? $"{order.ItemCount} ملفات" : "ملف واحد";
            DetailPages.Text = DetailCopies.Text = DetailColor.Text = DetailPaper.Text = DetailDuplex.Text = "—";
        }

        DetailTotal.Text = FormatMoney(order.TotalDisplay);
        DetailTimeline.ItemsSource = BuildOrderTimeline(order);
        UpdateDetailActionVisibility(order);
    }

    private void UpdateDetailActionVisibility(ShopOrder order)
    {
        var status = (order.Status ?? "").Trim().ToLowerInvariant();
        var paid = IsPaidStatus(order.PaymentStatus);
        var isTerminal = status is "collected" or "completed" or "cancelled";

        DetailPrintBtn.Visibility = isTerminal ? Visibility.Collapsed : Visibility.Visible;
        DetailReadyBtn.Visibility = status is "printing" or "queued" or "preparing" or "awaiting_finishing"
            ? Visibility.Visible : Visibility.Collapsed;
        DetailCollectedBtn.Visibility = status == "ready" ? Visibility.Visible : Visibility.Collapsed;
        DetailPayBtn.Visibility = paid ? Visibility.Collapsed : Visibility.Visible;
        DetailRetryBtn.Visibility = status is "failed" or "needs_review"
            ? Visibility.Visible : Visibility.Collapsed;
    }

    private static List<TimelineItemVm> BuildOrderTimeline(ShopOrder order)
    {
        var status = (order.Status ?? "").Trim().ToLowerInvariant();
        var paid = IsPaidStatus(order.PaymentStatus);

        var steps = new (string key, string label)[]
        {
            ("received", "تم استلام الطلب"),
            ("paid", "تم الدفع"),
            ("print", "الطباعة"),
            ("finishing", "التجهيز"),
            ("ready", "جاهز للاستلام"),
            ("collected", "تم التسليم"),
        };

        int StageIndex(string key) => key switch
        {
            "received" => 0,
            "paid" => 1,
            "print" => 2,
            "finishing" => 3,
            "ready" => 4,
            "collected" => 5,
            _ => -1,
        };

        int current = status switch
        {
            "draft" or "submitted" => 0,
            "payment_pending" or "pending" => paid ? 1 : 0,
            "paid" => 1,
            "review_pending" or "needs_review" => 1,
            "queued" => paid ? 2 : 1,
            "printing" => 2,
            "preparing" or "awaiting_finishing" => 3,
            "ready" => 4,
            "collected" or "completed" => 5,
            "failed" => 2,
            "cancelled" => -1,
            _ => 0,
        };

        if (!paid && current > 0 && status is not "paid")
            current = Math.Min(current, 0);

        var list = new List<TimelineItemVm>();
        foreach (var (key, label) in steps)
        {
            var idx = StageIndex(key);
            var done = current >= 0 && idx <= current;
            var active = current >= 0 && idx == current;
            list.Add(new TimelineItemVm(label, done, active));
        }

        return list;
    }

    private void PopulatePrintConfirmModal(ShopOrder order)
    {
        ConfirmOrderNumber.Text = FormatOrderNumber(order.OrderNumber);
        ConfirmCustomer.Text = string.IsNullOrWhiteSpace(order.CustomerName) ? "عميل" : order.CustomerName!;
        var item = order.Items.FirstOrDefault();
        if (item != null)
        {
            ConfirmFile.Text = FormatFilename(item.Filename);
            ConfirmPages.Text = item.PageCount.ToString();
            ConfirmCopies.Text = item.Copies.ToString();
            ConfirmColor.Text = FormatColorMode(item.ColorMode);
            ConfirmPaper.Text = FormatPaperSize(item.PaperSize);
            ConfirmDuplex.Text = FormatSides(item.Sides);
        }
        else
        {
            ConfirmFile.Text = order.ItemCount > 1 ? $"{order.ItemCount} ملفات" : "ملف واحد";
            ConfirmPages.Text = ConfirmCopies.Text = ConfirmColor.Text = ConfirmPaper.Text = ConfirmDuplex.Text = "—";
        }
        ConfirmTotal.Text = FormatMoney(order.TotalDisplay);
    }

    private void PrintConfirmCancel_Click(object sender, RoutedEventArgs e)
    {
        PrintConfirmOverlay.Visibility = Visibility.Collapsed;
    }

    private async void ConfirmPrint_Click(object sender, RoutedEventArgs e)
    {
        if (_selectedOrder == null) return;
        PrintConfirmOverlay.Visibility = Visibility.Collapsed;
        if (await _api.DispatchAsync(_selectedOrder.Id))
        {
            AppendLog($"تم إرسال أمر الطباعة للطلب {_selectedOrder.OrderNumber}");
            ShowToast($"جاري طباعة {FormatOrderNumber(_selectedOrder.OrderNumber)}");
            await RefreshAllAsync();
        }
        else AppendLog("فشل إرسال أمر الطباعة");
    }

    private void ClearOrderDetail()
    {
        _selectedOrder = null;
        DetailContent.Visibility = Visibility.Collapsed;
        DetailEmptyHint.Visibility = Visibility.Visible;
        DetailOrderNumber.Text = "—";
    }

    private void SetUserProfile(string name)
    {
        UserNameText.Text = string.IsNullOrWhiteSpace(name) ? "موظف الطباعة" : name;
        UserRoleText.Text = "موظف طباعة";
        UserAvatarLetter.Text = string.IsNullOrWhiteSpace(name) ? "م" : name.Trim()[0].ToString();
    }

    private static string FormatDeltaPercent(int pct) =>
        pct >= 0 ? $"↑ {pct}% عن أمس" : $"↓ {Math.Abs(pct)}% عن أمس";

    private static string FormatPaymentMethod(string? method)
    {
        if (string.IsNullOrWhiteSpace(method)) return "—";
        return method.Trim().ToLowerInvariant() switch
        {
            "bank_transfer" => "تحويل بنكي",
            "cash" => "نقداً",
            "card" => "بطاقة",
            "card_pos" => "بطاقة نقطة البيع",
            "thawani" => "ثواني",
            "online" => "دفع إلكتروني",
            "pay_at_pickup" => "الدفع عند الاستلام",
            _ => "دفع إلكتروني",
        };
    }

    private static string FormatPhoneDisplay(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return "—";
        // LTR embedding so +968… never reverses in RTL
        return "\u202A" + phone.Trim() + "\u202C";
    }

    private static string FormatPaymentStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return "—";
        return status.Trim().ToLowerInvariant() switch
        {
            "unpaid" => "غير مدفوع",
            "pending" or "payment_pending" => "بانتظار الدفع",
            "processing" => "جاري معالجة الدفع",
            "completed" or "paid" => "مدفوع",
            "failed" => "فشل الدفع",
            "cancelled" or "canceled" => "أُلغي الدفع",
            "refunded" => "تم الاسترداد",
            _ => "غير مدفوع",
        };
    }

    private static bool IsPaidStatus(string? status)
    {
        var s = status?.Trim().ToLowerInvariant();
        return s is "completed" or "paid";
    }

    private static string FormatOrderNumberShort(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "—";
        var digits = raw.Trim().TrimStart('#', ' ');
        return $"\u2066#{digits}\u2069";
    }

    private static string FormatOrderNumber(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "طلب";
        var digits = raw.Trim().TrimStart('#', ' ');
        return $"طلب \u2066#{digits}\u2069";
    }

    private static string FormatColorMode(string? mode) => mode switch
    {
        "color" => "ألوان",
        "grayscale" => "تدرج رمادي",
        "bw" or "black_white" or "mono" => "أبيض وأسود",
        _ => "أبيض وأسود",
    };

    private static string FormatPaperSize(string? size)
    {
        if (string.IsNullOrWhiteSpace(size)) return "—";
        var s = size.Trim().ToUpperInvariant();
        return s is "A4" or "A3" or "A5" ? $"ورق {s}" : $"ورق {size}";
    }

    private static string FormatSides(string? sides) => sides switch
    {
        "duplex_long" or "duplex_short" or "duplex" or "double" => "وجهين",
        "single" or "simplex" => "وجه واحد",
        _ => "وجه واحد",
    };

    private static string FormatFilename(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "ملف بدون اسم";
        var n = name.Trim();
        foreach (var ext in new[] { ".pdf", ".PDF", ".doc", ".docx", ".png", ".jpg", ".jpeg" })
        {
            if (n.EndsWith(ext, StringComparison.OrdinalIgnoreCase))
            {
                n = n[..^ext.Length];
                break;
            }
        }
        return string.IsNullOrWhiteSpace(n) ? "ملف" : n;
    }

    private static string FormatMoney(string? display)
    {
        if (string.IsNullOrWhiteSpace(display)) return "0.000 ر.ع";
        var t = display.Trim();
        if (t.Contains("ر.ع", StringComparison.Ordinal)) return t;
        if (t.Contains("OMR", StringComparison.OrdinalIgnoreCase))
            return t.Replace("OMR", "ر.ع", StringComparison.OrdinalIgnoreCase).Trim();
        return $"{t} ر.ع";
    }

    private static string FormatDateTime(DateTime utcOrLocal)
    {
        var local = utcOrLocal.Kind == DateTimeKind.Utc ? utcOrLocal.ToLocalTime() : utcOrLocal;
        return $"اليوم {FormatClock(local)}";
    }

    private static string FormatClock(DateTime local)
    {
        var hour = local.Hour;
        var period = hour < 12 ? "ص" : "م";
        var h12 = hour % 12;
        if (h12 == 0) h12 = 12;
        return $"\u2066{h12:00}:{local:mm}\u2069 {period}";
    }

    private void ViewAllOrders_Click(object sender, RoutedEventArgs e)
    {
        NavOrders.IsChecked = true;
    }

    private static string FormatServiceLabel(ShopOrder o)
    {
        if (o.Items.Length == 0) return "طباعة مستندات";
        var item = o.Items[0];
        var name = FormatFilename(item.Filename);
        if (name.Length > 22) name = name[..21] + "…";
        return name;
    }

    private async void RefreshOrders_Click(object sender, RoutedEventArgs e) => await RefreshAllAsync();
    private async void RefreshPayments_Click(object sender, RoutedEventArgs e) => await RefreshPaymentsAsync();
    private async void RefreshCustomers_Click(object sender, RoutedEventArgs e) => await RefreshCustomersAsync();
    private async void RefreshPricing_Click(object sender, RoutedEventArgs e) => await RefreshPricingAsync();
    private async void RefreshReports_Click(object sender, RoutedEventArgs e) => await RefreshStatsAsync();

    private async void DetailReady_Click(object sender, RoutedEventArgs e)
    {
        if (_selectedOrder == null) return;
        if (await _api.MarkReadyAsync(_selectedOrder.Id))
        {
            AppendLog("تم تعليم الطلب كجاهز للاستلام");
            await RefreshAllAsync();
        }
    }

    private async void DetailCollected_Click(object sender, RoutedEventArgs e)
    {
        if (_selectedOrder == null) return;
        if (await _api.MarkCollectedAsync(_selectedOrder.Id))
        {
            AppendLog("تم تسليم الطلب");
            await RefreshAllAsync();
        }
    }

    private void DetailPrint_Click(object sender, RoutedEventArgs e)
    {
        if (_selectedOrder == null) return;
        PopulatePrintConfirmModal(_selectedOrder);
        PrintConfirmOverlay.Visibility = Visibility.Visible;
    }

    private async void DetailRetry_Click(object sender, RoutedEventArgs e)
    {
        if (_selectedOrder == null) return;
        if (await _api.RetryAsync(_selectedOrder.Id))
        {
            AppendLog($"إعادة محاولة طباعة {_selectedOrder.OrderNumber}");
            ShowToast($"إعادة طباعة {_selectedOrder.OrderNumber}");
            await RefreshAllAsync();
        }
        else AppendLog("فشل إعادة المحاولة");
    }

    private async void DetailPay_Click(object sender, RoutedEventArgs e)
    {
        if (_selectedOrder == null) return;
        if (await _api.PayInStoreAsync(_selectedOrder.Id, "cash"))
        {
            AppendLog($"تم تحصيل دفع الطلب {_selectedOrder.OrderNumber}");
            ShowToast($"تم الدفع — جاري الطباعة");
            await RefreshAllAsync();
        }
        else AppendLog("فشل تسجيل الدفع");
    }

    private async void SavePriceRule_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not Button btn || btn.Tag is not string id) return;
        var rule = _priceRules.FirstOrDefault(r => r.Id == id);
        if (rule == null || !int.TryParse(rule.PriceText, out var price)) return;
        if (await _api.UpdatePricingRuleAsync(id, price))
        {
            AppendLog($"تم تحديث السعر: {rule.Label}");
            await RefreshPricingAsync();
        }
    }

    private async void SaveFinishing_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not Button btn || btn.Tag is not string id) return;
        var item = _finishing.FirstOrDefault(f => f.Id == id);
        if (item == null || !int.TryParse(item.PriceText, out var price)) return;
        if (await _api.UpdateFinishingAsync(id, price))
        {
            AppendLog($"تم تحديث خدمة: {item.NameAr}");
            await RefreshPricingAsync();
        }
    }

    private void RefreshPrinters_Click(object sender, RoutedEventArgs e) => FireAndForget(RefreshPrintersUiSafe());

    private async Task RefreshPrintersUiSafe()
    {
        try
        {
            var local = PrinterDiscovery.GetInstalledPrinters();
            SpoolerWarning.Visibility = string.IsNullOrEmpty(PrinterDiscovery.LastError)
                ? Visibility.Collapsed : Visibility.Visible;

            List<PrinterViewModel> items;
            if (_client?.IsConnected == true)
            {
                var remote = await _api.GetPrintersAsync();
                items = remote.Count > 0
                    ? remote.Select(p => new PrinterViewModel(p)).ToList()
                    : local.Select(p => new PrinterViewModel(p)).ToList();
            }
            else
            {
                items = local.Select(p => new PrinterViewModel(p)).ToList();
            }

            PrintersList.ItemsSource = items;
            DashboardPrintersList.ItemsSource = items.Take(5).ToList();
            var has = items.Count > 0;
            NoPrintersPanel.Visibility = has ? Visibility.Collapsed : Visibility.Visible;
            PrintersList.Visibility = has ? Visibility.Visible : Visibility.Collapsed;
        }
        catch (Exception ex)
        {
            AppendLog($"خطأ في الطابعات: {ex.Message}");
        }
    }

    private void FixSpooler_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            using var sc = new ServiceController("Spooler");
            if (sc.Status != ServiceControllerStatus.Running)
            {
                sc.Start();
                sc.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(10));
                AppendLog("تم تشغيل خدمة الطباعة في ويندوز");
            }
            else AppendLog("خدمة الطباعة تعمل بالفعل");
            RefreshPrinters_Click(sender, e);
        }
        catch (Exception ex)
        {
            AppendLog($"تعذر تشغيل الخدمة: {ex.Message}");
            try { Process.Start(new ProcessStartInfo("services.msc") { UseShellExecute = true }); } catch { }
        }
    }

    private void SaveSettings_Click(object sender, RoutedEventArgs e)
    {
        _settings.ApiUrl = ApiUrlBox.Text.Trim();
        _settings.DeviceToken = DeviceTokenBox.Text.Trim();
        _settings.AutoConnect = AutoConnectCheck.IsChecked == true;
        _settings.StoreSlug = RegisterStoreSlug.Text.Trim();
        SettingsService.Save(_settings);
        _api.Configure(_settings.ApiUrl, _settings.DeviceToken);
        AppendLog("تم حفظ الإعدادات");
        MessageBox.Show("تم حفظ الإعدادات", "منصة الطباعة", MessageBoxButton.OK, MessageBoxImage.Information);
    }

    private async void RegisterDevice_Click(object sender, RoutedEventArgs e)
    {
        _api.Configure(ApiUrlBox.Text.Trim(), DeviceTokenBox.Text.Trim());
        var (_, token, error) = await _api.RegisterDeviceAsync(
            RegisterStoreSlug.Text.Trim(),
            RegisterDeviceName.Text.Trim());

        if (token == null)
        {
            RegisterResult.Text = error ?? "فشل التسجيل";
            RegisterResult.Foreground = new SolidColorBrush(Color.FromRgb(0xEF, 0x44, 0x44));
        }
        else
        {
            DeviceTokenBox.Text = token;
            _settings.DeviceToken = token;
            SettingsService.Save(_settings);
            RegisterResult.Text = $"تم التسجيل!\nرمز الجهاز:\n{token}";
            RegisterResult.Foreground = new SolidColorBrush(Color.FromRgb(0x22, 0xC5, 0x5E));
        }
        RegisterResult.Visibility = Visibility.Visible;
    }

    private void AppendLog(string message)
    {
        if (LogBox == null) return;
        LogBox.AppendText($"[{DateTime.Now:HH:mm:ss}] {message}\n");
        LogBox.ScrollToEnd();
    }

    protected override async void OnClosed(EventArgs e)
    {
        _heartbeatTimer.Stop();
        _refreshTimer.Stop();
        _toastTimer.Stop();
        _clockTimer.Stop();
        if (_client != null) await _client.DisposeAsync();
        base.OnClosed(e);
    }

    private class TimelineItemVm
    {
        public string Label { get; }
        public Brush DotBrush { get; }
        public Brush TextBrush { get; }

        public TimelineItemVm(string label, bool done, bool active)
        {
            Label = label;
            DotBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(
                active ? "#3B82F6" : done ? "#22C55E" : "#475569")!);
            TextBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(
                active ? "#F8FAFC" : done ? "#94A3B8" : "#64748B")!);
        }
    }

    private class OrderViewModel
    {
        public string Id { get; }
        public string OrderNumber { get; }
        public string OrderNumberShort { get; }
        public string CustomerName { get; }
        public string CustomerPhone { get; }
        public string CustomerLine { get; }
        public string Status { get; }
        public string StatusAr { get; }
        public string TotalDisplay { get; }
        public string ServiceLabel { get; }
        public string ServiceTypeLabel { get; }
        public string TimeLabel { get; }
        public string PaymentLabel { get; }
        public Brush StatusBg { get; }
        public Brush StatusFg { get; }
        public Brush AccentBrush { get; }

        public OrderViewModel(ShopOrder o)
        {
            Id = o.Id;
            OrderNumber = FormatOrderNumber(o.OrderNumber);
            var digits = (o.OrderNumber ?? "").Trim().TrimStart('#', ' ');
            OrderNumberShort = string.IsNullOrEmpty(digits) ? "—" : $"#{digits}";
            CustomerName = string.IsNullOrWhiteSpace(o.CustomerName) ? "عميل" : o.CustomerName!;
            CustomerPhone = o.CustomerPhone ?? "";
            CustomerLine = string.IsNullOrWhiteSpace(CustomerPhone)
                ? CustomerName
                : $"{CustomerName}  ·  \u2066{CustomerPhone}\u2069";
            Status = o.Status;
            StatusAr = MainWindow.StatusAr.GetValueOrDefault(
                (o.Status ?? "").Trim().ToLowerInvariant(),
                "حالة غير معروفة");
            TotalDisplay = FormatMoney(o.TotalDisplay);
            ServiceLabel = FormatServiceLabel(o);
            ServiceTypeLabel = "طباعة مستندات";
            TimeLabel = FormatClock(o.CreatedAt.ToLocalTime());
            PaymentLabel = FormatPaymentStatus(o.PaymentStatus);
            var statusKey = (o.Status ?? "").Trim().ToLowerInvariant();
            var white = Color.FromRgb(255, 255, 255);
            var (bg, accent) = statusKey switch
            {
                "ready" or "collected" or "completed" or "paid" => ("#16A34A", "#16A34A"),
                "printing" or "queued" or "preparing" => ("#2563EB", "#2563EB"),
                "awaiting_finishing" or "payment_pending" or "unpaid" or "pending" => ("#D97706", "#D97706"),
                "needs_review" or "failed" => ("#DC2626", "#DC2626"),
                _ => ("#475569", "#64748B"),
            };
            StatusBg = new SolidColorBrush((Color)ColorConverter.ConvertFromString(bg)!);
            StatusFg = new SolidColorBrush(white);
            AccentBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(accent)!);
        }
    }

    private class PrinterViewModel
    {
        public string DisplayName { get; }
        public string StatusAr { get; }
        public Brush StatusBrush { get; }
        public string ColorLabel { get; }
        public string DuplexLabel { get; }
        public string QueueLabel { get; }

        public PrinterViewModel(ShopPrinter p)
        {
            DisplayName = p.DisplayName;
            StatusAr = p.Status == "online" ? "متصلة" : "غير متصلة";
            StatusBrush = BrushFor(p.Status == "online");
            ColorLabel = p.SupportsColor ? "نعم" : "لا";
            DuplexLabel = p.SupportsDuplex ? "نعم" : "لا";
            QueueLabel = $"{p.QueueLength} في الطابور";
        }

        public PrinterViewModel(PrinterInfo p)
        {
            DisplayName = p.DisplayName;
            StatusAr = p.Status == "online" ? "متصلة" : "غير متصلة";
            StatusBrush = BrushFor(p.Status == "online");
            ColorLabel = p.SupportsColor ? "نعم" : "لا";
            DuplexLabel = p.SupportsDuplex ? "نعم" : "لا";
            QueueLabel = "محلي";
        }

        private static Brush BrushFor(bool online) =>
            new SolidColorBrush(online ? Color.FromRgb(0x22, 0xC5, 0x5E) : Color.FromRgb(0xEF, 0x44, 0x44));
    }

    private class PaymentVm
    {
        public string OrderNumber { get; }
        public string CustomerName { get; }
        public string AmountDisplay { get; }
        public string MethodLabel { get; }
        public string StatusLabel { get; }

        public PaymentVm(ShopPayment p)
        {
            OrderNumber = FormatOrderNumber(p.OrderNumber);
            CustomerName = string.IsNullOrWhiteSpace(p.CustomerName) ? "عميل" : p.CustomerName!;
            AmountDisplay = FormatMoney(p.AmountDisplay);
            MethodLabel = p.InStoreMethod == "cash" ? "نقداً في المتجر"
                : p.InStoreMethod == "card_pos" ? "بطاقة نقطة البيع"
                : FormatPaymentMethod(p.Method);
            StatusLabel = FormatPaymentStatus(p.Status);
        }
    }

    private class CustomerVm
    {
        public string Name { get; }
        public string Phone { get; }
        public string OrderCountLabel { get; }
        public string TotalDisplay { get; }

        public CustomerVm(ShopCustomer c)
        {
            Name = c.Name;
            Phone = c.Phone;
            OrderCountLabel = $"{c.OrderCount} طلب";
            TotalDisplay = FormatMoney(c.TotalDisplay);
        }
    }

    private class PriceRuleVm
    {
        public string Id { get; }
        public string Label { get; }
        public string PriceText { get; set; }

        public PriceRuleVm(PricingRuleItem r)
        {
            Id = r.Id;
            var color = FormatColorMode(r.ColorMode);
            Label = $"{FormatPaperSize(r.PaperSize)} — {color}";
            PriceText = r.PricePerPage.ToString();
        }
    }

    private class FinishingVm
    {
        public string Id { get; }
        public string NameAr { get; }
        public string PriceText { get; set; }

        public FinishingVm(FinishingItem f)
        {
            Id = f.Id;
            NameAr = f.NameAr;
            PriceText = f.PriceBaisa.ToString();
        }
    }
}
