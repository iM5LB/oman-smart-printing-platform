import Link from 'next/link';
import { TIBAA } from '@/lib/brand';

export function SiteFooter({ className = '' }: { className?: string }) {
  return (
    <footer
      className={`shrink-0 border-t border-border/70 bg-surface/95 px-4 py-3 sm:px-6 lg:px-8 ${className}`}
    >
      <div className="flex flex-col items-center gap-2.5 text-center sm:flex-row sm:justify-between sm:text-start">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={TIBAA.iconSrc}
            alt=""
            className="size-6 rounded-md object-cover ring-1 ring-black/5"
          />
          <p className="text-xs text-text-muted sm:text-sm">
            © {new Date().getFullYear()} {TIBAA.nameAr} · {TIBAA.nameEn}
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs sm:text-sm">
          <Link href="/privacy" className="text-text-muted transition-colors hover:text-primary">
            سياسة الخصوصية
          </Link>
          <Link href="/terms" className="text-text-muted transition-colors hover:text-primary">
            الشروط والأحكام
          </Link>
          <Link href="/onboarding" className="font-medium text-teal transition-colors hover:underline">
            للمكتبات
          </Link>
          <Link href="/" className="text-text-muted transition-colors hover:text-primary">
            المكتبات
          </Link>
        </nav>
      </div>
    </footer>
  );
}
