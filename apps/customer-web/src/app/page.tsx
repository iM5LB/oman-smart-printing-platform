import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold text-primary mb-3">
          منصة الطباعة الذكية
        </h1>
        <p className="text-text-muted mb-8 leading-relaxed">
          امسح رمز QR الخاص بمكتبتك للبدء في طلب الطباعة
        </p>
        <p className="text-sm text-text-muted">
          مثال:{' '}
          <Link href="/shop/al-noor" className="text-primary underline">
            /shop/al-noor
          </Link>
        </p>
      </div>
    </main>
  );
}
