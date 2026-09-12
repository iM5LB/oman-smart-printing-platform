import type { StorePublicInfo } from '@omsp/types';
import { SiteFooter } from '@/components/site-footer';

/** Shop pages use the same platform footer as the home directory. */
export function StoreFooter({ store: _store }: { store: StorePublicInfo }) {
  return <SiteFooter className="store-footer-shell" />;
}
