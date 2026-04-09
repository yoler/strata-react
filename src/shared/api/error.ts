import axios from "axios";

type ApiErrorOptions = {
  code?: string;
  details?: unknown;
  isCanceled?: boolean;
  isNetworkError?: boolean;
  responseData?: unknown;
  status?: number;
};

export class ApiError extends Error {
  code?: string;
  details?: unknown;
  isCanceled: boolean;
  isNetworkError: boolean;
  responseData?: unknown;
  status?: number;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = "ApiError";
    this.code = options.code;
    this.details = options.details;
    this.isCanceled = options.isCanceled ?? false;
    this.isNetworkError = options.isNetworkError ?? false;
    this.responseData = options.responseData;
    this.status = options.status;
  }
}

function resolveErrorMessage(status?: number, data?: unknown) {
  if (typeof data === "object" && data !== null) {
    const message = Reflect.get(data, "message");
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  switch (status) {
    case 400:
      return "请求参数错误";
    case 401:
      return "登录状态已失效";
    case 403:
      return "没有权限执行该操作";
    case 404:
      return "请求的资源不存在";
    case 408:
      return "请求超时";
    case 429:
      return "请求过于频繁，请稍后重试";
    case 500:
      return "服务器开小差了，请稍后重试";
    default:
      return "请求失败，请稍后重试";
  }
}

export function normalizeApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isCancel(error)) {
    return new ApiError("请求已取消", {
      code: "REQUEST_CANCELED",
      isCanceled: true
    });
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const responseData = error.response?.data;

    return new ApiError(resolveErrorMessage(status, responseData), {
      code: error.code,
      details: responseData,
      isCanceled: error.code === "ERR_CANCELED",
      isNetworkError: !error.response,
      responseData,
      status
    });
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError("发生未知请求错误");
}
