import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { login } from "./api";
import { useAuthStore } from "./store";
import type { LoginPayload } from "./types";

export function useLoginMutation() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: (result) => {
      setSession(result);
      toast.success("登录成功");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "登录失败";
      toast.error(message);
    }
  });
}
