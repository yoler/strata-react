import { ENV } from "@/app/config/env";
import { request } from "@/shared/api/request";

import type { LoginPayload, LoginResponse } from "./types";

function createDemoUser(username: string): LoginResponse {
  return {
    token: "demo-token",
    user: {
      id: "demo-user",
      name: username,
      email: `${username}@demo.local`
    }
  };
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  if (ENV.enableDemoAuth) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return createDemoUser(payload.username);
  }

  return request.post<LoginResponse, LoginPayload>("/auth/login", payload, {
    skipAuth: true,
    skipCancel: true
  });
}

