import RoleLayout from "./RoleLayout";

const items = [["Home", "home"], ["Projects", "projects"], ["Review Queue", "review-queue"], ["Documents", "documents"]].map(([label, path]) => ({ label, path: `/v2/manager/${path}` }));

export default function ManagerLayout() { return <RoleLayout title="MANAGER" items={items} />; }
