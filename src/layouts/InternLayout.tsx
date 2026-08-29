import RoleLayout from "./RoleLayout";

const items = [["Home", "home"], ["My Tasks", "tasks"], ["Projects", "projects"], ["Progress", "progress"], ["Resources", "resources"]].map(([label, path]) => ({ label, path: `/intern/${path}` }));

export default function InternLayout() { return <RoleLayout title="INTERN" items={items} />; }
