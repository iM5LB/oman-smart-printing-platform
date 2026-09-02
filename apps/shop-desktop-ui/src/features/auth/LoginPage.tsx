import { useState, type FormEvent } from 'react';
import { Lock, Printer } from 'lucide-react';
import { Button, Input, Panel, StatusDot } from '@/components/ui';
import { useUiStore } from '@/stores/ui-store';

export function LoginPage() {
  const setAuth = useUiStore((s) => s.setAuthenticated);
  const [user, setUser] = useState('ahmed');
  const [pass, setPass] = useState('••••••••');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setAuth(true);
    setLoading(false);
  }

  return (
    <div className="relative flex h-full items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -end-24 size-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-32 -start-16 size-80 rounded-full bg-brand/15 blur-3xl" />
      </div>

      <Panel className="animate-fade-up relative w-full max-w-md overflow-hidden p-0 shadow-[0_0_0_1px_rgb(56_189_248/0.08)]">
        <div className="border-b border-line bg-elevated/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-accent-dim text-accent ring-1 ring-accent/25">
              <Printer className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-ink">عمان للطباعة الذكية</h1>
              <p className="text-xs text-ink-3">نظام تشغيل المكتبة — سطح المكتب</p>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-6">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink-2">اسم المستخدم</span>
            <Input value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink-2">كلمة المرور</span>
            <Input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-2">
            <input type="checkbox" className="size-3.5 accent-accent" defaultChecked />
            تذكر هذا الجهاز
          </label>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            <Lock className="size-4" />
            {loading ? 'جاري الدخول…' : 'تسجيل الدخول'}
          </Button>
        </form>

        <div className="flex items-center justify-between border-t border-line px-6 py-3 text-[11px] text-ink-3">
          <span className="inline-flex items-center gap-1.5">
            <StatusDot tone="ok" pulse />
            الخادم متصل
          </span>
          <span className="font-mono">v0.1.0</span>
        </div>
      </Panel>
    </div>
  );
}
