import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { ENV } from "@/shared/config/env";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import { storage } from "@/shared/lib/storage";

const localeModules = import.meta.glob("../../locales/*/*.ts", { eager: true }) as Record<
  string,
  { default: Record<string, unknown> }
>;

function buildResources() {
  const resources: Record<string, { translation: Record<string, unknown> }> = {};

  for (const [filePath, module] of Object.entries(localeModules)) {
    const match = filePath.match(/locales\/([^/]+)\/([^/]+)\.ts$/);
    if (!match) continue;

    const [, locale, namespace] = match;

    if (!resources[locale]) {
      resources[locale] = { translation: {} };
    }

    resources[locale].translation[namespace] = module.default;
  }

  return resources;
}

const RESOURCES = buildResources();
const SUPPORTED_LOCALES = Object.keys(RESOURCES) as string[];

type AppLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(locale: string): locale is AppLocale {
  return SUPPORTED_LOCALES.includes(locale as AppLocale);
}

function resolveInitialLocale(): AppLocale {
  const savedLocale = storage.get<string>(STORAGE_KEYS.locale, "");
  if (isSupportedLocale(savedLocale)) {
    return savedLocale;
  }

  if (typeof navigator !== "undefined" && isSupportedLocale(navigator.language)) {
    return navigator.language;
  }

  if (isSupportedLocale(ENV.defaultLocale)) {
    return ENV.defaultLocale;
  }

  return "zh-CN";
}

void i18n.use(initReactI18next).init({
  lng: resolveInitialLocale(),
  fallbackLng: ENV.defaultLocale,
  supportedLngs: SUPPORTED_LOCALES,
  resources: RESOURCES,
  interpolation: {
    escapeValue: false
  }
});

i18n.on("languageChanged", (locale) => {
  if (isSupportedLocale(locale)) {
    storage.set(STORAGE_KEYS.locale, locale);
  }
});

export { i18n };
