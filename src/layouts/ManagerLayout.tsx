import RoleLayout from "./RoleLayout";

const items = [["nav.home", "home"], ["admin.nav.projects", "projects"], ["admin.nav.reviews", "review-queue"], ["admin.nav.documents", "documents"]].map(([label, path]) => ({ label, path: `/manager/${path}` }));

export default function ManagerLayout() { return <RoleLayout title="MANAGER" items={items} />; }
