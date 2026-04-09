import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(6, "密码至少 6 位")
});

export type LoginFormValues = z.infer<typeof loginSchema>;

