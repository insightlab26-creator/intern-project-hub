import { useEffect, useState, type FormEvent } from "react";
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

type InternStatus = "PLANNED" | "ACTIVE" | "COMPLETED";

type Intern = {
  id: string;
  name: string;
  school: string;
  major: string;
  cohort: string;
  startDate: string | null;
  endDate: string | null;
  status: InternStatus;
  userUid: string | null;
};

type InternsPageProps = {
  currentUserUid: string;
};

const statusLabels: Record<InternStatus, string> = {
  PLANNED: "예정",
  ACTIVE: "활동 중",
  COMPLETED: "종료",
};

function InternsPage({
  currentUserUid,
}: InternsPageProps) {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [major, setMajor] = useState("");
  const [cohort, setCohort] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [status, setStatus] =
    useState<InternStatus>("ACTIVE");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "interns"),
      (snapshot) => {
        const list = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        })) as Intern[];

        setInterns(list);
      },
      (error) => {
        console.error(error);
        setMessage("인턴 목록을 불러오지 못했습니다.");
      }
    );

    return unsubscribe;
  }, []);

  const handleCreate = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!name.trim()) {
      setMessage("인턴 이름은 필수입니다.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      await addDoc(collection(db, "interns"), {
        name: name.trim(),
        school: school.trim(),
        major: major.trim(),
        cohort: cohort.trim(),

        startDate: startDate || null,
        endDate: endDate || null,

        status,

        // 로그인 계정은 나중에 연결
        userUid: null,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        createdBy: currentUserUid,
        updatedBy: currentUserUid,

        schemaVersion: 1,
      });

      setName("");
      setSchool("");
      setMajor("");
      setCohort("");
      setStartDate("");
      setEndDate("");
      setStatus("ACTIVE");

      setShowForm(false);
      setMessage("인턴이 등록되었습니다.");
    } catch (error) {
      console.error(error);
      setMessage("인턴 등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="page-header project-page-header">
        <div>
          <p className="eyebrow">MANAGEMENT</p>
          <h1>Interns</h1>
          <p>
            인턴의 참여 이력과 프로젝트 수행 정보를 관리합니다.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "취소" : "+ 인턴 등록"}
        </button>
      </header>

      {message && (
        <div className="notice-message">
          {message}
        </div>
      )}

      {showForm && (
        <section className="project-form-card">
          <h2>새 인턴 등록</h2>

          <form
            className="project-form"
            onSubmit={handleCreate}
          >
            <div className="form-grid">
              <label>
                이름 *
                <input
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="예: J"
                />
              </label>

              <label>
                상태
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as InternStatus
                    )
                  }
                >
                  <option value="PLANNED">예정</option>
                  <option value="ACTIVE">활동 중</option>
                  <option value="COMPLETED">종료</option>
                </select>
              </label>
            </div>

            <div className="form-grid">
              <label>
                학교
                <input
                  value={school}
                  onChange={(event) =>
                    setSchool(event.target.value)
                  }
                />
              </label>

              <label>
                전공
                <input
                  value={major}
                  onChange={(event) =>
                    setMajor(event.target.value)
                  }
                />
              </label>
            </div>

            <label>
              기수 / 프로그램
              <input
                value={cohort}
                onChange={(event) =>
                  setCohort(event.target.value)
                }
                placeholder="예: 2026 하계"
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
                종료일
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(event.target.value)
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
                {saving ? "저장 중..." : "인턴 등록"}
              </button>
            </div>
          </form>
        </section>
      )}

      {interns.length === 0 ? (
        <section className="panel">
          <div className="empty-state large">
            <strong>
              등록된 인턴이 없습니다.
            </strong>
            <p>
              인턴을 등록하면 Task 담당자로 연결할 수 있습니다.
            </p>
          </div>
        </section>
      ) : (
        <section className="intern-table-card">
          <div className="intern-table-header">
            <span>이름</span>
            <span>학교 / 전공</span>
            <span>기수</span>
            <span>기간</span>
            <span>상태</span>
          </div>

          {interns.map((intern) => (
            <div
              className="intern-table-row"
              key={intern.id}
            >
              <strong>{intern.name}</strong>

              <span>
                {intern.school || "-"}
                {intern.major
                  ? ` / ${intern.major}`
                  : ""}
              </span>

              <span>{intern.cohort || "-"}</span>

              <span>
                {intern.startDate || "-"} ~{" "}
                {intern.endDate || "-"}
              </span>

              <span className="status-badge">
                {statusLabels[intern.status]}
              </span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

export default InternsPage;