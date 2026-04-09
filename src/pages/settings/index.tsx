import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";

import { ENV } from "@/app/config/env";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function SettingsPage() {
  const { i18n, t } = useTranslation();
  const { theme } = useTheme();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.description")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("common.theme")}</CardTitle>
            <CardDescription>{t("settings.currentTheme")}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">{theme ?? "system"}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("common.language")}</CardTitle>
            <CardDescription>{t("settings.currentLanguage")}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">{i18n.language}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>API</CardTitle>
            <CardDescription>{t("settings.apiBaseUrl")}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">{ENV.apiBaseUrl}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Demo Auth</CardTitle>
            <CardDescription>{t("settings.demoAuth")}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">{ENV.enableDemoAuth ? "Enabled" : "Disabled"}</CardContent>
        </Card>
      </div>
    </div>
  );
}

