import { create } from "zustand";
import { persist } from "zustand/middleware";

import { STORAGE_KEYS } from "@/shared/constants/storage-keys";

import type { AuthUser, LoginResponse } from "./types";

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setSession: (result: LoginResponse) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setSession: (result) =>
        set({
          token: result.token,
          user: result.user,
          isAuthenticated: true
        }),
      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false
        })
    }),
    {
      name: STORAGE_KEYS.authStore
    }
  )
);

