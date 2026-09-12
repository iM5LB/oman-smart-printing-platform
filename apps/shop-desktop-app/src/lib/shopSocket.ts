import { io, type Socket } from "socket.io-client";
import { getApiBase } from "./api";
import { getOsLabel } from "./os";
import { listPrinters, printDocumentFromUrl } from "./print";

type WsEnvelope = {
  type: string;
  payload: Record<string, unknown>;
  timestamp?: string;
  message_id?: string;
};

type PrintDispatchPayload = {
  print_job_id: string;
  order_id: string;
  order_item_id?: string;
  idempotency_key: string;
  document_url: string;
  settings?: {
    copies?: number;
    color_mode?: string;
    paper_size?: string;
    sides?: string;
    orientation?: string;
    page_range?: string;
  };
  printer_os_name?: string | null;
  suggested_printer_id?: string | null;
};

type ShopSocketHandlers = {
  onOrderCreated?: (payload: Record<string, unknown>) => void;
  onPrintStatus?: (msg: string) => void;
  onPrintFailed?: (msg: string) => void;
};

let socket: Socket | null = null;
const processedKeys = new Set<string>();

function emitMessage(type: string, payload: Record<string, unknown>) {
  if (!socket?.connected) return;
  socket.emit("message", {
    type,
    payload,
    timestamp: new Date().toISOString(),
    message_id: crypto.randomUUID(),
  } satisfies WsEnvelope);
}

async function syncPrinters() {
  try {
    const printers = await listPrinters();
    emitMessage("printer.sync", {
      printers: printers.map((p) => ({
        os_name: p.id || p.name,
        display_name: p.name,
        status: p.status === "offline" ? "offline" : "online",
        capabilities: {
          supports_color: p.supportsColor,
          supports_duplex: p.supportsDuplex,
          paper_sizes: ["A4", "A3", "A5"],
        },
      })),
    });
  } catch {
    /* ignore — printing may be unavailable in browser */
  }
}

async function handlePrintDispatch(
  payload: PrintDispatchPayload,
  handlers: ShopSocketHandlers,
): Promise<boolean> {
  const key = payload.idempotency_key || payload.print_job_id;
  if (processedKeys.has(key)) return false;
  processedKeys.add(key);

  try {
    await printDocumentFromUrl({
      documentUrl: payload.document_url,
      printerOsName: payload.printer_os_name,
      settings: payload.settings,
      jobId: payload.print_job_id,
    });
    emitMessage("print.completed", {
      print_job_id: payload.print_job_id,
      order_id: payload.order_id,
      pages_printed: null,
      printer_os_name: payload.printer_os_name ?? null,
    });
    return true;
  } catch (err) {
    processedKeys.delete(key);
    const msg = err instanceof Error ? err.message : "فشلت الطباعة";
    emitMessage("print.failed", {
      print_job_id: payload.print_job_id,
      order_id: payload.order_id,
      reason_code: "print_error",
      reason_message: msg,
    });
    handlers.onPrintFailed?.(msg);
    return false;
  }
}

/** Connect desktop device to API print channel. Safe to call repeatedly. */
export function connectShopSocket(
  deviceToken: string,
  handlers: ShopSocketHandlers = {},
): () => void {
  disconnectShopSocket();

  const url = `${getApiBase()}/ws/shop`;
  socket = io(url, {
    transports: ["websocket"],
    query: { device_token: deviceToken },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
  });

  socket.on("connect", () => {
    handlers.onPrintStatus?.("متصل بخادم الطباعة");
    void getOsLabel().then((os) => {
      emitMessage("device.hello", {
        app_version: "0.1.1",
        os_version: os,
      });
    });
    void syncPrinters();
  });

  socket.on("disconnect", () => {
    handlers.onPrintStatus?.("انقطع الاتصال بخادم الطباعة");
  });

  socket.on("message", (data: WsEnvelope) => {
    if (!data?.type) return;
    if (data.type === "order.created") {
      handlers.onOrderCreated?.(data.payload ?? {});
      return;
    }
    if (data.type === "print.dispatch") {
      handlers.onPrintStatus?.("جاري طباعة طلب…");
      void handlePrintDispatch(
        data.payload as PrintDispatchPayload,
        handlers,
      ).then((ok) => {
        if (ok) handlers.onPrintStatus?.("اكتملت مهمة طباعة");
      });
    }
  });

  const heartbeat = window.setInterval(() => {
    emitMessage("device.heartbeat", { at: Date.now() });
  }, 30_000);

  return () => {
    window.clearInterval(heartbeat);
    disconnectShopSocket();
  };
}

export function disconnectShopSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
