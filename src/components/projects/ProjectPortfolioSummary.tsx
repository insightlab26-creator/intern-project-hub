import { V2Card } from "../ui/V2Card";
import type { PortfolioSummary } from "../../pages/admin/projects/projectMetrics";

export default function ProjectPortfolioSummary({ summary }: { summary: PortfolioSummary }) {
  const cards = [
    ["TOTAL", "전체 Project 수", summary.total, "neutral"],
    ["ACTIVE", "진행 중", summary.active, "success"],
    ["OVERDUE", "목표 종료일 경과", summary.overdue, "danger"],
    ["REVIEW", "검토 단계", summary.review, "info"],
    ["COMPLETED", "완료", summary.completed, "success"],
  ];
  return <section className="v2-portfolio-summary" aria-label="Project portfolio summary">{cards.map(([label, description, value, tone]) => <V2Card className={`v2-summary-card v2-summary-card--${tone}`} key={String(label)}><span>{label}</span><strong>{value}</strong><small>{description}</small></V2Card>)}</section>;
}
