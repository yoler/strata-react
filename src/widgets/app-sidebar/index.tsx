import { LayoutDashboard, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { useUiStore } from "@/app/store";
import { ROUTE_PATHS } from "@/shared/constants/route-paths";
import { cn } from "@/shared/lib/utils";

const navItems = [
  { to: ROUTE_PATHS.dashboard, icon: LayoutDashboard, key: "common.dashboard" },
  { to: ROUTE_PATHS.settings, icon: Settings2, key: "common.settings" }
] as const;

export function AppSidebar() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const { t } = useTranslation();

  return (
    <aside
      className={cn(
        "bg-[var(--sidebar)] border-[var(--sidebar-border)] shrink-0 border-r transition-all duration-200",
        collapsed ? "w-[88px]" : "w-[272px]"
      )}
    >
      <div className="flex h-16 items-center gap-3 px-5">
        <img src="/strata-mark.svg" alt="Strata React" className="size-9 shrink-0 rounded-lg" />
        {!collapsed && (
          <div>
            <div className="text-sm font-semibold tracking-tight">Strata React</div>
          </div>
        )}
      </div>

      <div className="px-4 pt-2 pb-4">
        {!collapsed && (
          <div className="mb-4">
            <button className="bg-primary text-primary-foreground flex h-9 w-full items-center rounded-md px-3 text-sm font-medium">
              Quick Create
            </button>
          </div>
        )}
        {!collapsed && <div className="text-muted-foreground mb-2 px-2 text-xs">Workspace</div>}
        <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground font-medium"
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span>{t(item.key)}</span>}
            </NavLink>
          );
        })}
        </nav>
      </div>
    </aside>
  );
}

