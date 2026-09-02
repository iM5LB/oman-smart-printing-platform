using System.Text.Json;
using OmanPrint.Core.Models;
using SocketIOClient;

namespace OmanPrint.ApiClient;

public class ShopWebSocketClient : IAsyncDisposable
{
    private readonly SocketIOClient.SocketIO _socket;
    private readonly string _apiUrl;

    public event Action<WsMessage>? OnMessage;
    public event Action<string>? OnLog;
    public event Action<Exception>? OnError;

    public bool IsConnected => _socket.Connected;

    public ShopWebSocketClient(string apiUrl, string deviceToken)
    {
        _apiUrl = apiUrl.TrimEnd('/');
        var wsUrl = _apiUrl.Replace("http://", "ws://").Replace("https://", "wss://");
        _socket = new SocketIOClient.SocketIO($"{wsUrl}/ws/shop", new SocketIOOptions
        {
            Query = new Dictionary<string, string> { ["device_token"] = deviceToken },
            Reconnection = true,
            ReconnectionAttempts = int.MaxValue,
            ReconnectionDelay = 1000,
            ReconnectionDelayMax = 60000,
        });

        _socket.OnConnected += (_, _) => Log("متصل بالخادم");
        _socket.OnDisconnected += (_, reason) => Log($"انقطع الاتصال: {reason}");
        _socket.OnError += (_, err) => OnError?.Invoke(new Exception(err));

        _socket.On("message", response =>
        {
            try
            {
                var json = response.GetValue<JsonElement>();
                var msg = new WsMessage(
                    json.GetProperty("type").GetString() ?? "",
                    json.GetProperty("payload"),
                    json.TryGetProperty("timestamp", out var ts) ? ts.GetString() : null,
                    json.TryGetProperty("message_id", out var mid) ? mid.GetString() : null
                );
                OnMessage?.Invoke(msg);
            }
            catch (Exception ex)
            {
                OnError?.Invoke(ex);
            }
        });
    }

    public async Task ConnectAsync()
    {
        try
        {
            await _socket.ConnectAsync();
        }
        catch (Exception ex)
        {
            OnError?.Invoke(ex);
            throw;
        }
    }

    public async Task SendAsync(string type, object payload)
    {
        if (!_socket.Connected)
        {
            OnLog?.Invoke("تعذر الإرسال — غير متصل");
            return;
        }

        try
        {
            var envelope = new
            {
                type,
                payload,
                timestamp = DateTime.UtcNow.ToString("o"),
                message_id = Guid.NewGuid().ToString(),
            };
            await _socket.EmitAsync("message", envelope);
        }
        catch (Exception ex)
        {
            OnError?.Invoke(ex);
            OnLog?.Invoke($"فشل الإرسال ({type}): {ex.Message}");
        }
    }

    public async Task SendHelloAsync(string appVersion, IEnumerable<PrinterInfo> printers)
    {
        await SendAsync("device.hello", new
        {
            app_version = appVersion,
            os_version = Environment.OSVersion.ToString(),
            printers = printers.Select(p => new
            {
                os_name = p.OsName,
                display_name = p.DisplayName,
                status = p.Status,
                capabilities = new
                {
                    supports_color = p.SupportsColor,
                    supports_duplex = p.SupportsDuplex,
                    paper_sizes = p.PaperSizes,
                },
            }),
        });
    }

    public Task SendPrintCompletedAsync(string printJobId, string orderId, string printerName, int pagesPrinted, int copies, long durationMs)
        => SendAsync("print.completed", new
        {
            print_job_id = printJobId,
            order_id = orderId,
            printer_os_name = printerName,
            pages_printed = pagesPrinted,
            copies,
            duration_ms = durationMs,
        });

    public Task SendPrintFailedAsync(string printJobId, string orderId, string reasonCode, string reasonMessage)
        => SendAsync("print.failed", new
        {
            print_job_id = printJobId,
            order_id = orderId,
            reason_code = reasonCode,
            reason_message = reasonMessage,
        });

    public Task SendAckAsync(string messageId)
        => SendAsync("ack", new { message_id = messageId });

    private void Log(string message) => OnLog?.Invoke(message);

    public async ValueTask DisposeAsync()
    {
        try
        {
            if (_socket.Connected)
                await _socket.DisconnectAsync();
        }
        catch
        {
            // Ignore disconnect races when the remote host already closed the socket
        }

        try { _socket.Dispose(); }
        catch { /* ignore */ }
    }
}
