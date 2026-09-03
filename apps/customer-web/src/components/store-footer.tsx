import type { StorePublicInfo } from '@omsp/types';
import { TIBAA } from '@/lib/brand';

export function StoreFooter({ store: _store }: { store: StorePublicInfo }) {
  return (
    <footer className="store-footer shrink-0">
      <div className="flex items-center justify-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={TIBAA.iconSrc}
          alt=""
          className="size-5 rounded object-cover"
        />
        <p className="text-[11px] text-text-muted/70">
          © {new Date().getFullYear()} {TIBAA.nameAr} · {TIBAA.nameEn}
        </p>
      </div>
    </footer>
  );
}
