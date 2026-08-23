import { Navigate, Outlet } from "react-router-dom";
import type { AppRole } from "../../services/authService";
import { useAuth } from "../providers/authContext";

const roleHome: Record<AppRole, string> = {
  ADMIN: "/admin",
  MANAGER: "/manager",
  INTERN: "/intern",
  VIEWER: "/unavailable",
};

export function RoleRouteGuard({ allowedRoles }: { allowedRoles: AppRole[] }) {
  const { profile, isLoading } = useAuth();
  if (isLoading) return <div className="v2-state">세션을 확인하고 있습니다…</div>;
  if (!profile) return <Navigate to="/" replace />;
  if (!allowedRoles.includes(profile.global_role)) return <Navigate to={roleHome[profile.global_role]} replace />;
  return <Outlet />;
}
