import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { DEFAULT_ROUTE_BY_ROLE } from "../config/sidebarConfig";
import { UserRole } from "../types/auth.types";
import { LoadingScreen } from "../components/common/Feedback";

/** Gate 1: must have a valid session, verified via GET /auth/me on app boot. */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const location = useLocation();

  // Why: cookies are httpOnly — on a hard refresh we don't know yet if the
  // session is still valid until /auth/me resolves. Show a loader instead
  // of bouncing to /login and immediately back.
  if (isInitializing) return <LoadingScreen label="Checking your session..." />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

  return <Outlet />;
}

/** Gate 2: must hold one of the allowed roles. Always nested under ProtectedRoute. */
export function RoleRoute({ allowedRoles }: { allowedRoles: UserRole[] }) {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
}

/** "/" has no inherent meaning across 5 roles — bounce to the right dashboard. */
export function RoleIndexRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={DEFAULT_ROUTE_BY_ROLE[user.role]} replace />;
}
