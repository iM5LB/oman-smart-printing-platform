using System.Windows;
using System.Windows.Threading;
using System.IO;
using System.Net.Http;
using System.Net.Sockets;

namespace OmanPrint.Desktop;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);

        DispatcherUnhandledException += (_, args) =>
        {
            var ex = args.Exception;
            while (ex.InnerException != null) ex = ex.InnerException;
            MessageBox.Show(
                $"حدث خطأ غير متوقع:\n{ex.GetType().Name}: {ex.Message}\n\n{ex.StackTrace}",
                "عمان برنت",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
            args.Handled = true;
        };

        AppDomain.CurrentDomain.UnhandledException += (_, args) =>
        {
            if (args.ExceptionObject is Exception ex)
            {
                MessageBox.Show(
                    $"خطأ فادح:\n{ex.Message}",
                    "عمان برنت",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);
            }
        };

        TaskScheduler.UnobservedTaskException += (_, args) =>
        {
            // Network drops are expected while reconnecting — don't scare the operator.
            args.SetObserved();
            if (IsBenignNetworkFailure(args.Exception))
                return;

            try
            {
                Dispatcher.BeginInvoke(() =>
                    MessageBox.Show(
                        $"خطأ في مهمة خلفية:\n{GetRootMessage(args.Exception)}",
                        "عمان برنت",
                        MessageBoxButton.OK,
                        MessageBoxImage.Warning));
            }
            catch
            {
                // App may already be shutting down
            }
        };
    }

    private static bool IsBenignNetworkFailure(Exception? ex)
    {
        for (var cur = ex; cur != null; cur = cur.InnerException)
        {
            if (cur is IOException or SocketException or ObjectDisposedException
                or OperationCanceledException or TimeoutException
                or HttpRequestException)
                return true;

            var msg = cur.Message ?? "";
            if (msg.Contains("forcibly closed", StringComparison.OrdinalIgnoreCase)
                || msg.Contains("transport connection", StringComparison.OrdinalIgnoreCase)
                || msg.Contains("Unable to read data", StringComparison.OrdinalIgnoreCase)
                || msg.Contains("connection was closed", StringComparison.OrdinalIgnoreCase)
                || msg.Contains("An existing connection", StringComparison.OrdinalIgnoreCase)
                || msg.Contains("websocket", StringComparison.OrdinalIgnoreCase)
                || msg.Contains("socket.io", StringComparison.OrdinalIgnoreCase))
                return true;

            if (cur is AggregateException agg)
            {
                foreach (var inner in agg.InnerExceptions)
                    if (IsBenignNetworkFailure(inner)) return true;
            }
        }
        return false;
    }

    private static string GetRootMessage(Exception ex)
    {
        while (ex.InnerException != null) ex = ex.InnerException;
        return ex.Message;
    }
}
