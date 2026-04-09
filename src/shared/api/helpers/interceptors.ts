import type { InternalAxiosRequestConfig } from "axios";

import { i18n } from "@/app/i18n";
import { useAuthStore } from "@/modules/auth/store";

export function injectToken(config: InternalAxiosRequestConfig) {
  const token = useAuthStore.getState().token;

  if (token && config.headers && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}

export function injectClientInfo(config: InternalAxiosRequestConfig) {
  if (config.headers) {
    config.headers.Accept = config.headers.Accept ?? "application/json";
    config.headers["Accept-Language"] = i18n.language;
    config.headers["Client-Version"] = import.meta.env.VITE_APP_VERSION ?? "1.0.0";
  }

  return config;
}
