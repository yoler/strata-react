import { Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/shared/ui/dropdown-menu";

const LOCALES = [
  { key: "zh-CN", label: "Simplified Chinese" },
  { key: "en-US", label: "English" }
] as const;

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="size-9 rounded-md" aria-label={t("common.language")}>
          <Globe2 className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((locale) => (
          <DropdownMenuItem key={locale.key} onClick={() => void i18n.changeLanguage(locale.key)}>
            {locale.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
