import { invoke } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

export type PrinterInfo = {
  id: string;
  name: string;
  status: string;
  isDefault: boolean;
  supportsColor: boolean;
  supportsDuplex: boolean;
  queueCount: number;
};

export type PrintSettings = {
  copies?: number;
  color_mode?: string;
  paper_size?: string;
  sides?: string;
  orientation?: string;
  page_range?: string;
};

function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__)
  );
}

export async function listPrinters(): Promise<PrinterInfo[]> {
  if (!isTauri()) return [];
  return invoke<PrinterInfo[]>("list_printers");
}

export async function printTest(printerId: string): Promise<void> {
  await invoke("print_test", { printerId });
}

async function downloadToTemp(url: string, fileName: string): Promise<string> {
  const res = await tauriFetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`تعذر تحميل الملف (${res.status})`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  return invoke<string>("write_temp_file", {
    fileName,
    bytes: Array.from(buf),
  });
}

/** Download signed document URL and print via the local print-worker. */
export async function printDocumentFromUrl(opts: {
  documentUrl: string;
  printerOsName?: string | null;
  settings?: PrintSettings;
  jobId?: string;
}): Promise<void> {
  if (!isTauri()) {
    throw new Error("الطباعة متاحة في تطبيق سطح المكتب فقط");
  }

  const printers = await listPrinters();
  const printerId =
    opts.printerOsName ||
    printers.find((p) => p.isDefault)?.id ||
    printers.find((p) => p.status === "online")?.id ||
    printers[0]?.id;

  if (!printerId) {
    throw new Error("لا توجد طابعة متاحة على هذا الجهاز");
  }

  const fileName = `omsp_${opts.jobId ?? Date.now()}.pdf`;
  const filePath = await downloadToTemp(opts.documentUrl, fileName);

  await invoke("print_document", {
    filePath,
    printerId,
    copies: opts.settings?.copies ?? 1,
    sides: opts.settings?.sides ?? "single",
  });
}
