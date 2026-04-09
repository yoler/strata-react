import { lazy, Suspense, type ReactNode } from "react";

import { RouteLoading } from "./route-loading";

const DashboardPage = lazy(() => import("@/pages/dashboard"));
const LoginPage = lazy(() => import("@/pages/login"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));
const SettingsPage = lazy(() => import("@/pages/settings"));

function withRouteSuspense(node: ReactNode) {
  return <Suspense fallback={<RouteLoading />}>{node}</Suspense>;
}

export function DashboardRoutePage() {
  return withRouteSuspense(<DashboardPage />);
}

export function LoginRoutePage() {
  return withRouteSuspense(<LoginPage />);
}

export function NotFoundRoutePage() {
  return withRouteSuspense(<NotFoundPage />);
}

export function SettingsRoutePage() {
  return withRouteSuspense(<SettingsPage />);
}
