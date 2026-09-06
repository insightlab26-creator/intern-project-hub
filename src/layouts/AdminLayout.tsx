import RoleLayout from "./RoleLayout";

const items = [
  ["admin.nav.commandCenter", "command-center"], ["admin.nav.projects", "projects"], ["admin.nav.calendar", "calendar"], ["admin.nav.reviews", "reviews"], ["admin.nav.interns", "interns"], ["admin.nav.programs", "programs"], ["admin.nav.documents", "documents"], ["admin.nav.reports", "reports"], ["admin.nav.activity", "activity"], ["admin.nav.users", "users"], ["admin.nav.settings", "settings"],
].map(([label, path]) => ({ label, path: `/admin/${path}` }));

export default function AdminLayout() { return <RoleLayout title="ADMIN" items={items} />; }
