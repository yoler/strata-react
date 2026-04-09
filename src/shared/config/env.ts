export const ENV = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "/api",
  enableDemoAuth: (import.meta.env.VITE_ENABLE_DEMO_AUTH ?? "true") === "true",
  defaultLocale: import.meta.env.VITE_DEFAULT_LOCALE ?? "zh-CN"
} as const;
