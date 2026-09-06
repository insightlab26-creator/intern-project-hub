import type { ChangeEvent } from "react";
import { V2Input } from "../ui/V2Input";
import { V2Select } from "../ui/V2Select";
import type { UserProfile } from "../../services/authService";
import { PROJECT_STATUS_LABELS, PROJECT_TYPE_LABELS } from "../../constants/domainLabels";
import type { ProjectStatus, ProjectType } from "../../types/domain";
import { useLocale } from "../../i18n/internLocale";

type ProjectFiltersProps = {
  query: string;
  status: string;
  projectType: string;
  managerId: string;
  managers: UserProfile[];
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onProjectTypeChange: (value: string) => void;
  onManagerChange: (value: string) => void;
};

const statuses = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[];
const projectTypes = Object.keys(PROJECT_TYPE_LABELS) as ProjectType[];
const eventValue = (handler: (value: string) => void) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => handler(event.target.value);

export default function ProjectFilters(props: ProjectFiltersProps) {
  const { t } = useLocale();
  return <section className="v2-project-toolbar" aria-label={t("common.filter")}><V2Input aria-label={t("common.search")} placeholder={t("projects.adminSearchPlaceholder")} value={props.query} onChange={eventValue(props.onQueryChange)} /><div className="v2-project-toolbar__filters"><V2Select aria-label={t("common.status")} value={props.status} onChange={eventValue(props.onStatusChange)}><option value="">{t("projects.allStatuses")}</option>{statuses.map((status) => <option key={status} value={status}>{PROJECT_STATUS_LABELS[status]}</option>)}</V2Select><V2Select aria-label={t("common.type")} value={props.projectType} onChange={eventValue(props.onProjectTypeChange)}><option value="">{t("common.allTypes")}</option>{projectTypes.map((type) => <option key={type} value={type}>{PROJECT_TYPE_LABELS[type]}</option>)}</V2Select><V2Select aria-label={t("common.assignee")} value={props.managerId} onChange={eventValue(props.onManagerChange)}><option value="">{t("projects.allManagers")}</option><option value="UNASSIGNED">{t("projects.unassigned")}</option>{props.managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.display_name}</option>)}</V2Select></div></section>;
}
