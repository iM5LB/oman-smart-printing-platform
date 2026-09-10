import Link from 'next/link';
import { TIBAA } from '@/lib/brand';
import { TibaaBrand } from '@/components/tibaa-brand';

export const metadata = {
  title: `الشروط والأحكام · ${TIBAA.nameAr}`,
  description: `الشروط والأحكام لمنصة ${TIBAA.nameAr} ${TIBAA.nameEn}`,
};

export default function TermsPage() {
  return (
    <div className="page-shell page-shell-wide shell-home">
      <div className="page-content flex min-h-0 flex-col">
        <header className="shrink-0 border-b border-border bg-surface px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="shrink-0">
              <TibaaBrand variant="icon" size="sm" className="!h-10 !w-10" />
            </Link>
            <h1 className="text-base font-bold sm:text-lg">الشروط والأحكام</h1>
            <Link href="/" className="text-sm text-primary hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <article className="mx-auto max-w-3xl space-y-5 text-sm leading-7 text-text sm:text-base sm:leading-8">
            <p className="text-text-muted">آخر تحديث: سبتمبر 2026</p>
            <section className="space-y-2">
              <h2 className="text-base font-bold">1. قبول الشروط</h2>
              <p>
                باستخدامك منصة {TIBAA.nameAr} ({TIBAA.nameEn}) — كمكتبة أو كعميل — فأنت توافق على هذه
                الشروط. إذا لم توافق، يُرجى عدم استخدام الخدمة.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="text-base font-bold">2. طبيعة الخدمة</h2>
              <p>
                المنصة وسيط تقني يربط العملاء بالمكتبات لتنفيذ طلبات الطباعة والخدمات المرتبطة.
                مسؤولية جودة التنفيذ والتسليم تقع على المكتبة التي تستلم الطلب، ضمن ما تعرضه من
                خيارات وأسعار.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="text-base font-bold">3. حسابات المكتبات</h2>
              <ul className="list-disc space-y-1 pe-5">
                <li>يجب تقديم معلومات صحيحة عند التسجيل وإعداد الجهاز.</li>
                <li>أنت مسؤول عن الحفاظ على سرية كلمات المرور ورموز الأجهزة.</li>
                <li>يُحظر إساءة استخدام المنصة أو محاولة الوصول غير المصرّح به.</li>
              </ul>
            </section>
            <section className="space-y-2">
              <h2 className="text-base font-bold">4. طلبات العملاء والملفات</h2>
              <ul className="list-disc space-y-1 pe-5">
                <li>أنت تؤكد أن لديك الحق في رفع الملفات المطلوبة للطباعة.</li>
                <li>يُحظر رفع محتوى غير قانوني أو ينتهك حقوق الغير.</li>
                <li>الأسعار المعروضة تعتمد على إعدادات المكتبة وقد تشمل الضرائب إن وُجدت.</li>
              </ul>
            </section>
            <section className="space-y-2">
              <h2 className="text-base font-bold">5. الدفع</h2>
              <p>
                قد تُتاح خيارات مثل الدفع عند الاستلام أو الدفع الإلكتروني حسب إعداد المكتبة. أي
                نزاع مالي يتعلق بتنفيذ الطلب يُعالَج أولاً مع المكتبة المعنية.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="text-base font-bold">6. التوفّر والمسؤولية</h2>
              <p>
                نسعى لتشغيل المنصة بشكل موثوق، دون ضمان عدم انقطاع الخدمة. إلى أقصى حد يسمح به
                القانون، لا تتحمل المنصة المسؤولية عن أضرار غير مباشرة أو خسائر ناتجة عن تأخير أو
                خطأ في الطباعة لدى المكتبة.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="text-base font-bold">7. التعديلات</h2>
              <p>
                قد نحدّث هذه الشروط من وقت لآخر. استمرار استخدامك بعد النشر يعني موافقتك على النسخة
                المحدّثة.
              </p>
            </section>
            <p className="pt-2">
              راجع أيضاً{' '}
              <Link href="/privacy" className="font-medium text-primary hover:underline">
                سياسة الخصوصية
              </Link>
              .
            </p>
          </article>
        </main>
      </div>
    </div>
  );
}
