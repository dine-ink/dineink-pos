import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import MainLayout from "@/layouts/MainLayout";
import ProtectedRoute from "@/routes/ProtectedRoutes";
import PageLoader from "@/components/ui/PageLoader";
import { defaultRouteFor } from "@/config/navigation";

const BillingPage = lazy(() => import("@/features/billing/pages/BillingPage"));
const OrdersPage = lazy(() => import("@/features/orders/pages/OrdersPage"));
const OnlineOrdersPage = lazy(() => import("@/features/online-orders/pages/LiveOrdersPage"));
const KitchenPage = lazy(() => import("@/features/kitchen/pages/KitchenPage"));
const LoginPage = lazy(() => import("@/features/auth/LoginPage"));

// Manage Shop is a section shell with routed sections rather than one
// component holding tab state. Real routes mean the Android hardware back
// button steps back through sections instead of dropping out of the app, and a
// manager can be handed a link straight to the section they need.
const ShopLayout = lazy(() => import("@/features/shop/ShopLayout"));
const TeamSection = lazy(() => import("@/features/shop/sections/TeamSection"));
const StockSection = lazy(() => import("@/features/shop/sections/StockSection"));
const SuppliersSection = lazy(() => import("@/features/shop/sections/SuppliersSection"));
const ShopMenuSection = lazy(() => import("@/features/shop/sections/MenuSection"));
const KitchenSetupSection = lazy(() => import("@/features/shop/sections/KitchenSetupSection"));
const MoneySection = lazy(() => import("@/features/shop/sections/MoneySection"));

function DefaultRedirect() {
  const { user } = useAppSelector((state) => state.auth);
  return <Navigate to={defaultRouteFor(user)} replace />;
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

            <Route path="billing" element={
              <ProtectedRoute navPath="billing">
                <BillingPage />
              </ProtectedRoute>
            } />

            <Route path="orders" element={
              <ProtectedRoute navPath="orders">
                <OrdersPage />
              </ProtectedRoute>
            } />

            <Route path="online-orders" element={
              <ProtectedRoute navPath="online-orders">
                <OnlineOrdersPage />
              </ProtectedRoute>
            } />

            <Route path="kitchen" element={
              <ProtectedRoute navPath="kitchen">
                <KitchenPage />
              </ProtectedRoute>
            } />

            <Route path="shop" element={
              <ProtectedRoute navPath="shop">
                <ShopLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="team" replace />} />
              <Route path="team" element={<TeamSection />} />
              <Route path="stock" element={<StockSection />} />
              <Route path="suppliers" element={<SuppliersSection />} />
              <Route path="menu" element={<ShopMenuSection />} />
              <Route path="kitchen" element={<KitchenSetupSection />} />
              <Route path="money" element={<MoneySection />} />
            </Route>

            {/* Anything unrecognised under /app goes to this session's own
                landing route rather than 404-ing a signed-in user. */}
            <Route path="*" element={<DefaultRedirect />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
