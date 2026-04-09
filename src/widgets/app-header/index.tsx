import { Menu, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useUiStore } from "@/app/store";
import { useAuthStore } from "@/modules/auth/store";
import { Button } from "@/shared/ui/button";
import { LanguageSwitcher } from "@/widgets/language-switcher";
import { ThemeToggle } from "@/widgets/theme-toggle";

export function AppHeader() {
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation();

  return (
    <header className="bg-background sticky top-0 z-40 border-b">
      <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-8" onClick={toggleSidebar}>
            <Menu className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="text-primary size-4" />
              Documents
            </div>
            <div className="text-muted-foreground text-xs">{user?.email ?? "demo@local.dev"}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button variant="ghost" onClick={logout}>
            {t("common.logout")}
          </Button>
        </div>
      </div>
    </header>
  );
}

