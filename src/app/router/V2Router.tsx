import { Navigate, Route, Routes, useParams } from "react-router-dom";
import type { AppRole } from "../../services/authService";
import { useAuth } from "../providers/authContext";
import AdminLayout from "../../layouts/AdminLayout";
import ManagerLayout from "../../layouts/ManagerLayout";
import InternLayout from "../../layouts/InternLayout";
import PlaceholderPage from "../../pages/common/PlaceholderPage";
import AdminProjectsPage from "../../pages/admin/AdminProjectsPage";
import AdminProjectDetailPage from "../../pages/admin/AdminProjectDetailPage";
import AdminReviewQueuePage from "../../pages/admin/AdminReviewQueuePage";
import AdminInternsPage from "../../pages/admin/AdminInternsPage";
import AdminProgramsPage from "../../pages/admin/AdminProgramsPage";
import AdminProgramDetailPage from "../../pages/admin/AdminProgramDetailPage";
import { RoleRouteGuard } from "./RoleRouteGuard";

const adminPages = ["command-center", "documents", "reports", "activity", "users", "settings"];
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
      <Route path="/v2/admin" element={<AdminLayout />}><Route index element={<Navigate to="command-center" replace />} /><Route path="projects" element={<AdminProjectsPage />} /><Route path="projects/:projectId" element={<AdminProjectDetailPage />} /><Route path="reviews" element={<AdminReviewQueuePage />} /><Route path="interns" element={<AdminInternsPage />} /><Route path="programs" element={<AdminProgramsPage />} /><Route path="programs/:programId" element={<AdminProgramDetailPage />} /><Route path="review-queue" element={<Navigate to="/v2/admin/reviews" replace />} />{adminPages.map((page) => <Route key={page} path={page} element={<PlaceholderPage />} />)}<Route path="*" element={<Navigate to="command-center" replace />} /></Route>
      <Route path="/v2/projects/:projectId" element={<LegacyProjectDetailRedirect />} />
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

function LegacyProjectDetailRedirect() {
  const { projectId = "" } = useParams();
  return <Navigate to={`/v2/admin/projects/${projectId}`} replace />;
}
