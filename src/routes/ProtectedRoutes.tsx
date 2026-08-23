import { Navigate } from "react-router-dom";

import { useAppSelector } from "@/store/hooks";
import { canAccess, defaultRouteFor } from "@/config/navigation";

type Props = {
  children: React.ReactNode;
  /**
   * Nav path this route corresponds to (e.g. "billing", "shop"). When given,
   * access is decided by config/navigation.ts — the same table that builds the
   * nav — so a session can never be shown a tab it can't open, or blocked from
   * one it can see. Omit for a route that only needs a signed-in user.
   */
  navPath?: string;
};

export default function ProtectedRoute({ children, navPath }: Props) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!navPath) return children;

  if (!canAccess(user, navPath)) {
    // Sent to wherever this session's nav actually starts rather than a
    // hardcoded /app/billing — a kitchen device has no billing tab, so the old
    // fixed redirect bounced it to a screen it would immediately be redirected
    // away from again.
    return <Navigate to={defaultRouteFor(user)} replace />;
  }

  return children;
}
