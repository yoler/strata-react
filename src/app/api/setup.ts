import type { InternalAxiosRequestConfig } from "axios";

import { i18n } from "@/app/i18n";
import { useAuthStore } from "@/modules/auth/store";
import { requestCanceler } from "@/shared/api/canceler";
import { http, type CustomAxiosRequestConfig } from "@/shared/api/client";
import { ApiError } from "@/shared/api/error";

let isApiSetupCompleted = false;

function injectRuntimeHeaders(config: InternalAxiosRequestConfig) {
  if (!config.headers) {
    return config;
  }

  config.headers.Accept = config.headers.Accept ?? "application/json";
  config.headers["Accept-Language"] = i18n.language;
  config.headers["Client-Version"] = import.meta.env.VITE_APP_VERSION ?? "1.0.0";

  return config;
}

function injectAuthToken(config: InternalAxiosRequestConfig) {
  const token = useAuthStore.getState().token;

  if (token && config.headers && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}

function setupApi() {
  if (isApiSetupCompleted) {
    return;
  }

  isApiSetupCompleted = true;

  http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const customConfig = config as CustomAxiosRequestConfig & InternalAxiosRequestConfig;

    injectRuntimeHeaders(config);

    if (!customConfig.skipAuth) {
      injectAuthToken(config);
    }

    return config;
  });

  http.interceptors.response.use(undefined, (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      requestCanceler.clearPending();
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  });
}

setupApi();
