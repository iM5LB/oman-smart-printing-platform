import { invoke } from "@tauri-apps/api/core";

export type PrinterInfo = {
  id: string;
  name: string;
  status: string;
  isDefault: boolean;
  supportsColor: boolean;
  supportsDuplex: boolean;
  queueCount: number;
};

export async function listPrinters(): Promise<PrinterInfo[]> {
  return invoke<PrinterInfo[]>("list_printers");
}

export async function printTest(printerId: string): Promise<void> {
  await invoke("print_test", { printerId });
}
