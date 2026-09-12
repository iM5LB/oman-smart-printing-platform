import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./updates";

/** Human-readable OS name. Avoids the UA lie that Win11 is "Windows NT 10.0". */
export async function getOsLabel(): Promise<string> {
  if (isTauri()) {
    try {
      const label = await invoke<string>("os_label");
      if (label?.trim()) return label.trim();
    } catch {
      /* fall through */
    }
  }
  return browserOsLabel();
}

export function formatStoredOs(os: string | null | undefined): string {
  if (!os?.trim()) return "—";
  const raw = os.trim();
  if (!/Windows NT/i.test(raw) && /^Windows \d{2}/i.test(raw)) return raw;

  const uaData = raw.match(/Windows (?:11|10)\b[^,]*/i);
  if (uaData && !/Windows NT/i.test(raw)) return uaData[0]!;

  const nt = raw.match(/Windows NT ([\d.]+)/i);
  if (nt) {
    const build = raw.match(/\b(1[0-9]{4}|2[0-9]{4})\b/);
    const buildN = build ? Number(build[1]) : 0;
    if (buildN >= 22000) return `Windows 11 (${build?.[1] ?? buildN})`;
    if (nt[1] === "10.0") return "Windows";
    return `Windows ${nt[1]}`;
  }

  if (raw.length > 36) return `${raw.slice(0, 34)}…`;
  return raw;
}

async function browserOsLabel(): Promise<string> {
  const nav = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
      getHighEntropyValues?: (hints: string[]) => Promise<{
        platformVersion?: string;
      }>;
    };
  };

  if (nav.userAgentData?.platform === "Windows" && nav.userAgentData.getHighEntropyValues) {
    try {
      const { platformVersion } = await nav.userAgentData.getHighEntropyValues([
        "platformVersion",
      ]);
      const major = Number(platformVersion?.split(".")[0]);
      if (Number.isFinite(major) && major >= 13) return "Windows 11";
      if (Number.isFinite(major)) return "Windows 10";
    } catch {
      /* ignore */
    }
  }

  return formatStoredOs(navigator.userAgent);
}
