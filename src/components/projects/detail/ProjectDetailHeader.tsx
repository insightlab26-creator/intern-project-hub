import { PROJECT_TYPE_LABELS } from "../../../constants/domainLabels";
import type { Project } from "../../../types/domain";
import { V2Badge } from "../../ui/V2Badge";
import { V2Button } from "../../ui/V2Button";
import { adminProjectStatusLabel, formatAppDate, useLocale } from "../../../i18n/internLocale";

type Props = { project: Project; managerName: string; onEdit: () => void; onBack: () => void };
const badgeVariants: Record<Project["status"], "neutral" | "success" | "warning" | "danger" | "info"> = { PLANNING: "neutral", ACTIVE: "success", REVIEW: "info", REVISION: "warning", ON_HOLD: "warning", COMPLETED: "success", DROPPED: "danger", ARCHIVED: "neutral" };

export default function ProjectDetailHeader({ project, managerName, onEdit, onBack }: Props) {
  const { locale } = useLocale(); const dateText = (value: string | null) => formatAppDate(value, locale);
  return <><nav className="v2-detail-breadcrumb" aria-label={locale === "ko" ? "이동 경로" : "Breadcrumb"}><button className="v2-detail-breadcrumb__link" type="button" onClick={onBack}>{locale === "ko" ? "프로젝트" : "Projects"}</button><span>/</span><span>{locale === "ko" ? "프로젝트 상세" : "Project Detail"}</span></nav><header className="v2-detail-header"><div><div className="v2-detail-header__meta"><span>{project.code}</span><V2Badge variant="info">{PROJECT_TYPE_LABELS[project.projectType]}</V2Badge><V2Badge variant={badgeVariants[project.status]}>{adminProjectStatusLabel(project.status, locale)}</V2Badge></div><h1>{project.name}</h1><p>{project.purpose || project.description || "—"}</p><dl className="v2-detail-header__facts"><div><dt>{locale === "ko" ? "분야" : "Field"}</dt><dd>{project.field || "—"}</dd></div><div><dt>{locale === "ko" ? "담당자" : "Manager"}</dt><dd>{managerName}</dd></div><div><dt>{locale === "ko" ? "기간" : "Period"}</dt><dd>{dateText(project.startDate)} — {dateText(project.targetEndDate)}</dd></div><div><dt>{locale === "ko" ? "현재 단계" : "Current stage"}</dt><dd>{project.currentStage || "—"}</dd></div></dl></div><div className="v2-detail-header__actions"><V2Button variant="secondary" type="button" onClick={onEdit}>{locale === "ko" ? "프로젝트 수정" : "Edit Project"}</V2Button>{project.teamsFolderUrl ? <a className="v2-button v2-button--primary" href={project.teamsFolderUrl} target="_blank" rel="noreferrer">Teams Folder ↗</a> : <V2Button variant="secondary" type="button" disabled>Teams Folder</V2Button>}</div></header></>;
}
