import { Navigate, Route, Routes } from "react-router-dom";
import type { AppRole } from "../../services/authService";
import { useAuth } from "../providers/authContext";
import AdminLayout from "../../layouts/AdminLayout";
import ManagerLayout from "../../layouts/ManagerLayout";
import InternLayout from "../../layouts/InternLayout";
import PlaceholderPage from "../../pages/common/PlaceholderPage";
import { RoleRouteGuard } from "./RoleRouteGuard";

const adminPages = ["command-center", "projects", "review-queue", "interns", "programs", "documents", "reports", "activity", "users", "settings"];
const managerPages = ["home", "projects", "review-queue", "documents"];
const internPages = ["home", "my-quests", "projects", "progress", "achievements", "ranking", "resources"];

function roleStart(role: AppRole): string {
  return role === "ADMIN" ? "/v2/admin" : role === "MANAGER" ? "/v2/manager" : role === "INTERN" ? "/v2/intern" : "/v2/unavailable";
}

function RoleIndex() {
  const { profile, isLoading } = useAuth();
  if (isLoading) return <div className="v2-state">V2 세션을 확인하고 있습니다…</div>;
  return <Navigate to={profile ? roleStart(profile.global_role) : "/"} replace />;
}

export function V2Router() {
  return <Routes>
    <Route path="/v2" element={<RoleIndex />} />
    <Route element={<RoleRouteGuard allowedRoles={["ADMIN"]} />}>
      <Route path="/v2/admin" element={<AdminLayout />}><Route index element={<Navigate to="command-center" replace />} />{adminPages.map((page) => <Route key={page} path={page} element={<PlaceholderPage />} />)}<Route path="*" element={<Navigate to="command-center" replace />} /></Route>
    </Route>
    <Route element={<RoleRouteGuard allowedRoles={["MANAGER"]} />}>
      <Route path="/v2/manager" element={<ManagerLayout />}><Route index element={<Navigate to="home" replace />} />{managerPages.map((page) => <Route key={page} path={page} element={<PlaceholderPage />} />)}<Route path="*" element={<Navigate to="home" replace />} /></Route>
    </Route>
    <Route element={<RoleRouteGuard allowedRoles={["INTERN"]} />}>
      <Route path="/v2/intern" element={<InternLayout />}><Route index element={<Navigate to="home" replace />} />{internPages.map((page) => <Route key={page} path={page} element={<PlaceholderPage />} />)}<Route path="*" element={<Navigate to="home" replace />} /></Route>
    </Route>
    <Route path="/v2/unavailable" element={<PlaceholderPage title="V2 Viewer 영역은 준비 중입니다." description="VIEWER 역할의 정보 구조와 권한 범위는 후속 단계에서 정의합니다." />} />
    <Route path="*" element={<Navigate to="/v2" replace />} />
  </Routes>;
}
