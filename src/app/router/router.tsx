import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppLayout } from "@/app/layouts/app-layout";
import { AuthLayout } from "@/app/layouts/auth-layout";
import { ROUTE_PATHS } from "@/shared/constants/route-paths";

import { GuestRoute, ProtectedRoute } from "./guards";
import {
  DashboardRoutePage,
  LoginRoutePage,
  NotFoundRoutePage,
  SettingsRoutePage
} from "./lazy-routes";
import { RouteErrorBoundary } from "./route-error-boundary";

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: ROUTE_PATHS.login,
            element: <LoginRoutePage />
          }
        ]
      }
    ]
  },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: ROUTE_PATHS.root,
            element: <Navigate to={ROUTE_PATHS.dashboard} replace />
          },
          {
            path: ROUTE_PATHS.dashboard,
            element: <DashboardRoutePage />
          },
          {
            path: ROUTE_PATHS.settings,
            element: <SettingsRoutePage />
          }
        ]
      }
    ]
  },
  {
    path: "*",
    element: <NotFoundRoutePage />
  }
]);

