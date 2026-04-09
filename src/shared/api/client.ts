import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig
} from "axios";

import { ENV } from "@/app/config/env";
import { useAuthStore } from "@/modules/auth/store";

import { normalizeApiError } from "./error";
import { requestCanceler } from "./helpers/canceler";
import { injectClientInfo, injectToken } from "./helpers/interceptors";

export interface CustomAxiosRequestConfig<TData = unknown> extends AxiosRequestConfig<TData> {
  skipAuth?: boolean;
  skipCancel?: boolean;
}

const defaultConfig: AxiosRequestConfig = {
  baseURL: ENV.apiBaseUrl,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json"
  }
};

export const http = axios.create(defaultConfig);

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const customConfig = config as CustomAxiosRequestConfig & InternalAxiosRequestConfig;

    injectClientInfo(config);

    if (!customConfig.skipAuth) {
      injectToken(config);
    }

    if (!customConfig.skipCancel && !config.signal) {
      requestCanceler.addPending(config);
    }

    return config;
  },
  (error) => Promise.reject(normalizeApiError(error))
);

http.interceptors.response.use(
  (response) => {
    requestCanceler.removePending(response.config);
    return response.data;
  },
  (error: AxiosError) => {
    requestCanceler.removePending(error.config);

    if (error.response?.status === 401) {
      requestCanceler.clearPending();
      useAuthStore.getState().logout();
    }

    return Promise.reject(normalizeApiError(error));
  }
);

