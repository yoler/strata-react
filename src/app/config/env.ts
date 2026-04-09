export const APP_NAME = "React Frontend Template";
export const APP_DESCRIPTION = "一个可直接上手开发业务的 React 前端模板";

export const ENV = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api",
  enableDemoAuth: (import.meta.env.VITE_ENABLE_DEMO_AUTH ?? "true") === "true",
  defaultLocale: import.meta.env.VITE_DEFAULT_LOCALE ?? "zh-CN"
} as const;

