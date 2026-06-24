import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { socketService } from "../services/socket.service";

/** Opens the one shared socket once authenticated, tears it down on logout. */
export function useSocketLifecycle() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) socketService.connect();
    else socketService.disconnect();
    return () => socketService.disconnect();
  }, [isAuthenticated]);
}
