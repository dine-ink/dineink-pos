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

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  const fallback =
    user?.department === "KITCHEN" ? "/app/kitchen" : "/app/billing";

  if (
    allowedDepartments &&
    !allowedDepartments.includes(user?.department || "")
  ) {
    return <Navigate to={fallback} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role || "")) {
    return <Navigate to={fallback} replace />;
  }

  return children;
}
