import { NavLink } from 'react-router-dom';
import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  PanelRightClose,
  PanelRightOpen,
  Printer,
  Settings,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton, StatusDot } from '@/components/ui';
import { useUiStore } from '@/stores/ui-store';

const NAV = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'الطلبات', icon: ClipboardList },
  { to: '/queue', label: 'قائمة الطباعة', icon: ListOrdered },
  { to: '/printers', label: 'الطابعات', icon: Printer },
  { to: '/pickup', label: 'الاستلام', icon: Store },
  { to: '/payments', label: 'المدفوعات', icon: Wallet },
  { to: '/customers', label: 'العملاء', icon: Users },
  { to: '/settings', label: 'الإعدادات', icon: Settings },
];

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const logout = useUiStore((s) => s.setAuthenticated);

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col border-e border-line bg-surface/80 backdrop-blur-md transition-[width] duration-200',
        collapsed ? 'w-[72px]' : 'w-[220px]',
      )}
    >
      <div className={cn('flex h-14 items-center gap-2.5 border-b border-line px-3', collapsed && 'justify-center')}>
        <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent/30 to-brand/40 text-accent ring-1 ring-accent/30">
          <Printer className="size-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">عمان طباعة</p>
            <p className="truncate text-[10px] text-ink-3">مكتبة النور</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-accent-dim text-accent'
                  : 'text-ink-2 hover:bg-hover hover:text-ink',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute inset-y-1.5 start-0 w-0.5 rounded-full bg-accent" />
                )}
                <item.icon className="size-4 shrink-0 opacity-90" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line p-2">
        {!collapsed && (
          <div className="mb-2 rounded-lg border border-line bg-elevated/60 px-2.5 py-2">
            <div className="flex items-center gap-2">
              <StatusDot tone="ok" pulse />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-ink">أحمد الكاشير</p>
                <p className="truncate text-[10px] text-ink-3">موظف طباعة</p>
              </div>
            </div>
          </div>
        )}
        <div className={cn('flex gap-1', collapsed ? 'flex-col items-center' : 'items-center justify-between')}>
          <IconButton onClick={toggle} aria-label="طي القائمة">
            {collapsed ? <PanelRightOpen className="size-4" /> : <PanelRightClose className="size-4" />}
          </IconButton>
          <IconButton onClick={() => logout(false)} aria-label="خروج" title="خروج">
            <LogOut className="size-4" />
          </IconButton>
          {!collapsed && (
            <IconButton aria-label="إشعارات" className="relative">
              <Bell className="size-4" />
              <span className="absolute top-1.5 end-1.5 size-1.5 rounded-full bg-danger" />
            </IconButton>
          )}
        </div>
      </div>
    </aside>
  );
}
