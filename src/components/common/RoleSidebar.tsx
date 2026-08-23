import { NavLink } from "react-router-dom";

export type NavigationItem = { label: string; path: string };

export default function RoleSidebar({ title, items }: { title: string; items: NavigationItem[] }) {
  return <aside className="v2-sidebar"><strong>{title}</strong><nav>{items.map((item) => <NavLink key={item.path} to={item.path} className={({ isActive }) => isActive ? "v2-nav-link active" : "v2-nav-link"}>{item.label}</NavLink>)}</nav></aside>;
}
