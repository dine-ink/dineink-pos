import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import MainLayout from "@/layouts/MainLayout";
import ProtectedRoute from "@/routes/ProtectedRoutes";
import PageLoader from "@/components/ui/PageLoader";

const BillingPage = lazy(() => import("@/features/billing/pages/BillingPage"));
const OrdersPage = lazy(() => import("@/features/orders/pages/OrdersPage"));
const OnlineOrdersPage = lazy(() => import("@/features/online-orders/pages/LiveOrdersPage"));
const KitchenPage = lazy(() => import("@/features/kitchen/pages/KitchenPage"));
const LoginPage = lazy(() => import("@/features/auth/LoginPage"));
const ManageShop = lazy(() => import("@/components/manage_shop/ManageShop"));

function DefaultRedirect() {
  const { user } = useAppSelector((state) => state.auth);
  return <Navigate to={user?.department === "KITCHEN" ? "/app/kitchen" : "/app/billing"} replace />;
}

export default function Router() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/app" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<DefaultRedirect />} />

            <Route path="billing" element={<BillingPage />} />

            <Route path="orders" element={
              <ProtectedRoute allowedRoles={["CASHIER"]}>
                <OrdersPage />
              </ProtectedRoute>
            } />

            <Route path="online-orders" element={
              <ProtectedRoute allowedRoles={["CASHIER"]}>
                <OnlineOrdersPage />
              </ProtectedRoute>
            } />

            <Route path="manage-shop" element={
              <ProtectedRoute allowedRoles={["MANAGER"]}>
                <ManageShop />
              </ProtectedRoute>
            } />

            <Route path="kitchen" element={
              <ProtectedRoute allowedDepartments={["KITCHEN"]}>
                <KitchenPage />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
