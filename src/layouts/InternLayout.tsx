import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/authContext";
import { useInternLocale } from "../i18n/internLocale";

const items = [["nav.home", "home"], ["nav.tasks", "tasks"], ["nav.projects", "projects"], ["nav.progress", "progress"], ["nav.resources", "resources"]] as const;

export default function InternLayout() {
  return <InternLayoutContent />;
}

function InternLayoutContent() {
  const { profile, signOutCurrentUser } = useAuth(); const navigate = useNavigate(); const name = profile?.display_name ?? "Intern";
  const { locale, setLocale, t } = useInternLocale();
  const signOut = async () => { await signOutCurrentUser(); navigate("/"); };
  return <div className="v2-shell v2-intern-shell"><aside className="v2-intern-sidebar"><div><div className="v2-intern-sidebar__brand">INTERN PROJECT HUB</div><nav aria-label="Intern navigation">{items.map(([key, path]) => { const label = t(key); return <NavLink key={path} to={`/intern/${path}`} className={({ isActive }) => isActive ? "active" : ""}><MenuIcon path={path} /><span>{label}</span></NavLink>; })}</nav></div><section className="v2-intern-sidebar__account" aria-label={locale === "ko" ? "계정 메뉴" : "Account menu"}><div className="v2-intern-sidebar__language"><span>{locale === "ko" ? "언어" : "Language"}</span><div className="v2-intern-locale" role="group" aria-label={locale === "ko" ? "언어 변경" : "Change language"}><button type="button" className={locale === "ko" ? "active" : ""} aria-pressed={locale === "ko"} onClick={() => setLocale("ko")}>한국어</button><button type="button" className={locale === "en" ? "active" : ""} aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</button></div></div><div className="v2-intern-sidebar__profile"><span className="v2-intern-sidebar__avatar">{name.slice(0, 1).toUpperCase()}</span><div className="v2-intern-sidebar__identity"><strong>{name}</strong><small>INTERN</small></div><button className="v2-intern-sidebar__logout" type="button" aria-label={locale === "ko" ? "로그아웃" : "Log out"} title={locale === "ko" ? "로그아웃" : "Log out"} onClick={() => void signOut()}><LogoutIcon /></button></div></section></aside><main className="v2-main"><Outlet /></main></div>;
}
function MenuIcon({ path }: { path: string }) { const paths: Record<string, string> = { home: "M4 11.5 12 5l8 6.5V20H4z", tasks: "M6 4h12v16H6zM9 9h6m-6 4h6", projects: "M4 7h7l2 2h7v11H4z", progress: "M5 18V9m7 9V5m7 13v-6", resources: "M5 5h14v14H5zM8 9h8m-8 4h6" }; return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[path]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function LogoutIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
