import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "@/layouts/MainLayout";

import BillingPage from "@/features/billing/pages/BillingPage";
import OrdersPage from "@/features/orders/pages/OrdersPage";
import TablesPage from "@/features/tables/pages/TablesPage";
import OnlineOrdersPage from "@/features/online-orders/pages/LiveOrdersPage";
import KitchenPage from "@/features/kitchen/pages/KitchenPage";

import LoginPage from "@/features/auth/LoginPage";
import ProtectedRoute from "@/routes/ProtectedRoutes";
import ManageShop from "@/components/manage_shop/ManageShop";
import { useAppSelector } from "@/store/hooks";

function DefaultRedirect() {
  const { user } = useAppSelector((state) => state.auth);
  if (user?.department === "KITCHEN") {
    return <Navigate to="/app/kitchen" replace />;
  }
  return <Navigate to="/app/billing" replace />;
}

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected App */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DefaultRedirect />} />

          {/* Billing — all non-kitchen staff; KITCHEN dept auto-blocked by ProtectedRoute */}
          <Route path="billing" element={<BillingPage />} />

          <Route path="tables" element={<TablesPage />} />

          {/* Orders & Live Orders — Cashier and Manager only */}
          <Route
            path="orders"
            element={
              <ProtectedRoute allowedRoles={["CASHIER"]}>
                <OrdersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="online-orders"
            element={
              <ProtectedRoute allowedRoles={["CASHIER"]}>
                <OnlineOrdersPage />
              </ProtectedRoute>
            }
          />

          {/* Manage Shop — Manager only */}
          <Route
            path="manage-shop"
            element={
              <ProtectedRoute allowedRoles={["MANAGER"]}>
                <ManageShop />
              </ProtectedRoute>
            }
          />

          {/* Kitchen — Kitchen dept only (Manager bypasses via superuser) */}
          <Route
            path="kitchen"
            element={
              <ProtectedRoute allowedDepartments={["KITCHEN"]}>
                <KitchenPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
