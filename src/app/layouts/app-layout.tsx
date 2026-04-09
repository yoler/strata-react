import { Outlet } from "react-router-dom";

import { AppHeader } from "@/widgets/app-header";
import { AppSidebar } from "@/widgets/app-sidebar";

export function AppLayout() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <AppSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

