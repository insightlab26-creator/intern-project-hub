import { useEffect, useState, type FormEvent } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

type WorkstreamStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED";

type Workstream = {
  id: string;
  name: string;
  description: string;
  status: WorkstreamStatus;
  order: number;
};

type WorkstreamsTabProps = {
  projectId: string;
  currentUserUid: string;
};

const statusLabels: Record<WorkstreamStatus, string> = {
  PLANNING: "기획",
  ACTIVE: "진행 중",
  ON_HOLD: "보류",
  COMPLETED: "완료",
};

function WorkstreamsTab({
  projectId,
  currentUserUid,
}: WorkstreamsTabProps) {
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] =
    useState<WorkstreamStatus>("PLANNING");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const workstreamsRef = collection(
      db,
      "projects",
      projectId,
      "workstreams"
    );

    const unsubscribe = onSnapshot(
      workstreamsRef,
      (snapshot) => {
        const list = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        })) as Workstream[];

        list.sort((a, b) => a.order - b.order);

        setWorkstreams(list);
      },
      (error) => {
        console.error(error);
        setMessage("Workstream을 불러오지 못했습니다.");
      }
    );

    return unsubscribe;
  }, [projectId]);

  const handleCreate = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!name.trim()) {
      setMessage("Workstream 이름을 입력해주세요.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      await addDoc(
        collection(
          db,
          "projects",
          projectId,
          "workstreams"
        ),
        {
          name: name.trim(),
          description: description.trim(),
          status,
          order: workstreams.length + 1,

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),

          createdBy: currentUserUid,
          updatedBy: currentUserUid,
        }
      );

      setName("");
      setDescription("");
      setStatus("PLANNING");

      setShowForm(false);
      setMessage("Workstream이 생성되었습니다.");
    } catch (error) {
      console.error(error);
      setMessage("Workstream 생성에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="tab-toolbar">
        <div>
          <h2>Workstreams</h2>
          <p>
            프로젝트의 주요 업무 영역을 구분하여 관리합니다.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "취소" : "+ Workstream 추가"}
        </button>
      </div>

      {message && (
        <div className="notice-message">{message}</div>
      )}

      {showForm && (
        <section className="project-form-card">
          <h2>새 Workstream</h2>

          <form
            className="project-form"
            onSubmit={handleCreate}
          >
            <label>
              Workstream 이름 *
              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="예: 활용 시나리오 발굴"
              />
            </label>

            <label>
              설명
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={3}
                placeholder="이 업무 영역에서 수행할 내용을 입력하세요."
              />
            </label>

            <label>
              상태
              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as WorkstreamStatus
                  )
                }
              >
                <option value="PLANNING">기획</option>
                <option value="ACTIVE">진행 중</option>
                <option value="ON_HOLD">보류</option>
                <option value="COMPLETED">완료</option>
              </select>
            </label>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? "저장 중..." : "Workstream 생성"}
              </button>
            </div>
          </form>
        </section>
      )}

      {workstreams.length === 0 ? (
        <section className="panel">
          <div className="empty-state large">
            <strong>
              등록된 Workstream이 없습니다.
            </strong>
            <p>
              프로젝트의 주요 업무 영역부터 만들어보세요.
            </p>
          </div>
        </section>
      ) : (
        <div className="workstream-list">
          {workstreams.map((workstream) => (
            <article
              className="workstream-card"
              key={workstream.id}
            >
              <div className="workstream-order">
                {workstream.order}
              </div>

              <div className="workstream-content">
                <div className="workstream-title-row">
                  <h3>{workstream.name}</h3>

                  <span className="status-badge">
                    {statusLabels[workstream.status]}
                  </span>
                </div>

                <p>
                  {workstream.description ||
                    "등록된 설명이 없습니다."}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export default WorkstreamsTab;