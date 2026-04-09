import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export function RouteLoading() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-[280px] items-center justify-center py-10">
      <div className="text-muted-foreground flex flex-col items-center gap-3 text-sm">
        <LoaderCircle className="text-primary size-5 animate-spin" />
        <span>{t("common.loading")}</span>
      </div>
    </div>
  );
}
