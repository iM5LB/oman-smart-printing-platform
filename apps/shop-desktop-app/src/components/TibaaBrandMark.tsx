import { TIBAA } from "../lib/brand";

/** Platform logo + name for sidebar / login chrome */
export function TibaaBrandMark({
  size = "md",
  stacked = false,
  showTagline = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  stacked?: boolean;
  showTagline?: boolean;
  className?: string;
}) {
  const icon =
    size === "sm" ? "size-11" : size === "lg" ? "size-28" : "size-14";
  const title =
    size === "sm"
      ? "text-section"
      : size === "lg"
        ? "text-[1.75rem] font-bold"
        : "text-title";
  const en =
    size === "sm"
      ? "text-caption"
      : size === "lg"
        ? "text-lg font-semibold"
        : "text-meta font-semibold";

  /* White rounded frame so the JPG’s white field reads clean on dark navy UI */
  const imgClass = `${icon} shrink-0 rounded-2xl bg-white object-contain p-1 ring-1 ring-black/10`;

  const mark = (
    <img src={TIBAA.iconSrc} alt="" className={imgClass} />
  );

  if (stacked) {
    return (
      <div className={`flex flex-col items-center gap-3 text-center ${className}`}>
        {mark}
        <div>
          <p className={`${title} leading-tight tracking-tight`}>{TIBAA.nameAr}</p>
          <p className={`mt-0.5 text-info ${en}`}>{TIBAA.nameEn}</p>
          {showTagline ? (
            <p className="mt-2 max-w-[18rem] text-meta text-text-muted">
              {TIBAA.taglineAr}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      {mark}
      <div className="min-w-0">
        <p className={`truncate ${title} leading-tight`}>{TIBAA.nameAr}</p>
        <p className={`truncate text-info ${en}`}>{TIBAA.nameEn}</p>
        {showTagline ? (
          <p className="mt-0.5 truncate text-caption text-text-muted">
            {TIBAA.taglineAr}
          </p>
        ) : null}
      </div>
    </div>
  );
}
