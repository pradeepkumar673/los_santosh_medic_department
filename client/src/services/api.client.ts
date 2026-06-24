import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // http://localhost:5000/api
  withCredentials: true, // sends/receives the httpOnly accessToken & refreshToken cookies
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthEndpoint = ["/auth/login", "/auth/register", "/auth/refresh"].some((p) =>
      originalRequest?.url?.includes(p)
    );

    // Why: a 401 mid-session means the access token expired. We attempt ONE
    // silent refresh (matches the backend's rotation logic) and replay the
    // original request instead of forcing a re-login on every page.
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingQueue.push(() => resolve(apiClient(originalRequest)));
        });
      }

      isRefreshing = true;
      try {
        await apiClient.post("/auth/refresh");
        pendingQueue.forEach((retry) => retry());
        pendingQueue = [];
        return apiClient(originalRequest);
      } catch (refreshError) {
        pendingQueue = [];
        // Dynamic import avoids a circular import with authStore.ts
        const { useAuthStore } = await import("../store/authStore");
        useAuthStore.getState().forceLogout();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
