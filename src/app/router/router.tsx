import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppLayout } from "@/app/layouts/app-layout";
import { AuthLayout } from "@/app/layouts/auth-layout";
import { DashboardPage } from "@/pages/dashboard";
import { LoginPage } from "@/pages/login";
import { NotFoundPage } from "@/pages/not-found";
import { SettingsPage } from "@/pages/settings";
import { ROUTE_PATHS } from "@/shared/constants/route-paths";

import { ProtectedRoute } from "./guards";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: ROUTE_PATHS.login,
        element: <LoginPage />
      }
    ]
  },
  {
    element: <ProtectedRoute />,
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
            element: <DashboardPage />
          },
          {
            path: ROUTE_PATHS.settings,
            element: <SettingsPage />
          }
        ]
      }
    ]
  },
  {
    path: "*",
    element: <NotFoundPage />
  }
]);

