import RoleLayout from "./RoleLayout";

const items = [
  ["Command Center", "command-center"], ["Projects", "projects"], ["Review Queue", "reviews"], ["Interns", "interns"], ["Programs", "programs"], ["Documents", "documents"], ["Reports", "reports"], ["Activity", "activity"], ["Users", "users"], ["Settings", "settings"],
].map(([label, path]) => ({ label, path: `/v2/admin/${path}` }));

export default function AdminLayout() { return <RoleLayout title="ADMIN" items={items} />; }
