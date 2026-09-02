import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'لوحة المكتبة — منصة الطباعة',
  description: 'إعداد المكتبة وربط أجهزة الطباعة',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
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
      <body className="min-h-full bg-background text-text font-sans antialiased">{children}</body>
    </html>
  );
}
