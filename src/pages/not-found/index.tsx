import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { ROUTE_PATHS } from "@/shared/constants/route-paths";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{t("common.notFound")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to={ROUTE_PATHS.dashboard}>
              <ArrowLeft className="size-4" />
              {t("common.backToDashboard")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default NotFoundPage;

