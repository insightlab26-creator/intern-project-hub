import type { CSSProperties } from "react";
import { TASK_STATUS_LABELS } from "../../constants/domainLabels";
import type { DashboardSummary, DashboardTeamLoad, TaskStatus } from "../../types/domain";

const statusOrder: TaskStatus[] = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
const colors: Record<TaskStatus, string> = {
  TODO: "var(--dash-todo)", IN_PROGRESS: "var(--dash-progress)", REVIEW: "var(--dash-review)",
  DONE: "var(--dash-done)", HOLD: "var(--dash-hold)",
};

export function WeeklyProgress({ summary }: { summary: DashboardSummary }) {
  return <section className="dashboard-card weekly-progress-card">
    <div className="dashboard-card-heading"><h2>주간 업무 진행률</h2><small>이번 주</small></div>
    <div className="weekly-chart-body">
      <div className="donut-chart" style={{ "--progress": `${summary.weeklyProgressRate * 3.6}deg` } as CSSProperties}>
        <div><strong>{summary.weeklyProgressRate}%</strong><span>전체 완료</span></div>
      </div>
      <div className="status-bars">{statusOrder.map((status) => {
        const value = summary.weeklyStatusCounts[status];
        const rate = summary.weeklyTotal ? value / summary.weeklyTotal * 100 : 0;
        return <div className="status-bar-row" key={status}>
          <div><span className="status-dot" style={{ background: colors[status] }} />{TASK_STATUS_LABELS[status]}</div>
          <div className="progress-track"><span style={{ width: `${rate}%`, background: colors[status] }} /></div><strong>{value}</strong>
        </div>;
      })}</div>
    </div>
  </section>;
}

const teamColors = ["#3b82f6", "#32b66b", "#f48128", "#ad58ca", "#e5484d"];

export function TeamDistribution({ loads }: { loads: DashboardTeamLoad[] }) {
  const max = Math.max(...loads.map((item) => item.total), 1);
  return <section className="dashboard-card team-load-card">
    <div className="dashboard-card-heading"><h2>팀원별 업무 분배</h2></div>
    <div className="team-bars">{loads.length === 0 ? <p className="dashboard-empty">배정된 업무가 없습니다.</p> : loads.slice(0, 6).map((load, index) =>
      <div className="team-bar-row" key={load.internId ?? "unassigned"}>
        <span className="team-avatar" style={{ background: teamColors[index % teamColors.length] }}>{load.name.slice(0, 1)}</span>
        <strong>{load.name}</strong>
        <div className="team-progress"><span style={{ width: `${Math.max(load.total / max * 100, 5)}%`, background: teamColors[index % teamColors.length] }} /></div>
        <b>{load.total}건</b>
      </div>)}
    </div>
  </section>;
}
