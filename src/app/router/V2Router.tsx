import { Navigate, Route, Routes, useLocation } from "react-router-dom";
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
import AdminCommandCenterPage from "../../pages/admin/AdminCommandCenterPage";
import AdminCalendarPage from "../../pages/admin/AdminCalendarPage";
import AdminTaskDetailPage from "../../pages/admin/AdminTaskDetailPage";
import AdminDocumentsPage from "../../pages/admin/AdminDocumentsPage";
import { RoleRouteGuard } from "./RoleRouteGuard";
import V2LoginPage from "../../pages/common/V2LoginPage";

const adminPages = ["documents", "reports", "activity", "users", "settings"];
const managerPages = ["home", "projects", "review-queue", "documents"];
const internPages = ["home", "my-quests", "projects", "progress", "achievements", "ranking", "resources"];

function roleStart(role: AppRole): string {
  return role === "ADMIN" ? "/admin" : role === "MANAGER" ? "/manager" : role === "INTERN" ? "/intern" : "/unavailable";
}

function RoleIndex() {
  const { profile, isLoading } = useAuth();
  if (isLoading) return <div className="v2-state">세션을 확인하고 있습니다…</div>;
  return profile ? <Navigate to={roleStart(profile.global_role)} replace /> : <V2LoginPage />;
}

export function V2Router() {
  return <Routes>
    <Route path="/" element={<RoleIndex />} />
    <Route element={<RoleRouteGuard allowedRoles={["ADMIN"]} />}>
      <Route path="/admin" element={<AdminLayout />}><Route index element={<Navigate to="command-center" replace />} /><Route path="command-center" element={<AdminCommandCenterPage />} /><Route path="projects" element={<AdminProjectsPage />} /><Route path="projects/:projectId" element={<AdminProjectDetailPage />} /><Route path="tasks/:taskId" element={<AdminTaskDetailPage />} /><Route path="calendar" element={<AdminCalendarPage />} /><Route path="reviews" element={<AdminReviewQueuePage />} /><Route path="interns" element={<AdminInternsPage />} /><Route path="programs" element={<AdminProgramsPage />} /><Route path="programs/:programId" element={<AdminProgramDetailPage />} /><Route path="documents" element={<AdminDocumentsPage />} /><Route path="review-queue" element={<Navigate to="/admin/reviews" replace />} />{adminPages.filter((page) => page !== "documents").map((page) => <Route key={page} path={page} element={<PlaceholderPage />} />)}<Route path="*" element={<Navigate to="command-center" replace />} /></Route>
    </Route>
    <Route element={<RoleRouteGuard allowedRoles={["MANAGER"]} />}>
      <Route path="/manager" element={<ManagerLayout />}><Route index element={<Navigate to="home" replace />} />{managerPages.map((page) => <Route key={page} path={page} element={<PlaceholderPage />} />)}<Route path="*" element={<Navigate to="home" replace />} /></Route>
    </Route>
    <Route element={<RoleRouteGuard allowedRoles={["INTERN"]} />}>
      <Route path="/intern" element={<InternLayout />}><Route index element={<Navigate to="home" replace />} />{internPages.map((page) => <Route key={page} path={page} element={<PlaceholderPage />} />)}<Route path="*" element={<Navigate to="home" replace />} /></Route>
    </Route>
    <Route path="/unavailable" element={<PlaceholderPage title="Viewer 영역은 준비 중입니다." description="VIEWER 역할의 정보 구조와 권한 범위는 후속 단계에서 정의합니다." />} />
    <Route path="/v2/*" element={<LegacyV2Redirect />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

function LegacyV2Redirect() {
  const location = useLocation();
  const path = location.pathname;
  const destination = path === "/v2" ? "/" : path.startsWith("/v2/admin") ? path.replace(/^\/v2/, "") : path.startsWith("/v2/manager") ? path.replace(/^\/v2/, "") : path.startsWith("/v2/intern") ? path.replace(/^\/v2/, "") : path === "/v2/unavailable" ? "/unavailable" : path.startsWith("/v2/projects/") ? path.replace(/^\/v2/, "/admin") : "/";
  return <Navigate to={`${destination}${location.search}${location.hash}`} replace />;
}
