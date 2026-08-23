import { Outlet } from "react-router-dom";
import AppHeader from "../components/common/AppHeader";
import RoleSidebar, { type NavigationItem } from "../components/common/RoleSidebar";

export default function RoleLayout({ title, items }: { title: string; items: NavigationItem[] }) {
  return <div className="v2-shell"><RoleSidebar title={title} items={items} /><div className="v2-workspace"><AppHeader /><main className="v2-main"><Outlet /></main></div></div>;
}
