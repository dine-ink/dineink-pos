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

          <Route path="billing" element={<BillingPage />} />

          <Route path="tables" element={<TablesPage />} />

          <Route path="orders" element={<OrdersPage />} />

          <Route path="online-orders" element={<OnlineOrdersPage />} />

          <Route path="manage-shop" element={<ManageShop />} />

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
