import { ArrowUpRight, Globe2, MoonStar, Network, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ROUTE_PATHS } from "@/shared/constants/route-paths";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

const iconMap = [Network, Workflow, Globe2, MoonStar];

export function DashboardPage() {
  const { t } = useTranslation();

  const cards = [
    t("dashboard.cards.request"),
    t("dashboard.cards.state"),
    t("dashboard.cards.i18n"),
    t("dashboard.cards.theme")
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge variant="secondary">{t("common.quickStart")}</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground max-w-3xl leading-7">{t("dashboard.description")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((title, index) => {
          const Icon = iconMap[index];
          return (
            <Card key={title} className="shadow-sm">
              <CardHeader className="space-y-4">
                <div className="bg-muted text-foreground flex size-10 items-center justify-center rounded-md">
                  <Icon className="size-5" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription>{t("dashboard.readyDescription")}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t("dashboard.starterTitle")}</CardTitle>
          <CardDescription>{t("dashboard.starterDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to={ROUTE_PATHS.settings}>
              {t("common.viewSettings")}
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a href="https://ui.shadcn.com/docs" target="_blank" rel="noreferrer">
              shadcn/ui Docs
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
