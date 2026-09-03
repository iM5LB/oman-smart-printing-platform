import type { Metadata } from 'next';
import './globals.css';
import { TIBAA } from '@/lib/brand';

export const metadata: Metadata = {
  title: `لوحة المكتبة — ${TIBAA.nameAr}`,
  description: TIBAA.taglineAr,
  icons: {
    icon: [
      { url: '/favicon.ico?v=13', sizes: 'any' },
      { url: '/favicon-32.png?v=13', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16.png?v=13', type: 'image/png', sizes: '16x16' },
      { url: '/brand/tibaa-icon.png?v=13', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/favicon.ico?v=13',
    apple: [{ url: '/apple-icon.png?v=13', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-bg-base text-text-primary font-sans antialiased">{children}</body>
    </html>
  );
}
