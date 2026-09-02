import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export type UpdateCheckResult =
  | { status: "unavailable" }
  | { status: "up-to-date" }
  | { status: "available"; version: string }
  | { status: "error"; message: string };

export type InstallProgress = {
  downloaded: number;
  total: number | null;
};

/**
 * Tauri returns null when already current, but throws when the feed URL
 * 404s (no GitHub Release / latest.json yet). Treat that as up-to-date.
 */
function isMissingUpdateManifest(error: unknown): boolean {
  const msg = (
    error instanceof Error ? error.message : String(error ?? "")
  ).toLowerCase();
  return (
    msg.includes("could not fetch a valid release json") ||
    msg.includes("release not found") ||
    /\b404\b/.test(msg) ||
    msg.includes("status code: 404") ||
    msg.includes("status: 404")
  );
}

function updateCheckErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.toLowerCase();
    // Prefer Arabic for common network failures; keep detail otherwise short.
    if (
      msg.includes("network") ||
      msg.includes("dns") ||
      msg.includes("timed out") ||
      msg.includes("timeout") ||
      msg.includes("connection") ||
      msg.includes("failed to fetch") ||
      msg.includes("error sending request")
    ) {
      return "تعذر التحقق من التحديثات. تحقق من الاتصال بالإنترنت وحاول مجدداً.";
    }
  }
  return "تعذر التحقق من التحديثات. حاول لاحقاً.";
}

/** Silent check — returns quietly on non-Tauri / offline / errors when silent. */
export async function checkForUpdate(opts?: {
  silent?: boolean;
}): Promise<UpdateCheckResult> {
  if (!isTauri()) return { status: "unavailable" };

  try {
    const update = await check();
    if (!update) return { status: "up-to-date" };
    return { status: "available", version: update.version };
  } catch (e) {
    // No published release feed yet → not an error for the user.
    if (isMissingUpdateManifest(e)) return { status: "up-to-date" };
    if (opts?.silent) return { status: "unavailable" };
    return {
      status: "error",
      message: updateCheckErrorMessage(e),
    };
  }
}

export async function downloadAndInstallUpdate(opts?: {
  onProgress?: (p: InstallProgress) => void;
}): Promise<void> {
  if (!isTauri()) throw new Error("التحديث متاح في تطبيق سطح المكتب فقط");

  const update = await check();
  if (!update) throw new Error("لا يتوفر تحديث حالياً");

  let downloaded = 0;
  let total: number | null = null;

  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      total = event.data.contentLength ?? null;
      opts?.onProgress?.({ downloaded: 0, total });
    } else if (event.event === "Progress") {
      downloaded += event.data.chunkLength;
      opts?.onProgress?.({ downloaded, total });
    } else if (event.event === "Finished") {
      opts?.onProgress?.({ downloaded: total ?? downloaded, total });
    }
  });

  await relaunch();
}

export function formatProgress(p: InstallProgress): string {
  if (p.total && p.total > 0) {
    const pct = Math.min(100, Math.round((p.downloaded / p.total) * 100));
    return `جاري التحميل… ${pct}%`;
  }
  if (p.downloaded > 0) {
    const mb = (p.downloaded / (1024 * 1024)).toFixed(1);
    return `جاري التحميل… ${mb} م.ب`;
  }
  return "جاري التحميل…";
}
