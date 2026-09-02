import type { StorePublicInfo } from '@omsp/types';

export function StoreFooter({ store: _store }: { store: StorePublicInfo }) {
  return (
    <footer className="store-footer shrink-0">
      <p className="text-[11px] text-text-muted/60">
        امسح واطبع · © {new Date().getFullYear()} منصة الطباعة الذكية
      </p>
    </footer>
  );
}
