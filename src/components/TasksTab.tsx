import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "REVIEW"
  | "DONE"
  | "HOLD";

type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

type Workstream = {
  id: string;
  name: string;
};

type Intern = {
  id: string;
  name: string;
  userUid: string | null;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
};

type Task = {
  id: string;
  title: string;
  description: string;

  workstreamId: string | null;
  parentTaskId: string | null;

  assigneeInternIds: string[];
  assigneeUids: string[];

  status: TaskStatus;
  priority: TaskPriority;

  startDate: string | null;
  dueDate: string | null;
};

type TasksTabProps = {
  projectId: string;
  currentUserUid: string;
};

const statusLabels: Record<TaskStatus, string> = {
  TODO: "할 일",
  IN_PROGRESS: "진행 중",
  REVIEW: "검토",
  DONE: "완료",
  HOLD: "보류",
};

const priorityLabels: Record<TaskPriority, string> = {
  LOW: "낮음",
  MEDIUM: "보통",
  HIGH: "높음",
};

function TasksTab({
  projectId,
  currentUserUid,
}: TasksTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [interns, setInterns] = useState<Intern[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingTaskId, setEditingTaskId] =
    useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [workstreamId, setWorkstreamId] = useState("");
  const [parentTaskId, setParentTaskId] = useState("");
  const [assigneeInternId, setAssigneeInternId] = useState("");

  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [priority, setPriority] =
    useState<TaskPriority>("MEDIUM");

  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [collapsedTaskIds, setCollapsedTaskIds] =
  useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribeTasks = onSnapshot(
      collection(db, "projects", projectId, "tasks"),
      (snapshot) => {
        const list = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        })) as Task[];

        setTasks(list);
      },
      (error) => {
        console.error(error);
        setMessage("Task 목록을 불러오지 못했습니다.");
      }
    );

    const unsubscribeWorkstreams = onSnapshot(
      collection(db, "projects", projectId, "workstreams"),
      (snapshot) => {
        const list = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        })) as Workstream[];

        setWorkstreams(list);
      }
    );

    const unsubscribeInterns = onSnapshot(
      collection(db, "interns"),
      (snapshot) => {
        const list = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        })) as Intern[];

        setInterns(list);
      }
    );

    return () => {
      unsubscribeTasks();
      unsubscribeWorkstreams();
      unsubscribeInterns();
    };
  }, [projectId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setWorkstreamId("");
    setParentTaskId("");
    setAssigneeInternId("");
    setStatus("TODO");
    setPriority("MEDIUM");
    setStartDate("");
    setDueDate("");
    setEditingTaskId(null);
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
    setMessage("");
  };

  const handleNewTask = () => {
    resetForm();
    setShowForm(true);
    setMessage("");
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);

    setTitle(task.title);
    setDescription(task.description || "");
    setWorkstreamId(task.workstreamId || "");
    setParentTaskId(task.parentTaskId || "");

    setAssigneeInternId(
      task.assigneeInternIds?.[0] || ""
    );

    setStatus(task.status);
    setPriority(task.priority);

    setStartDate(task.startDate || "");
    setDueDate(task.dueDate || "");

    setShowForm(true);
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!title.trim()) {
      setMessage("Task 제목은 필수입니다.");
      return;
    }

    if (!workstreamId) {
      setMessage("Workstream을 선택해주세요.");
      return;
    }

    let assigneeInternIds: string[] = [];
    let assigneeUids: string[] = [];

    if (assigneeInternId) {
      const selectedIntern = interns.find(
        (intern) => intern.id === assigneeInternId
      );

      assigneeInternIds = [assigneeInternId];

      if (selectedIntern?.userUid) {
        assigneeUids = [selectedIntern.userUid];
      }
    }

    const taskData = {
      title: title.trim(),
      description: description.trim(),

      workstreamId,
      parentTaskId: parentTaskId || null,

      assigneeInternIds,
      assigneeUids,

      status,
      priority,

      startDate: startDate || null,
      dueDate: dueDate || null,

      updatedAt: serverTimestamp(),
      updatedBy: currentUserUid,
    };

    try {
      setSaving(true);
      setMessage("");

      if (editingTaskId) {
        const taskRef = doc(
          db,
          "projects",
          projectId,
          "tasks",
          editingTaskId
        );

        await updateDoc(taskRef, taskData);

        setMessage("Task가 수정되었습니다.");
      } else {
        await addDoc(
          collection(db, "projects", projectId, "tasks"),
          {
            ...taskData,

            createdAt: serverTimestamp(),
            createdBy: currentUserUid,

            schemaVersion: 1,
          }
        );

        setMessage("Task가 생성되었습니다.");
      }

      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error(error);

      setMessage(
        editingTaskId
          ? "Task 수정에 실패했습니다."
          : "Task 생성에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  const getWorkstreamName = (id: string | null) => {
    if (!id) return "-";

    return (
      workstreams.find(
        (workstream) => workstream.id === id
      )?.name || "-"
    );
  };

  const getInternNames = (internIds: string[]) => {
    if (!internIds || internIds.length === 0) {
      return "담당자 없음";
    }

    return internIds
      .map(
        (id) =>
          interns.find((intern) => intern.id === id)?.name ||
          "알 수 없음"
      )
      .join(", ");
  };

  const getChildTasks = (parentId: string) => {
  return tasks.filter(
    (task) => task.parentTaskId === parentId
  );
};

const toggleTask = (taskId: string) => {
  setCollapsedTaskIds((previous) => {
    const next = new Set(previous);

    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
    }

    return next;
  });
};

const renderTaskNode = (
  task: Task,
  depth = 0
): ReactNode => {
  const children = getChildTasks(task.id);

  const isCollapsed =
    collapsedTaskIds.has(task.id);

  const completedChildren = children.filter(
    (child) => child.status === "DONE"
  ).length;

  return (
    <div
      className={
        depth === 0
          ? "task-tree-node root-task"
          : "task-tree-node child-task"
      }
      key={task.id}
    >
      <article className="task-card">
        <div className="task-main">
          <div className="task-top-row">
            <div className="task-title-area">
              {children.length > 0 ? (
                <button
                  type="button"
                  className="task-tree-toggle"
                  onClick={() => toggleTask(task.id)}
                  title={
                    isCollapsed
                      ? "하위 Task 펼치기"
                      : "하위 Task 접기"
                  }
                >
                  {isCollapsed ? "▶" : "▼"}
                </button>
              ) : (
                <span className="task-tree-spacer">
                  •
                </span>
              )}

              <div>
                <h3>{task.title}</h3>

                {children.length > 0 && (
                  <p className="child-progress">
                    하위 업무 {completedChildren} /{" "}
                    {children.length} 완료
                  </p>
                )}
              </div>
            </div>

            <div className="task-actions">
              <span className="status-badge">
                {statusLabels[task.status]}
              </span>

              <button
                type="button"
                className="edit-button"
                onClick={() =>
                  handleEditTask(task)
                }
              >
                수정
              </button>
            </div>
          </div>

          <p className="task-description">
            {task.description ||
              "등록된 설명이 없습니다."}
          </p>

          <div className="task-meta">
            <span>
              Workstream
              <strong>
                {getWorkstreamName(
                  task.workstreamId
                )}
              </strong>
            </span>

            <span>
              담당
              <strong>
                {getInternNames(
                  task.assigneeInternIds || []
                )}
              </strong>
            </span>

            <span>
              우선순위
              <strong>
                {priorityLabels[task.priority]}
              </strong>
            </span>

            <span>
              마감
              <strong>
                {task.dueDate || "-"}
              </strong>
            </span>
          </div>
        </div>
      </article>

      {children.length > 0 &&
        !isCollapsed && (
          <div className="task-tree-children">
            {children.map((child) =>
              renderTaskNode(child, depth + 1)
            )}
          </div>
        )}
    </div>
  );
};

  return (
    <>
      <div className="tab-toolbar">
        <div>
          <h2>Tasks</h2>
          <p>
            프로젝트의 실제 수행 업무를 등록하고 진행 상태를
            관리합니다.
          </p>
        </div>

        {!showForm && (
          <button
            className="primary-button"
            onClick={handleNewTask}
          >
            + Task 추가
          </button>
        )}
      </div>

      {message && (
        <div className="notice-message">{message}</div>
      )}

      {showForm && (
        <section className="project-form-card">
          <div className="task-form-header">
            <h2>
              {editingTaskId ? "Task 수정" : "새 Task"}
            </h2>

            <button
              type="button"
              className="text-button"
              onClick={handleCancel}
            >
              취소
            </button>
          </div>

          <form
            className="project-form"
            onSubmit={handleSubmit}
          >
            <label>
              Task 제목 *
              <input
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
              />
            </label>

            <label>
              설명
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={4}
              />
            </label>

            <div className="form-grid">
              <label>
                Workstream *
                <select
                  value={workstreamId}
                  onChange={(event) =>
                    setWorkstreamId(event.target.value)
                  }
                >
                  <option value="">
                    Workstream 선택
                  </option>

                  {workstreams.map((workstream) => (
                    <option
                      key={workstream.id}
                      value={workstream.id}
                    >
                      {workstream.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                담당 인턴
                <select
                  value={assigneeInternId}
                  onChange={(event) =>
                    setAssigneeInternId(
                      event.target.value
                    )
                  }
                >
                  <option value="">담당자 없음</option>

                  {interns.map((intern) => (
                    <option
                      key={intern.id}
                      value={intern.id}
                    >
                      {intern.name}
                      {intern.status === "COMPLETED"
                        ? " (종료)"
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-grid">
              <label>
                상태
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as TaskStatus
                    )
                  }
                >
                  <option value="TODO">할 일</option>
                  <option value="IN_PROGRESS">
                    진행 중
                  </option>
                  <option value="REVIEW">검토</option>
                  <option value="DONE">완료</option>
                  <option value="HOLD">보류</option>
                </select>
              </label>

              <label>
                우선순위
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(
                      event.target.value as TaskPriority
                    )
                  }
                >
                  <option value="LOW">낮음</option>
                  <option value="MEDIUM">보통</option>
                  <option value="HIGH">높음</option>
                </select>
              </label>
            </div>

            <label>
              상위 Task
              <select
                value={parentTaskId}
                onChange={(event) =>
                  setParentTaskId(event.target.value)
                }
              >
                <option value="">
                  상위 Task 없음
                </option>

                {tasks
                  .filter(
                    (task) => task.id !== editingTaskId
                  )
                  .map((task) => (
                    <option
                      key={task.id}
                      value={task.id}
                    >
                      {task.title}
                    </option>
                  ))}
              </select>
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
                마감일
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) =>
                    setDueDate(event.target.value)
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
                {saving
                  ? "저장 중..."
                  : editingTaskId
                    ? "수정 저장"
                    : "Task 생성"}
              </button>
            </div>
          </form>
        </section>
      )}

      {tasks.length === 0 ? (
  <section className="panel">
    <div className="empty-state large">
      <strong>등록된 Task가 없습니다.</strong>
      <p>
        Workstream을 실제 수행 업무로 구체화해보세요.
      </p>
    </div>
  </section>
) : (
  <div className="task-workstream-list">
    {workstreams.map((workstream) => {
      const workstreamTasks = tasks.filter(
        (task) =>
          task.workstreamId === workstream.id
      );

      if (workstreamTasks.length === 0) {
        return null;
      }

      const rootTasks = workstreamTasks.filter(
        (task) => {
          if (!task.parentTaskId) {
            return true;
          }

          const parentExists =
            workstreamTasks.some(
              (parent) =>
                parent.id === task.parentTaskId
            );

          return !parentExists;
        }
      );

      return (
        <section
          className="task-workstream-group"
          key={workstream.id}
        >
          <div className="task-workstream-header">
            <div>
              <span>WORKSTREAM</span>
              <h3>{workstream.name}</h3>
            </div>

            <strong>
              {workstreamTasks.length} Tasks
            </strong>
          </div>

          <div className="task-tree">
            {rootTasks.map((task) =>
              renderTaskNode(task)
            )}
          </div>
        </section>
      );
    })}
  </div>
)}
    </>
  );
}

export default TasksTab;