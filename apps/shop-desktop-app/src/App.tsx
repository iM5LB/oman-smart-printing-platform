import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { AppShell } from "./components/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OrdersPage } from "./pages/OrdersPage";
import { PrintersPage } from "./pages/PrintersPage";
import { PickupPage } from "./pages/PickupPage";
import { QueuePage } from "./pages/QueuePage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { PricingPage } from "./pages/PricingPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <Protected>
            <AppShell>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/queue" element={<QueuePage />} />
                <Route path="/printers" element={<PrintersPage />} />
                <Route path="/payments" element={<PaymentsPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/pickup" element={<PickupPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </Protected>
        }
      />
    </Routes>
  );
}
