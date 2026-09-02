import { invoke } from "@tauri-apps/api/core";

function isTauri() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function stamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function csvEscape(value: string | number | null | undefined) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function saveTextFile(
  defaultName: string,
  contents: string,
  filterName: string,
  extensions: string[],
): Promise<"saved" | "cancelled"> {
  if (isTauri()) {
    const path = await invoke<string | null>("save_export_file", {
      defaultName,
      contents,
      filterName,
      extensions,
    });
    return path ? "saved" : "cancelled";
  }

  const mime =
    extensions.includes("csv")
      ? "text/csv;charset=utf-8"
      : "text/html;charset=utf-8";
  downloadBlob(defaultName, new Blob([contents], { type: mime }));
  return "saved";
}

export async function exportExcelCsv(
  filenameBase: string,
  sheets: { name: string; headers: string[]; rows: (string | number | null | undefined)[][] }[],
): Promise<"saved" | "cancelled"> {
  const parts: string[] = [];
  for (const sheet of sheets) {
    parts.push(sheet.name);
    parts.push(sheet.headers.map(csvEscape).join(","));
    for (const row of sheet.rows) {
      parts.push(row.map(csvEscape).join(","));
    }
    parts.push("");
  }
  const bom = "\uFEFF";
  const contents = bom + parts.join("\r\n");
  const filename = `${filenameBase}-${stamp()}.csv`;
  return saveTextFile(filename, contents, "Excel CSV", ["csv"]);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function exportPdfHtml(opts: {
  title: string;
  storeName?: string;
  summary: { label: string; value: string }[];
  tables: { title: string; headers: string[]; rows: string[][] }[];
}): Promise<"opened" | "saved" | "cancelled"> {
  const when = new Date().toLocaleString("ar-OM");
  const summaryHtml = opts.summary
    .map(
      (s) =>
        `<tr><td style="padding:8px;border:1px solid #ddd">${escapeHtml(s.label)}</td><td style="padding:8px;border:1px solid #ddd;font-weight:600">${escapeHtml(s.value)}</td></tr>`,
    )
    .join("");

  const tablesHtml = opts.tables
    .map((t) => {
      const head = t.headers
        .map(
          (h) =>
            `<th style="padding:8px;border:1px solid #ddd;background:#f3f4f6">${escapeHtml(h)}</th>`,
        )
        .join("");
      const body =
        t.rows.length === 0
          ? `<tr><td colspan="${t.headers.length}" style="padding:12px;text-align:center;color:#666">لا بيانات</td></tr>`
          : t.rows
              .map(
                (r) =>
                  `<tr>${r.map((c) => `<td style="padding:8px;border:1px solid #ddd">${escapeHtml(c)}</td>`).join("")}</tr>`,
              )
              .join("");
      return `<h2 style="margin:24px 0 8px;font-size:16px">${escapeHtml(t.title)}</h2><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(opts.title)}</title>
<style>
  body{font-family:"IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif;color:#111;margin:32px;background:#fff}
  h1{font-size:22px;margin:0 0 4px}
  .meta{color:#555;font-size:13px;margin-bottom:20px}
  @media print{body{margin:12px} .no-print{display:none!important}}
</style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="margin-bottom:16px;padding:8px 14px;border:0;border-radius:8px;background:#1f6feb;color:#fff;cursor:pointer">طباعة / حفظ PDF</button>
  <h1>${escapeHtml(opts.title)}</h1>
  <p class="meta">${escapeHtml(opts.storeName || "المكتبة")} · ${escapeHtml(when)}</p>
  <h2 style="font-size:16px;margin:0 0 8px">الملخص</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;max-width:480px">${summaryHtml}</table>
  ${tablesHtml}
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},400)})</script>
</body>
</html>`;

  if (isTauri()) {
    await invoke<string>("open_html_report", { contents: html });
    return "opened";
  }

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    const result = await saveTextFile(
      `${opts.title}-${stamp()}.html`,
      html,
      "HTML",
      ["html"],
    );
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    return result === "saved" ? "saved" : "cancelled";
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "opened";
}
