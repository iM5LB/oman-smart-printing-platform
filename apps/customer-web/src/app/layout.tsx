import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'اطبع ملفاتك بسهولة',
  description: 'منصة الطباعة الذكية — ارفع ملفاتك واطبعها بسهولة',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="h-full overflow-hidden">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full overflow-hidden bg-background text-text font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
