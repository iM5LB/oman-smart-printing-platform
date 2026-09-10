import Link from 'next/link';
import { TIBAA } from '@/lib/brand';
import { TibaaBrand } from '@/components/tibaa-brand';

export const metadata = {
  title: `سياسة الخصوصية · ${TIBAA.nameAr}`,
  description: `سياسة الخصوصية لمنصة ${TIBAA.nameAr} ${TIBAA.nameEn}`,
};

export default function PrivacyPage() {
  return (
    <div className="page-shell shell-home">
      <div className="page-content flex min-h-0 flex-col">
        <header className="shrink-0 border-b border-border bg-surface px-4 py-4">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <Link href="/" className="shrink-0">
              <TibaaBrand variant="icon" size="sm" className="!h-10 !w-10" />
            </Link>
            <h1 className="text-base font-bold">سياسة الخصوصية</h1>
            <Link href="/" className="text-sm text-primary hover:underline">
              الرئيسية
            </Link>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <article className="mx-auto max-w-2xl space-y-5 text-sm leading-7 text-text">
            <p className="text-text-muted">آخر تحديث: سبتمبر 2026</p>
            <section className="space-y-2">
              <h2 className="text-base font-bold">1. من نحن</h2>
              <p>
                منصة {TIBAA.nameAr} ({TIBAA.nameEn}) تقدّم خدمات طلب الطباعة عبر الإنترنت للمكتبات
                والعملاء في سلطنة عُمان. عند استخدامك للمنصة فأنت توافق على هذه السياسة.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="text-base font-bold">2. البيانات التي نجمعها</h2>
              <ul className="list-disc space-y-1 pe-5">
                <li>بيانات التواصل مثل الاسم ورقم الهاتف عند إنشاء طلب.</li>
                <li>الملفات التي ترفعها للطباعة وخيارات الطباعة المرتبطة بها.</li>
                <li>بيانات المكتبة عند التسجيل (الاسم، الشعار، الموقع، بيانات الدخول).</li>
                <li>بيانات تقنية أساسية لتشغيل الخدمة وأمانها (مثل سجلات الأخطاء والجلسات).</li>
              </ul>
            </section>
            <section className="space-y-2">
              <h2 className="text-base font-bold">3. كيف نستخدم البيانات</h2>
              <ul className="list-disc space-y-1 pe-5">
                <li>تنفيذ طلبات الطباعة وتتبّعها وتسليمها.</li>
                <li>التواصل بشأن حالة الطلب عبر القنوات المتاحة (مثل واتساب OTP عند التفعيل).</li>
                <li>تشغيل لوحة المكتبة وتطبيق سطح المكتب وإدارة الإعدادات.</li>
                <li>تحسين الأمان ومنع إساءة الاستخدام.</li>
              </ul>
            </section>
            <section className="space-y-2">
              <h2 className="text-base font-bold">4. الملفات والاحتفاظ</h2>
              <p>
                تُعالَج ملفات الطباعة لغرض تنفيذ الطلب فقط. قد تحتفظ المكتبة أو المنصة بالملفات لمدة
                محدودة وفق إعدادات الاحتفاظ الخاصة بالمكتبة، ثم تُحذف أو تُزال من التخزين النشط.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="text-base font-bold">5. المشاركة مع أطراف أخرى</h2>
              <p>
                تُشارك بيانات الطلب مع المكتبة التي اخترتها لتنفيذ الخدمة. قد نستخدم مزوّدي بنية تحتية
                (استضافة، تخزين، رسائل) لتشغيل المنصة، دون بيع بياناتك لأغراض تسويقية.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="text-base font-bold">6. حقوقك</h2>
              <p>
                يمكنك طلب تصحيح بياناتك أو الاستفسار عن حذفها عبر التواصل مع المكتبة المعنية أو دعم
                المنصة، مع مراعاة ما يلزم قانوناً للاحتفاظ بسجلات المعاملات.
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="text-base font-bold">7. التواصل</h2>
              <p>
                للاستفسارات المتعلقة بالخصوصية، تواصل عبر قنوات الدعم الرسمية لمنصة {TIBAA.nameAr}.
              </p>
            </section>
            <p className="pt-2">
              راجع أيضاً{' '}
              <Link href="/terms" className="font-medium text-primary hover:underline">
                الشروط والأحكام
              </Link>
              .
            </p>
          </article>
        </main>
      </div>
    </div>
  );
}
