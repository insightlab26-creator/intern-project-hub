import { V2Tabs } from "../../ui/V2Tabs";
import { programDetailTabs, type ProgramDetailTab } from "./programDetailTabs";

export default function ProgramDetailTabs({ activeTab, onChange }: { activeTab: ProgramDetailTab; onChange: (tab: ProgramDetailTab) => void }) {
  return <V2Tabs tabs={[...programDetailTabs]} activeId={activeTab} onChange={(tab) => onChange(tab as ProgramDetailTab)} />;
}
