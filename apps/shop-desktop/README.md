# Shop Desktop Application

Windows desktop application for print shop employees — connects to the API via WebSocket and dispatches print jobs to local printers.

## Technology

- **.NET 8** with WPF (Arabic RTL UI)
- **SocketIOClient** for WebSocket communication
- **System.Printing** / **PrintDocument** for printer control

## Structure

```
shop-desktop/
  OmanPrint.sln
  src/
    OmanPrint.Core/         Shared models
    OmanPrint.ApiClient/    WebSocket client
    OmanPrint.Desktop/      WPF main application
```

## Quick Start

1. Ensure the API is running (`npm run dev` in `apps/api`)
2. Seed the database (`npm run db:seed`) — creates dev device token
3. Build and run:

```powershell
cd apps/shop-desktop
dotnet build
dotnet run --project src/OmanPrint.Desktop
```

4. Use the default dev device token: `dev-al-noor-device-token-change-in-production`
5. Click **اتصال** to connect to `http://localhost:4000`

## Features

- Real-time order notifications via WebSocket
- Windows printer detection and sync to API
- Automatic print dispatch with OS driver settings
- Arabic dashboard with connection status and log

## Environment

| Setting | Default |
|---------|---------|
| API URL | `http://localhost:4000` |
| Device token | From seed or `POST /api/v1/devices/register` |
| WebSocket path | `/ws/shop?device_token=...` |
