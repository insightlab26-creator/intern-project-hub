import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../app/providers/authContext";

const items = [["Home", "home"], ["My Tasks", "tasks"], ["Projects", "projects"], ["Progress", "progress"], ["Resources", "resources"]] as const;

export default function InternLayout() {
  const { profile, signOutCurrentUser } = useAuth(); const navigate = useNavigate(); const name = profile?.display_name ?? "Intern";
  const signOut = async () => { await signOutCurrentUser(); navigate("/"); };
  return <div className="v2-shell v2-intern-shell"><aside className="v2-intern-sidebar"><div><div className="v2-intern-sidebar__brand">INTERN PROJECT HUB</div><nav aria-label="Intern navigation">{items.map(([label, path]) => <NavLink key={path} to={`/intern/${path}`} className={({ isActive }) => isActive ? "active" : ""}><MenuIcon label={label} /><span>{label}</span></NavLink>)}</nav></div><div className="v2-intern-sidebar__profile"><span>{name.slice(0, 1).toUpperCase()}</span><div><strong>{name}</strong><small>INTERN</small></div><button type="button" onClick={() => void signOut()}>Log out</button></div></aside><main className="v2-main"><Outlet /></main></div>;
}
function MenuIcon({ label }: { label: string }) { const paths: Record<string, string> = { Home: "M4 11.5 12 5l8 6.5V20H4z", "My Tasks": "M6 4h12v16H6zM9 9h6m-6 4h6", Projects: "M4 7h7l2 2h7v11H4z", Progress: "M5 18V9m7 9V5m7 13v-6", Resources: "M5 5h14v14H5zM8 9h8m-8 4h6" }; return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[label]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
