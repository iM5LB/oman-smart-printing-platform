import { openUrl } from "@tauri-apps/plugin-opener";

function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__)
  );
}

/** Open a URL in the system default browser (Tauri) or a new tab (web). */
export async function openExternalUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) return;
  if (isTauriRuntime()) {
    await openUrl(trimmed);
    return;
  }
  window.open(trimmed, "_blank", "noopener,noreferrer");
}
