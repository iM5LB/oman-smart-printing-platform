import { TopBar } from '@/components/layout/TopBar';
import { EmptyState, Panel } from '@/components/ui';

export function PlaceholderPage({
  title,
  hint,
}: {
  title: string;
  hint: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title={title} hint={hint} />
      <div className="min-h-0 flex-1 p-4 animate-fade-up">
        <Panel className="h-full min-h-[320px]">
          <EmptyState
            title="قريباً في المرحلة التالية"
            hint="الواجهة جاهزة — الربط مع الواجهة الخلفية وخدمة الطباعة قادم"
          />
        </Panel>
      </div>
    </div>
  );
}
