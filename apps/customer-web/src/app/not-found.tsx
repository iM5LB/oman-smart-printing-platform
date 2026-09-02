import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold mb-2">المكتبة غير موجودة</h1>
      <p className="text-text-muted mb-6">
        تأكد من الرابط أو امسح رمز QR من المكتبة
      </p>
      <Link href="/" className="text-primary underline">
        العودة للرئيسية
      </Link>
    </main>
  );
}
