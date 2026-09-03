import { TIBAA } from '@/lib/brand';

export function TibaaBrand({
  variant = 'lockup',
  className = '',
  showTagline = false,
  size = 'md',
}: {
  variant?: 'lockup' | 'icon' | 'wordmark';
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const iconSize =
    size === 'sm' ? 'h-12 w-12' : size === 'lg' ? 'h-32 w-32' : 'h-24 w-24';
  const logoH = size === 'sm' ? 'h-11' : size === 'lg' ? 'h-20' : 'h-16';

  if (variant === 'icon') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={TIBAA.iconSrc}
        alt={TIBAA.nameAr}
        className={`${iconSize} rounded-2xl bg-white object-contain p-1 ring-1 ring-white/10 ${className}`}
      />
    );
  }

  if (variant === 'wordmark') {
    return (
      <div className={`text-center leading-tight ${className}`}>
        <p className={`font-extrabold text-text-primary ${size === 'lg' ? 'text-3xl' : 'text-2xl'}`}>
          {TIBAA.nameAr}
        </p>
        <p className={`font-bold text-info ${size === 'lg' ? 'text-lg' : 'text-base'}`}>
          {TIBAA.nameEn}
        </p>
        {showTagline ? <p className="mt-1.5 text-sm text-text-muted">{TIBAA.taglineAr}</p> : null}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={TIBAA.logoSrc}
        alt={`${TIBAA.nameAr} ${TIBAA.nameEn}`}
        className={`${logoH} w-auto max-w-[300px] rounded-2xl bg-white object-contain p-1`}
      />
      {showTagline ? (
        <p className="max-w-[20rem] text-center text-sm text-text-muted">{TIBAA.taglineAr}</p>
      ) : null}
    </div>
  );
}
