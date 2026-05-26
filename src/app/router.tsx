import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "@/layouts/MainLayout";

import BillingPage from "@/features/billing/pages/BillingPage";
import OrdersPage from "@/features/orders/pages/OrdersPage";
import TablesPage from "@/features/tables/pages/TablesPage";
import OnlineOrdersPage from "@/features/online-orders/pages/LiveOrdersPage";

import LoginPage from "@/features/auth/LoginPage";
import ProtectedRoute from "@/routes/ProtectedRoutes";

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<LoginPage />} />

        {/* Protected App */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/billing" replace />} />

          <Route path="billing" element={<BillingPage />} />

          <Route path="orders" element={<OrdersPage />} />

          <Route path="tables" element={<TablesPage />} />

          <Route path="online-orders" element={<OnlineOrdersPage />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}
