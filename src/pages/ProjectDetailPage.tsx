import WorkstreamsTab from "../components/WorkstreamsTab";
import TasksTab from "../components/TasksTab";
import { useState } from "react";

type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "ARCHIVED";

export type Project = {
  id: string;
  code: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string | null;
  targetEndDate: string | null;
  ownerUids: string[];
};

type ProjectDetailPageProps = {
  project: Project;
  currentUserUid: string;
  onBack: () => void;
};

const statusLabels: Record<ProjectStatus, string> = {
  PLANNING: "기획",
  ACTIVE: "진행 중",
  ON_HOLD: "보류",
  COMPLETED: "완료",
  ARCHIVED: "보관",
};

const tabs = [
  "Overview",
  "Workstreams",
  "Tasks",
  "Resources",
  "Deliverables",
  "Decisions",
  "Members",
];

function ProjectDetailPage({
  project,
  currentUserUid,
  onBack,
}: ProjectDetailPageProps) {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <>
      <button className="back-button" onClick={onBack}>
        ← Projects
      </button>

      <header className="project-detail-header">
        <div>
          <div className="project-detail-meta">
            <span>{project.code}</span>

            <span
              className={`status-badge status-${project.status.toLowerCase()}`}
            >
              {statusLabels[project.status]}
            </span>
          </div>

          <h1>{project.name}</h1>

          <p>
            {project.description || "등록된 설명이 없습니다."}
          </p>
        </div>
      </header>

      <nav className="project-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={
              activeTab === tab
                ? "project-tab active"
                : "project-tab"
            }
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === "Overview" ? (
  <section className="project-overview">
    <div className="overview-card">
      <span>상태</span>
      <strong>{statusLabels[project.status]}</strong>
    </div>

    <div className="overview-card">
      <span>시작일</span>
      <strong>{project.startDate || "-"}</strong>
    </div>

    <div className="overview-card">
      <span>목표 종료일</span>
      <strong>{project.targetEndDate || "-"}</strong>
    </div>
  </section>
) : activeTab === "Workstreams" ? (
  <WorkstreamsTab
    projectId={project.id}
    currentUserUid={currentUserUid}
  />
) : activeTab === "Tasks" ? (
  <TasksTab
    projectId={project.id}
    currentUserUid={currentUserUid}
  />
) : (
  <section className="panel">
    <div className="empty-state large">
      <strong>{activeTab}</strong>
      <p>
        이 프로젝트의 {activeTab} 기능은 다음 단계에서
        연결합니다.
      </p>
    </div>
  </section>
)}
    </>
  );
}

export default ProjectDetailPage;