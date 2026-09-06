import { V2Tabs } from "../../ui/V2Tabs";
import { detailTabs, type ProjectDetailTab } from "./projectDetailTabs";
import { useLocale } from "../../../i18n/internLocale";

export default function ProjectDetailTabs({ activeTab, onChange }: { activeTab: ProjectDetailTab; onChange: (tab: ProjectDetailTab) => void }) {
  const { t } = useLocale();
  const labels: Record<ProjectDetailTab, string> = { overview: t("common.overview"), work: t("common.work"), reviews: t("common.reviews"), outputs: t("common.outputs"), members: t("common.members") };
  return <V2Tabs tabs={detailTabs.map((tab) => ({ ...tab, label: labels[tab.id] }))} activeId={activeTab} onChange={(tab) => onChange(tab as ProjectDetailTab)} />;
}
