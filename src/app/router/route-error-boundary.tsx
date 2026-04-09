import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useRouteError } from "react-router-dom";

import { ROUTE_PATHS } from "@/shared/constants/route-paths";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

function resolveErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return null;
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  const { t } = useTranslation();
  const errorMessage = resolveErrorMessage(error);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3">
          <div className="bg-muted flex size-10 items-center justify-center rounded-md">
            <AlertTriangle className="text-foreground size-5" />
          </div>
          <div className="space-y-1">
            <CardTitle>{t("common.routeErrorTitle")}</CardTitle>
            <CardDescription>{t("common.routeErrorDescription")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm">
              {errorMessage}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={() => window.location.reload()}>
              <RotateCcw className="size-4" />
              {t("common.reloadPage")}
            </Button>
            <Button asChild>
              <Link to={ROUTE_PATHS.dashboard}>
                <ArrowLeft className="size-4" />
                {t("common.backToDashboard")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
