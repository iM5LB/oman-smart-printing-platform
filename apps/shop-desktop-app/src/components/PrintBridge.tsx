import { useEffect } from "react";
import { useAuth } from "../lib/auth";
import { connectShopSocket } from "../lib/shopSocket";
import { useToast } from "./Toast";

/**
 * Keeps the desktop device on the print WebSocket while logged in:
 * receives print.dispatch, prints locally, reports completed/failed.
 */
export function PrintBridge() {
  const { token } = useAuth();
  const { push } = useToast();

  useEffect(() => {
    if (!token) return;
    const stop = connectShopSocket(token, {
      onOrderCreated: (payload) => {
        const num = String(payload.order_number ?? "").trim();
        push({
          id: `ws-order-${String(payload.order_id ?? Date.now())}`,
          tone: "success",
          title: num ? `طلب جديد ${num.startsWith("#") ? num : `#${num}`}` : "طلب جديد",
          detail: "تم استلام طلب من العميل",
          durationMs: 5000,
        });
        window.dispatchEvent(new CustomEvent("omsp:orders-changed"));
      },
      onPrintStatus: (msg) => {
        if (msg.includes("جاري")) {
          push({
            id: `print-busy-${Date.now()}`,
            tone: "info",
            title: msg,
            durationMs: 2500,
            osNotify: false,
          });
        }
        if (msg.includes("اكتملت")) {
          push({
            id: `print-done-${Date.now()}`,
            tone: "success",
            title: msg,
            durationMs: 3500,
          });
          window.dispatchEvent(new CustomEvent("omsp:orders-changed"));
        }
      },
      onPrintFailed: (msg) => {
        push({
          id: `print-fail-${Date.now()}`,
          tone: "danger",
          title: "فشلت الطباعة",
          detail: msg,
          durationMs: 7000,
        });
        window.dispatchEvent(new CustomEvent("omsp:orders-changed"));
      },
    });
    return stop;
  }, [token, push]);

  return null;
}
