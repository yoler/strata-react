import { http } from "./client";
export const request = {
  get: <TResponse>(
    url: string,
    params?: Record<string, unknown>,
    config?: import("./client").CustomAxiosRequestConfig
  ) => http.get<TResponse, TResponse>(url, { ...config, params }),
  post: <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: import("./client").CustomAxiosRequestConfig<TBody>
  ) => http.post<TResponse, TResponse, TBody>(url, body, config),
  put: <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: import("./client").CustomAxiosRequestConfig<TBody>
  ) => http.put<TResponse, TResponse, TBody>(url, body, config),
  patch: <TResponse, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: import("./client").CustomAxiosRequestConfig<TBody>
  ) => http.patch<TResponse, TResponse, TBody>(url, body, config),
  delete: <TResponse>(
    url: string,
    params?: Record<string, unknown>,
    config?: import("./client").CustomAxiosRequestConfig
  ) => http.delete<TResponse, TResponse>(url, { ...config, params }),
  upload: <TResponse>(
    url: string,
    formData: FormData,
    config?: import("./client").CustomAxiosRequestConfig<FormData>
  ) =>
    http.post<TResponse, TResponse, FormData>(url, formData, {
      ...config,
      headers: {
        "Content-Type": "multipart/form-data",
        ...config?.headers
      }
    }),
  download: (
    url: string,
    params?: Record<string, unknown>,
    config?: import("./client").CustomAxiosRequestConfig
  ) =>
    http.get<Blob, Blob>(url, {
      ...config,
      params,
      responseType: "blob"
    })
};

