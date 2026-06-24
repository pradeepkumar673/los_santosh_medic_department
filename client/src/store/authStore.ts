import { create } from "zustand";
import { devtools } from "zustand/middleware";
import apiClient from "../services/api.client";
import { AuthUser, LoginPayload } from "../types/auth.types";

interface AuthState {
  user: AuthUser | null;
  profile: Record<string, unknown> | null;
  isAuthenticated: boolean;
  isInitializing: boolean; // true while /auth/me is checked on app boot
  isLoading: boolean;      // true during login/register requests
  error: string | null;

  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  forceLogout: () => void; // sync, no API call — used by the axios interceptor
  fetchCurrentUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      profile: null,
      isAuthenticated: false,
      isInitializing: true,
      isLoading: false,
      error: null,

      login: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await apiClient.post("/auth/login", payload);
          set({ user: data.data, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          set({ error: err.response?.data?.message || "Login failed.", isLoading: false });
          throw err;
        }
      },

      register: async (payload) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await apiClient.post("/auth/register", payload);
          set({ user: data.data, isAuthenticated: true, isLoading: false });
        } catch (err: any) {
          set({ error: err.response?.data?.message || "Registration failed.", isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await apiClient.post("/auth/logout");
        } finally {
          set({ user: null, profile: null, isAuthenticated: false });
        }
      },

      forceLogout: () => set({ user: null, profile: null, isAuthenticated: false }),

      fetchCurrentUser: async () => {
        set({ isInitializing: true });
        try {
          const { data } = await apiClient.get("/auth/me");
          set({
            user: data.data.user,
            profile: data.data.profile,
            isAuthenticated: true,
            isInitializing: false,
          });
        } catch (err) {
          set({ user: null, profile: null, isAuthenticated: false, isInitializing: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    { name: "auth-store" }
  )
);
