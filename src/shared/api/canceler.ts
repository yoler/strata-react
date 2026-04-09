import type { AxiosRequestConfig } from "axios";
import hashSum from "hash-sum";

function getRequestKey(config: AxiosRequestConfig) {
  const { data, method, params, url } = config;
  return hashSum({
    data,
    method: method?.toUpperCase(),
    params,
    url
  });
}

class RequestCanceler {
  private pendingMap = new Map<string, AbortController>();

  addPending(config: AxiosRequestConfig) {
    const requestKey = getRequestKey(config);

    if (this.pendingMap.has(requestKey)) {
      this.pendingMap.get(requestKey)?.abort();
      this.pendingMap.delete(requestKey);
    }

    const controller = new AbortController();
    config.signal = controller.signal;
    this.pendingMap.set(requestKey, controller);
  }

  removePending(config?: AxiosRequestConfig) {
    if (!config) return;
    const requestKey = getRequestKey(config);
    this.pendingMap.delete(requestKey);
  }

  clearPending() {
    this.pendingMap.forEach((controller) => controller.abort());
    this.pendingMap.clear();
  }
}

export const requestCanceler = new RequestCanceler();
