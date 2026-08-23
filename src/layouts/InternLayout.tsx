import RoleLayout from "./RoleLayout";

const items = [["Home", "home"], ["My Quests", "my-quests"], ["Projects", "projects"], ["Progress", "progress"], ["Achievements", "achievements"], ["Ranking", "ranking"], ["Resources", "resources"]].map(([label, path]) => ({ label, path: `/v2/intern/${path}` }));

export default function InternLayout() { return <RoleLayout title="INTERN" items={items} />; }
