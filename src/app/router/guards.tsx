import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthStore } from "@/modules/auth/store";
import { ROUTE_PATHS } from "@/shared/constants/route-paths";

export function GuestRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.dashboard} replace />;
  }

  return <Outlet />;
}

export function ProtectedRoute() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.login} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

