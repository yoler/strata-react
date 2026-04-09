import { z } from "zod";

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().default("/api"),
  VITE_DEFAULT_LOCALE: z.string().default("zh-CN"),
  VITE_ENABLE_DEMO_AUTH: z.enum(["true", "false"]).default("true")
});

const parsedEnv = envSchema.parse(import.meta.env);

export const ENV = {
  apiBaseUrl: parsedEnv.VITE_API_BASE_URL,
  defaultLocale: parsedEnv.VITE_DEFAULT_LOCALE,
  enableDemoAuth: parsedEnv.VITE_ENABLE_DEMO_AUTH === "true"
} as const;
