import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  createTask,
  getTasks,
  updateTask,
} from "../services/taskService";
import { getWorkstreams } from "../services/workstreamService";
import { getInterns } from "../services/internService";
import type {
  Intern,
  Task,
  TaskPriority,
  TaskStatus,
  Workstream,
} from "../types/domain";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "../constants/domainLabels";

type TasksTabProps = {
  projectId: string;
  onTaskSaved?: () => void | Promise<void>;
};

function TasksTab({ projectId, onTaskSaved }: TasksTabProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workstreams, setWorkstreams] = useState<
    Workstream[]
  >([]);
  const [interns, setInterns] = useState<Intern[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingTaskId, setEditingTaskId] =
    useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [workstreamId, setWorkstreamId] =
    useState("");
  const [parentTaskId, setParentTaskId] =
    useState("");
  const [assigneeInternIds, setAssigneeInternIds] =
    useState<string[]>([]);

  const [status, setStatus] =
    useState<TaskStatus>("TODO");

  const [priority, setPriority] =
    useState<TaskPriority>("MEDIUM");

  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [collapsedTaskIds, setCollapsedTaskIds] =
    useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    const loadTaskData = async () => {
      try {
        setLoading(true);
        setMessage("");

        const [
          taskList,
          workstreamList,
          internList,
        ] = await Promise.all([
          getTasks(projectId),
          getWorkstreams(projectId),
          getInterns(),
        ]);

        if (isMounted) {
          setTasks(taskList);
          setWorkstreams(workstreamList);
          setInterns(internList);
        }
      } catch (error) {
        console.error(error);

        if (isMounted) {
          setMessage(
            error instanceof Error
              ? error.message
              : "실행 업무 데이터를 불러오지 못했습니다."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTaskData();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setWorkstreamId("");
    setParentTaskId("");
    setAssigneeInternIds([]);
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
    setWorkstreamId(task.workstreamId);
    setParentTaskId(task.parentTaskId || "");

    setAssigneeInternIds(task.assigneeInternIds);

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

  const handleWorkstreamChange = (
    nextWorkstreamId: string
  ) => {
    setWorkstreamId(nextWorkstreamId);

    const selectedParent = tasks.find(
      (task) => task.id === parentTaskId
    );

    if (
      selectedParent &&
      selectedParent.workstreamId !==
        nextWorkstreamId
    ) {
      setParentTaskId("");
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!title.trim()) {
      setMessage("실행 업무 제목은 필수입니다.");
      return;
    }

    if (!workstreamId) {
      setMessage("업무 영역을 선택해주세요.");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      if (editingTaskId) {
        const existingTask = tasks.find(
          (task) => task.id === editingTaskId
        );

        if (!existingTask) {
          setMessage(
            "수정할 실행 업무를 찾을 수 없습니다."
          );
          return;
        }

        const updatedTask = await updateTask({
          taskId: editingTaskId,
          projectId,

          title,
          description,

          workstreamId,
          parentTaskId: parentTaskId || null,

          assigneeInternIds,

          status,
          priority,

          startDate: startDate || null,
          dueDate: dueDate || null,

          order: existingTask.order,
        });

        setTasks((previous) =>
          previous.map((task) =>
            task.id === updatedTask.id
              ? updatedTask
              : task
          )
        );

        setMessage("실행 업무가 수정되었습니다.");
      } else {
        const nextOrder =
          tasks
            .filter(
              (task) =>
                task.workstreamId === workstreamId
            )
            .reduce(
              (maximum, task) =>
                Math.max(maximum, task.order),
              0
            ) + 1;

        const createdTask = await createTask({
          projectId,

          title,
          description,

          workstreamId,
          parentTaskId: parentTaskId || null,

          assigneeInternIds,

          status,
          priority,

          startDate: startDate || null,
          dueDate: dueDate || null,

          order: nextOrder,
        });

        setTasks((previous) => [
          ...previous,
          createdTask,
        ]);

        setMessage("실행 업무가 생성되었습니다.");
      }

      await onTaskSaved?.();
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : editingTaskId
            ? "실행 업무 수정에 실패했습니다."
            : "실행 업무 생성에 실패했습니다."
      );
    } finally {
      setSaving(false);
    }
  };

  const getWorkstreamName = (
    id: string | null
  ) => {
    if (!id) return "-";

    return (
      workstreams.find(
        (workstream) => workstream.id === id
      )?.name || "-"
    );
  };

  const getInternNames = (
    internIds: string[]
  ) => {
    if (internIds.length === 0) {
      return "담당자 없음";
    }

    return internIds
      .map(
        (id) =>
          interns.find(
            (intern) => intern.id === id
          )?.name || "알 수 없음"
      )
      .join(", ");
  };

  const getChildTasks = (
    parentId: string
  ) => {
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
                    onClick={() =>
                      toggleTask(task.id)
                    }
                    title={
                      isCollapsed
                        ? "하위 실행 업무 펼치기"
                        : "하위 실행 업무 접기"
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
                  {TASK_STATUS_LABELS[task.status]}
                </span>

                <button
                  type="button"
                  className="edit-button compact-item-edit-button"
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
                업무 영역
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
                    task.assigneeInternIds
                  )}
                </strong>
              </span>

              <span>
                우선순위
                <strong>
                  {TASK_PRIORITY_LABELS[task.priority]}
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
          <h2>실행 업무</h2>
          <p>
            인턴에게 맡길 구체적인 결과물 단위입니다. 담당자·기한·진행 상태를 관리합니다.
          </p>
        </div>

        {!showForm && (
          <button
            className="primary-button"
            onClick={handleNewTask}
          >
            + 실행 업무 추가
          </button>
        )}
      </div>

      {message && (
        <div className="notice-message">
          {message}
        </div>
      )}

      {showForm && (
        <section className="project-form-card">
          <div className="task-form-header">
            <h2>
              {editingTaskId
                ? "실행 업무 수정"
                : "새 실행 업무"}
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
              실행 업무 제목 *
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
                업무 영역 *
                <select
                  value={workstreamId}
                  onChange={(event) =>
                    handleWorkstreamChange(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    업무 영역 선택
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
                  multiple
                  value={assigneeInternIds}
                  onChange={(event) =>
                    setAssigneeInternIds(
                      Array.from(
                        event.target.selectedOptions,
                        (option) => option.value
                      )
                    )
                  }
                >
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
                <small>여러 명은 Ctrl(Windows) 또는 Cmd(macOS)를 누르고 선택하세요.</small>
              </label>
            </div>

            <div className="form-grid">
              <label>
                상태
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target
                        .value as TaskStatus
                    )
                  }
                >
                  <option value="TODO">
                    할 일
                  </option>
                  <option value="IN_PROGRESS">
                    진행 중
                  </option>
                  <option value="REVIEW">
                    검토
                  </option>
                  <option value="DONE">
                    완료
                  </option>
                  <option value="HOLD">
                    보류
                  </option>
                </select>
              </label>

              <label>
                우선순위
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(
                      event.target
                        .value as TaskPriority
                    )
                  }
                >
                  <option value="LOW">
                    낮음
                  </option>
                  <option value="MEDIUM">
                    보통
                  </option>
                  <option value="HIGH">
                    높음
                  </option>
                </select>
              </label>
            </div>

            {editingTaskId && parentTaskId && <div className="notice-message">기존 상위 실행 업무 관계는 보존됩니다. 신규 하위 실행 업무 생성은 지원하지 않습니다.</div>}

            <div className="form-grid">
              <label>
                시작일
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                마감일
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) =>
                    setDueDate(
                      event.target.value
                    )
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
                    : "실행 업무 생성"}
              </button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <section className="panel">
          <div className="empty-state large">
            <strong>
              실행 업무 데이터를 불러오는 중입니다.
            </strong>
          </div>
        </section>
      ) : tasks.length === 0 ? (
        <section className="panel">
          <div className="empty-state large">
            <strong>
              등록된 실행 업무가 없습니다.
            </strong>
            <p>
              먼저 업무 영역을 만들고, 그 안에 인턴이 수행할 실행 업무를 등록해보세요.
            </p>
          </div>
        </section>
      ) : (
        <div className="task-workstream-list">
          {workstreams.map((workstream) => {
            const workstreamTasks = tasks.filter(
              (task) =>
                task.workstreamId ===
                workstream.id
            );

            if (workstreamTasks.length === 0) {
              return null;
            }

            const rootTasks =
              workstreamTasks.filter((task) => {
                if (!task.parentTaskId) {
                  return true;
                }

                return !workstreamTasks.some(
                  (parent) =>
                    parent.id ===
                    task.parentTaskId
                );
              });

            return (
              <section
                className="task-workstream-group"
                key={workstream.id}
              >
                <div className="task-workstream-header">
                  <div>
                    <span>업무 영역</span>
                    <h3>{workstream.name}</h3>
                  </div>

                  <strong>
                    실행 업무 {workstreamTasks.length}개
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
