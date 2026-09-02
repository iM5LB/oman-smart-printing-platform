export type SortDir = "asc" | "desc";

export function SortHeader({
  label,
  active,
  dir,
  onClick,
  className = "",
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  return (
    <th className={`whitespace-nowrap px-3 py-2.5 font-medium ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 whitespace-nowrap transition-colors hover:text-text-primary ${
          active ? "text-text-primary" : "text-text-muted"
        }`}
        title={dir === "asc" ? "تصاعدي — انقر للعكس" : "تنازلي — انقر للعكس"}
      >
        <span className="whitespace-nowrap">{label}</span>
        <span
          className={`inline-flex shrink-0 flex-col text-[10px] leading-none ${
            active ? "text-primary" : "text-text-muted/70"
          }`}
          aria-hidden
        >
          <span className={active && dir === "asc" ? "opacity-100" : "opacity-30"}>
            ▲
          </span>
          <span className={active && dir === "desc" ? "opacity-100" : "opacity-30"}>
            ▼
          </span>
        </span>
      </button>
    </th>
  );
}

export function toggleSort<K extends string>(
  currentKey: K,
  currentDir: SortDir,
  nextKey: K,
  defaultDir: SortDir = "asc",
): { key: K; dir: SortDir } {
  if (currentKey === nextKey) {
    return { key: currentKey, dir: currentDir === "asc" ? "desc" : "asc" };
  }
  return { key: nextKey, dir: defaultDir };
}

export function compareText(a: string, b: string, dir: SortDir) {
  const r = a.localeCompare(b, "ar", { sensitivity: "base", numeric: true });
  return dir === "asc" ? r : -r;
}

export function compareNumber(a: number, b: number, dir: SortDir) {
  return dir === "asc" ? a - b : b - a;
}
