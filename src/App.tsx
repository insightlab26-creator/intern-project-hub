import { useEffect, useState, type FormEvent } from "react";
import { Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import InternsPage from "./pages/InternsPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import TasksPage from "./pages/TasksPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import ProgramsPage from "./pages/ProgramsPage";
import ProgramDetailPage from "./pages/ProgramDetailPage";
import DocumentsPage from "./pages/DocumentsPage";
import UsersPage from "./pages/UsersPage";
import InternReviewsPage from "./pages/InternReviewsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import DashboardPage from "./pages/DashboardPage";
import CalendarPage from "./pages/CalendarPage";
import DataCleanupPage from "./pages/DataCleanupPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import GlobalSearchPage from "./pages/GlobalSearchPage";
import ReportsPage from "./pages/ReportsPage";
import ScreenState from "./components/ScreenState";
import PasswordToggle from "./components/PasswordToggle";
import { getCurrentSession, getUserProfile, signIn, signOut, type UserProfile } from "./services/authService";
import "./App.css";

const menuGroups = [
  { items: [{ name: "Dashboard", path: "/" }, { name: "Search", path: "/search" }, { name: "Reports", path: "/reports" }] },
  { title: "CONTROL TOWER", items: [{ name: "Projects", path: "/projects" }, { name: "Work Packages", path: "/tasks" }, { name: "Calendar", path: "/calendar" }] },
  { title: "KNOWLEDGE", items: [{ name: "Documents", path: "/documents" }] },
  { title: "OPERATIONS", items: [{ name: "Programs", path: "/programs" }, { name: "Interns", path: "/interns" }, { name: "Intern Reviews", path: "/intern-reviews" }] },
  { title: "SYSTEM", items: [{ name: "Users", path: "/users" }, { name: "Audit Logs", path: "/audit-logs" }] },
];

export default function App() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); const [signingIn, setSigningIn] = useState(false);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [showPassword, setShowPassword] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { let mounted = true; void (async () => { await Promise.resolve(); try { const session = await getCurrentSession(); if (!session) return; const p = await getUserProfile(session.user.id); if (p.status !== "ACTIVE") { await signOut(); setMessage("비활성화된 계정입니다."); return; } if (mounted) setProfile(p); } catch { if (mounted) setMessage("사용자 로그인 정보를 불러오지 못했습니다."); } finally { if (mounted) setLoading(false); } })(); return () => { mounted = false; }; }, []);
  const login = async (e: FormEvent) => { e.preventDefault(); try { setSigningIn(true); setMessage(""); const session = await signIn(email, password); const p = await getUserProfile(session.user.id); if (p.status !== "ACTIVE") { await signOut(); throw new Error("비활성화된 계정입니다."); } setProfile(p); setPassword(""); navigate("/"); } catch (err) { setMessage(err instanceof Error && err.message.includes("비활성화") ? err.message : "로그인에 실패했습니다."); } finally { setSigningIn(false); } };
  const logout = async () => { await Promise.resolve(); try { await signOut(); } finally { setProfile(null); setEmail(""); setPassword(""); navigate("/"); } };
  if (window.location.pathname === "/reset-password") return <ResetPasswordPage />;
  if (loading) return <div className="loading-page"><p>사용자 정보를 확인하고 있습니다...</p></div>;
  if (!profile) return <div className="login-page"><form className="login-card" onSubmit={login}><h1>Intern Project Hub</h1><p className="subtitle">프로젝트와 업무를 연결하고 지식을 축적합니다.</p><label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Password<span className="password-field"><input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} /><PasswordToggle visible={showPassword} onToggle={() => setShowPassword((current) => !current)} /></span></label><button className="login-button" disabled={signingIn}>{signingIn ? "로그인 중..." : "로그인"}</button>{message && <p className="message">{message}</p>}</form></div>;
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><img className="brand-logo" src="/bx-intern-logo.png" alt="BX Intern" /><strong>BX Intern Idea Lab</strong></div>
      <nav className="sidebar-nav">{profile.global_role === "ADMIN" && menuGroups.map((group, index) => <div className={group.title ? "menu-group menu-group-nested" : "menu-group"} key={index}>{group.title && <p className="menu-title">{group.title}</p>}{group.items.map((item) => <NavLink key={item.path} end={item.path === "/"} className={({ isActive }) => isActive ? "menu-button active" : "menu-button"} to={item.path}><span>{item.name}</span></NavLink>)}</div>)}</nav>
    </aside>
    <div className="workspace">
      <header className="app-topbar">
        <div className="topbar-user"><span className="topbar-avatar">{profile.display_name.slice(0, 1)}</span><div><strong>{profile.display_name}</strong><span>{profile.global_role}</span></div></div>
        <button className="topbar-logout" onClick={logout}>로그아웃</button>
      </header>
      <main className="main-content">{profile.global_role !== "ADMIN" ? <ScreenState kind="empty" title="접근 가능한 기능이 없습니다." /> : <Routes><Route path="/" element={<DashboardPage profile={profile} />} /><Route path="/search" element={<GlobalSearchPage />} /><Route path="/reports" element={<ReportsPage />} /><Route path="/projects" element={<ProjectsPage />} /><Route path="/projects/:projectId" element={<ProjectDetailPage />} /><Route path="/tasks" element={<TasksPage />} /><Route path="/tasks/review" element={<TasksPage reviewOnly />} /><Route path="/tasks/:taskId" element={<TaskDetailPage />} /><Route path="/calendar" element={<CalendarPage />} /><Route path="/plan-import" element={<Navigate to="/projects" replace />} /><Route path="/programs" element={<ProgramsPage />} /><Route path="/programs/:programId" element={<ProgramDetailPage />} /><Route path="/interns" element={<InternsPage />} /><Route path="/intern-reviews" element={<InternReviewsPage />} /><Route path="/kpis" element={<Navigate to="/projects" replace />} /><Route path="/documents" element={<DocumentsPage />} /><Route path="/resources" element={<Navigate to="/documents" replace />} /><Route path="/deliverables" element={<Navigate to="/documents" replace />} /><Route path="/decisions" element={<Navigate to="/projects" replace />} /><Route path="/manager-notes" element={<Navigate to="/" replace />} /><Route path="/users" element={<UsersPage />} /><Route path="/audit-logs" element={<AuditLogsPage />} /><Route path="/data-cleanup" element={<DataCleanupPage />} /><Route path="/:placeholder" element={<Placeholder />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>}</main>
    </div>
  </div>;
}

function Placeholder() { return <ScreenState kind="empty" title="준비 중인 기능입니다." description="다음 단계에서 연결합니다." />; }
