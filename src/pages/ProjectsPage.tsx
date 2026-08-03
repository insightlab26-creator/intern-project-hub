import ProjectDetailPage, {
  type Project,
} from "./ProjectDetailPage";
import { useEffect, useState, type FormEvent } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "ARCHIVED";

type ProjectsPageProps = {
  currentUserUid: string;
};

const statusLabels: Record<ProjectStatus, string> = {
  PLANNING: "기획",
  ACTIVE: "진행 중",
  ON_HOLD: "보류",
  COMPLETED: "완료",
  ARCHIVED: "보관",
};

function ProjectsPage({ currentUserUid }: ProjectsPageProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("PLANNING");
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "projects"),
      (snapshot) => {
        const projectList = snapshot.docs.map((document) => {
          return {
            id: document.id,
            ...document.data(),
          } as Project;
        });

        setProjects(projectList);
      },
      (error) => {
        console.error(error);
        setMessage("프로젝트 목록을 불러오지 못했습니다.");
      }
    );

    return unsubscribe;
  }, []);

  const handleCreateProject = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!code.trim() || !name.trim()) {
      setMessage("프로젝트 코드와 프로젝트명은 필수입니다.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      await addDoc(collection(db, "projects"), {
        code: code.trim(),
        name: name.trim(),
        description: description.trim(),

        status,

        startDate: startDate || null,
        targetEndDate: targetEndDate || null,

        ownerUids: [currentUserUid],

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        createdBy: currentUserUid,
        updatedBy: currentUserUid,

        schemaVersion: 1,
      });

      setCode("");
      setName("");
      setDescription("");
      setStatus("PLANNING");
      setStartDate("");
      setTargetEndDate("");

      setShowForm(false);
      setMessage("프로젝트가 생성되었습니다.");
    } catch (error) {
      console.error(error);
      setMessage("프로젝트 생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (selectedProject) {
  return (
    <ProjectDetailPage
      project={selectedProject}
      currentUserUid={currentUserUid}
      onBack={() => setSelectedProject(null)}
    />
  );
}

  return (
    <>
      <header className="page-header project-page-header">
        <div>
          <p className="eyebrow">WORK</p>
          <h1>Projects</h1>
          <p>
            인턴 업무를 프로젝트 중심으로 관리합니다.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "취소" : "+ 새 프로젝트"}
        </button>
      </header>

      {message && (
        <div className="notice-message">
          {message}
        </div>
      )}

      {showForm && (
        <section className="project-form-card">
          <h2>새 프로젝트</h2>

          <form
            className="project-form"
            onSubmit={handleCreateProject}
          >
            <div className="form-grid">
              <label>
                프로젝트 코드 *
                <input
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value)
                  }
                  placeholder="예: EDGE-AI"
                />
              </label>

              <label>
                상태
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as ProjectStatus
                    )
                  }
                >
                  <option value="PLANNING">기획</option>
                  <option value="ACTIVE">진행 중</option>
                  <option value="ON_HOLD">보류</option>
                  <option value="COMPLETED">완료</option>
                  <option value="ARCHIVED">보관</option>
                </select>
              </label>
            </div>

            <label>
              프로젝트명 *
              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="프로젝트명을 입력하세요."
              />
            </label>

            <label>
              설명
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="프로젝트 목적과 주요 내용을 입력하세요."
                rows={4}
              />
            </label>

            <div className="form-grid">
              <label>
                시작일
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(event.target.value)
                  }
                />
              </label>

              <label>
                목표 종료일
                <input
                  type="date"
                  value={targetEndDate}
                  onChange={(event) =>
                    setTargetEndDate(event.target.value)
                  }
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? "저장 중..." : "프로젝트 생성"}
              </button>
            </div>
          </form>
        </section>
      )}

      {projects.length === 0 ? (
        <div className="panel">
          <div className="empty-state large">
            <strong>등록된 프로젝트가 없습니다.</strong>
            <p>
              새 프로젝트를 생성해서 업무 관리를 시작하세요.
            </p>
          </div>
        </div>
      ) : (
        <section className="projects-grid">
          {projects.map((project) => (
            <article
              className="project-card"
              key={project.id}
                onClick={() => setSelectedProject(project)}
            >
              <div className="project-card-top">
                <span className="project-code">
                  {project.code}
                </span>

                <span
                  className={`status-badge status-${project.status.toLowerCase()}`}
                >
                  {statusLabels[project.status]}
                </span>
              </div>

              <h2>{project.name}</h2>

              <p className="project-description">
                {project.description ||
                  "등록된 설명이 없습니다."}
              </p>

              <div className="project-dates">
                <span>
                  시작{" "}
                  <strong>
                    {project.startDate || "-"}
                  </strong>
                </span>

                <span>
                  종료{" "}
                  <strong>
                    {project.targetEndDate || "-"}
                  </strong>
                </span>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}

export default ProjectsPage;