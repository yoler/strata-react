import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="bg-muted/40 min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center p-6">
        <Outlet />
      </div>
    </div>
  );
}

