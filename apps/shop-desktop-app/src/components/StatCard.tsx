import type { ReactNode } from "react";
import { Panel } from "./ui";

type Tone = "primary" | "success" | "info" | "warning";

const toneBox: Record<Tone, string> = {
  primary: "bg-[#3b82f6]/15 text-[#60a5fa]",
  success: "bg-[#22c55e]/15 text-[#4ade80]",
  info: "bg-[#a855f7]/15 text-[#c084fc]",
  warning: "bg-[#f59e0b]/15 text-[#fbbf24]",
};

/**
 * KPI card: circular icon left · RTL text stack right
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  hintPositive = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
  tone?: Tone;
  hintPositive?: boolean;
}) {
  return (
    <Panel className="h-full min-w-0 bg-bg-surface px-3.5 py-3.5">
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1 text-start">
          <p
            className="text-[13px] leading-5 text-text-muted"
            title={typeof label === "string" ? label : undefined}
          >
            {label}
          </p>
          <p className="mt-1.5 flex flex-nowrap items-baseline gap-1 whitespace-nowrap text-[26px] font-semibold leading-8 tracking-tight text-text-primary tabular-nums">
            {value}
          </p>
          {hint != null ? (
            <p
              className={`mt-1.5 flex min-h-5 items-center gap-1 text-[12px] leading-5 ${
                hintPositive ? "text-success" : "text-text-muted"
              }`}
            >
              {hint}
            </p>
          ) : null}
        </div>

        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${toneBox[tone]}`}
        >
          {icon}
        </div>
      </div>
    </Panel>
  );
}

/** Keep amount + ر.ع on one line */
export function StatMoney({ amount }: { amount: string }) {
  const trimmed = amount.trim();
  const match = trimmed.match(/^([\d.,]+)\s*(.*)$/);
  if (!match) return <>{trimmed || "—"}</>;
  const [, num, unit] = match;
  return (
    <>
      <span>{num}</span>
      {unit ? (
        <span className="text-[13px] font-medium leading-5 text-text-secondary">
          {unit}
        </span>
      ) : null}
    </>
  );
}
