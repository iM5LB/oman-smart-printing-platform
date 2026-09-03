import { TIBAA } from '@/lib/brand';

type Variant = 'lockup' | 'icon' | 'wordmark';

export function TibaaBrand({
  variant = 'lockup',
  className = '',
  showTagline = false,
  size = 'md',
}: {
  variant?: Variant;
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const iconSize =
    size === 'sm' ? 'h-12 w-12' : size === 'lg' ? 'h-32 w-32' : 'h-24 w-24';
  const logoH =
    size === 'sm' ? 'h-11' : size === 'lg' ? 'h-20' : 'h-16';
  const logoMax =
    size === 'sm' ? 'max-w-[180px]' : size === 'lg' ? 'max-w-[320px]' : 'max-w-[280px]';

  if (variant === 'icon') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={TIBAA.iconSrc}
        alt={TIBAA.nameAr}
        className={`${iconSize} rounded-2xl bg-white object-contain p-1 ring-1 ring-black/5 ${className}`}
      />
    );
  }

  if (variant === 'wordmark') {
    return (
      <div className={`flex flex-col items-start leading-tight ${className}`}>
        <span
          className={`font-extrabold tracking-tight text-[#1A325D] ${
            size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-2xl'
          }`}
        >
          {TIBAA.nameAr}
        </span>
        <span
          className={`font-bold tracking-wide text-[#2E8B7C] ${
            size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base'
          }`}
        >
          {TIBAA.nameEn}
        </span>
        {showTagline ? (
          <span className="mt-1.5 text-sm text-text-muted">{TIBAA.taglineAr}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={TIBAA.logoSrc}
        alt={`${TIBAA.nameAr} ${TIBAA.nameEn}`}
        className={`${logoH} w-auto ${logoMax} rounded-2xl bg-white object-contain object-center p-1`}
      />
      {showTagline ? (
        <p className="max-w-[20rem] text-center text-sm leading-snug text-text-muted">
          {TIBAA.taglineAr}
        </p>
      ) : null}
    </div>
  );
}
