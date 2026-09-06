import type { Project } from "../../../types/domain";
import type { ProjectTaskMetrics } from "../../../pages/admin/projects/projectMetrics";
import { V2Badge } from "../../ui/V2Badge";
import { V2Card } from "../../ui/V2Card";
import { adminProjectStatusLabel, formatAppDate, useLocale } from "../../../i18n/internLocale";

type Props = { project: Project; managerName: string; metrics: ProjectTaskMetrics };
const value = (text: string | null | undefined) => text || "—";

export default function ProjectOverviewTab({ project, managerName, metrics }: Props) {
  const { locale } = useLocale();
  const dateText = (date: string | null) => formatAppDate(date, locale);
  const information = [[locale === "ko" ? "프로젝트 유형" : "Project Type", project.projectType], [locale === "ko" ? "분야" : "Field", value(project.field)], [locale === "ko" ? "담당자" : "Manager", managerName], [locale === "ko" ? "상태" : "Status", adminProjectStatusLabel(project.status, locale)], [locale === "ko" ? "현재 단계" : "Current Stage", value(project.currentStage)], [locale === "ko" ? "시작일" : "Start Date", dateText(project.startDate)], [locale === "ko" ? "종료 예정일" : "Target End Date", dateText(project.targetEndDate)]];
  const workStatus = [[locale === "ko" ? "전체 업무" : "Total Tasks", metrics.total], [locale === "ko" ? "완료" : "Completed", metrics.done], [locale === "ko" ? "검토 중" : "In Review", metrics.inReview], [locale === "ko" ? "지연" : "Overdue", metrics.overdue], [locale === "ko" ? "보류" : "Hold", metrics.hold]];
  return <div className="v2-detail-overview"><div className="v2-detail-overview__primary"><V2Card><section className="v2-detail-section"><h2>{locale === "ko" ? "프로젝트 정보" : "Project Information"}</h2><dl className="v2-detail-information">{information.map(([label, item]) => <div key={String(label)}><dt>{label}</dt><dd>{item}</dd></div>)}</dl></section></V2Card><V2Card><section className="v2-detail-section"><h2>{locale === "ko" ? "현재 업무 현황" : "Current Work Status"}</h2><div className="v2-detail-work-status">{workStatus.map(([label, item]) => <div key={String(label)}><span>{label}</span><strong>{item}</strong></div>)}</div></section></V2Card></div><div className="v2-detail-overview__context"><V2Card><section className="v2-detail-section"><h2>{locale === "ko" ? "프로젝트 맥락" : "Project Context"}</h2><ContextItem label={locale === "ko" ? "목적" : "Purpose"} value={project.purpose} /><ContextItem label={locale === "ko" ? "설명" : "Description"} value={project.description} /><ContextItem label={locale === "ko" ? "배경" : "Background"} value={project.background} /></section></V2Card><V2Card><section className="v2-detail-section"><h2>{locale === "ko" ? "키워드" : "Keywords"}</h2>{project.keywords.length ? <div className="v2-detail-keywords">{project.keywords.map((keyword) => <V2Badge key={keyword} variant="neutral">{keyword}</V2Badge>)}</div> : <span className="v2-muted">—</span>}</section></V2Card><V2Card><section className="v2-detail-section"><h2>Teams Workspace</h2>{project.teamsFolderUrl ? <a className="v2-detail-external-link" href={project.teamsFolderUrl} target="_blank" rel="noreferrer">{locale === "ko" ? "Teams 폴더 열기" : "Open Teams folder"} ↗</a> : <span className="v2-muted">—</span>}<p>{locale === "ko" ? "파일과 버전 기록은 Teams에 보관되며, 이 공간은 원본 위치로 연결됩니다." : "Files and version history remain in Teams; this workspace links to the source location."}</p></section></V2Card></div></div>;
}

function ContextItem({ label, value: content }: { label: string; value: string }) { return <div className="v2-detail-context-item"><h3>{label}</h3><p>{value(content)}</p></div>; }
