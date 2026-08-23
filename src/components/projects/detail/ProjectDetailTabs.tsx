import { V2Tabs } from "../../ui/V2Tabs";
import { detailTabs, type ProjectDetailTab } from "./projectDetailTabs";

export default function ProjectDetailTabs({ activeTab, onChange }: { activeTab: ProjectDetailTab; onChange: (tab: ProjectDetailTab) => void }) {
  return <V2Tabs tabs={[...detailTabs]} activeId={activeTab} onChange={(tab) => onChange(tab as ProjectDetailTab)} />;
}
