import { isTauri } from "./tauriEnv";

let permissionReady: Promise<boolean> | null = null;

async function ensurePermission(): Promise<boolean> {
  if (!isTauri()) return false;
  if (!permissionReady) {
    permissionReady = (async () => {
      try {
        const {
          isPermissionGranted,
          requestPermission,
        } = await import("@tauri-apps/plugin-notification");
        let granted = await isPermissionGranted();
        if (!granted) {
          granted = (await requestPermission()) === "granted";
        }
        return granted;
      } catch {
        return false;
      }
    })();
  }
  return permissionReady;
}

/** Show a Windows / OS notification (no-op in browser or if denied). */
export async function notifyOs(input: {
  title: string;
  body?: string;
}): Promise<void> {
  try {
    if (!(await ensurePermission())) return;
    const { sendNotification } = await import(
      "@tauri-apps/plugin-notification"
    );
    sendNotification({
      title: input.title,
      body: input.body?.trim() || undefined,
    });
  } catch {
    /* OS toast is best-effort */
  }
}

/** Warm permission on app start so the first order toast is not delayed. */
export function prefetchOsNotificationPermission(): void {
  void ensurePermission();
}
