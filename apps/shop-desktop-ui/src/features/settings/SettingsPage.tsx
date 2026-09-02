import { TopBar } from '@/components/layout/TopBar';
import { Button, Input, Panel } from '@/components/ui';

export function SettingsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title="الإعدادات" hint="بيانات المكتبة · الطباعة · الخصوصية · الجهاز" />
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 animate-fade-up">
        <Panel className="space-y-3 p-4">
          <h2 className="text-sm font-bold">بيانات المكتبة</h2>
          <label className="block space-y-1.5">
            <span className="text-xs text-ink-3">اسم المكتبة</span>
            <Input defaultValue="مكتبة النور" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-ink-3">الهاتف</span>
            <Input defaultValue="+968 2400 0000" dir="ltr" />
          </label>
        </Panel>

        <Panel className="space-y-3 p-4">
          <h2 className="text-sm font-bold">الطباعة التلقائية</h2>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span>طباعة تلقائية للطلبات المدفوعة</span>
            <input type="checkbox" defaultChecked className="size-4 accent-accent" />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span>الدفع عند الاستلام — طباعة فوراً</span>
            <input type="checkbox" defaultChecked className="size-4 accent-accent" />
          </label>
        </Panel>

        <Panel className="space-y-3 p-4">
          <h2 className="text-sm font-bold">خصوصية الملفات</h2>
          <label className="block space-y-1.5">
            <span className="text-xs text-ink-3">مدة الاحتفاظ المحلي</span>
            <select className="h-10 w-full rounded-lg border border-line bg-elevated px-3 text-sm text-ink outline-none">
              <option>24 ساعة</option>
              <option>ساعة واحدة</option>
              <option>3 أيام</option>
              <option>حذف فوري بعد الطباعة</option>
            </select>
          </label>
        </Panel>

        <div className="flex justify-end">
          <Button>حفظ الإعدادات</Button>
        </div>
      </div>
    </div>
  );
}
