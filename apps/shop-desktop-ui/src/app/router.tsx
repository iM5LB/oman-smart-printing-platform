import { useEffect, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { OrdersPage } from '@/features/orders/OrdersPage';
import { PickupPage } from '@/features/pickup/PickupPage';
import { QueuePage } from '@/features/queue/QueuePage';
import { PrintersPage } from '@/features/printers/PrintersPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { PlaceholderPage } from '@/features/shared/PlaceholderPage';
import { useUiStore } from '@/stores/ui-store';

function RequireAuth({ children }: { children: ReactNode }) {
  const ok = useUiStore((s) => s.authenticated);
  if (!ok) return <Navigate to="/login" replace />;
  return children;
}

function Shortcuts() {
  const navigate = useNavigate();
  const ok = useUiStore((s) => s.authenticated);

  useEffect(() => {
    if (!ok) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        navigate('/pickup');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, ok]);

  return null;
}

export function AppRouter() {
  const ok = useUiStore((s) => s.authenticated);

  return (
    <BrowserRouter>
      <Shortcuts />
      <Routes>
        <Route path="/login" element={ok ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="queue" element={<QueuePage />} />
          <Route path="printers" element={<PrintersPage />} />
          <Route path="pickup" element={<PickupPage />} />
          <Route
            path="payments"
            element={<PlaceholderPage title="المدفوعات" hint="سجل المدفوعات والاسترداد" />}
          />
          <Route
            path="customers"
            element={<PlaceholderPage title="العملاء" hint="سجل العملاء والزيارات" />}
          />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to={ok ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
