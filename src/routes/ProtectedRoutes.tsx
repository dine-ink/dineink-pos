import { Navigate } from "react-router-dom";

import { useAppSelector } from "@/store/hooks";

type Props = {
  children: React.ReactNode;
  allowedDepartments?: string[];
  allowedRoles?: string[];
};

export default function ProtectedRoute({
  children,
  allowedDepartments,
  allowedRoles,
}: Props) {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  if (!isAuthenticated) return <Navigate to="/" replace />;

  // MANAGER has unrestricted access to everything
  if (user?.role === "MANAGER") return children;

  // No restrictions defined — pure auth-only route, pass through
  if (!allowedDepartments && !allowedRoles) return children;

  // KITCHEN dept can only access routes that explicitly allow KITCHEN
  if (
    user?.department === "KITCHEN" &&
    !allowedDepartments?.includes("KITCHEN")
  ) {
    return <Navigate to="/app/kitchen" replace />;
  }

  // Department restriction
  if (
    allowedDepartments &&
    !allowedDepartments.includes(user?.department || "")
  ) {
    return <Navigate to="/app/billing" replace />;
  }

  // Role restriction
  if (allowedRoles && !allowedRoles.includes(user?.role || "")) {
    return <Navigate to="/app/billing" replace />;
  }

  return children;
}
