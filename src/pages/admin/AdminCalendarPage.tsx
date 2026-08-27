import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { V2Badge } from "../../components/ui/V2Badge";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2Modal } from "../../components/ui/V2Modal";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { V2Select } from "../../components/ui/V2Select";
import { TASK_STATUS_LABELS } from "../../constants/domainLabels";
import { getInterns } from "../../services/internService";
import { getProjects } from "../../services/projectService";
import { getAllTasks } from "../../services/taskService";
import type { Intern, Project, Task } from "../../types/domain";
import { buildCalendarEvents, calendarEventLabels, formatCalendarDate, getMonthDays, toIsoDate, type CalendarEvent, type CalendarEventType } from "./calendar/calendarEvents";

const eventVariant: Record<CalendarEventType, "info" | "warning" | "success" | "danger"> = { PROJECT_START: "info", PROJECT_END: "warning", TASK_START: "success", TASK_DUE: "danger" };
const taskVariant = { TODO: "neutral", IN_PROGRESS: "info", REVIEW: "warning", DONE: "success", HOLD: "danger" } as const;
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const maxEventsPerDay = 3;

function errorMessage(caught: unknown): string { return caught instanceof Error ? caught.message : "Unable to load calendar data."; }
function formatMonth(date: Date): string { return date.toLocaleDateString("en-US", { year: "numeric", month: "long" }); }

export default function AdminCalendarPage() {
  const [current, setCurrent] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [interns, setInterns] = useState<Intern[] | null>(null);
  const [projectId, setProjectId] = useState("");
  const [internId, setInternId] = useState("");
  const [eventType, setEventType] = useState<"ALL" | "PROJECT" | "TASK">("ALL");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const [projectItems, taskItems, internItems] = await Promise.all([getProjects(), getAllTasks(), getInterns()]);
      setProjects(projectItems); setTasks(taskItems); setInterns(internItems);
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const events = useMemo(() => projects && tasks && interns ? buildCalendarEvents(projects, tasks, interns, { projectId, internId, eventType }) : [], [eventType, internId, interns, projectId, projects, tasks]);
  const days = useMemo(() => getMonthDays(current), [current]);
  const monthPrefix = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
  const monthEvents = events.filter((event) => event.date.startsWith(monthPrefix));
  const eventsByDate = useMemo(() => events.reduce((map, event) => {
    const items = map.get(event.date) ?? [];
    items.push(event);
    map.set(event.date, items);
    return map;
  }, new Map<string, CalendarEvent[]>()), [events]);
  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];
  const projectDeadlineCount = monthEvents.filter((event) => event.type === "PROJECT_END").length;
  const taskDueCount = monthEvents.filter((event) => event.type === "TASK_DUE").length;

  if (loading) return <V2Card><V2EmptyState title="Loading calendar" description="프로젝트와 실행 업무 일정을 불러오고 있습니다." /></V2Card>;
  if (error) return <V2Card><V2EmptyState title="Unable to load calendar" description={error} action={<V2Button type="button" variant="secondary" onClick={() => void load()}>Retry</V2Button>} /></V2Card>;

  return <section className="v2-calendar">
    <V2PageHeader title="Calendar" description="Project and task schedules across the program." />
    <div className="v2-calendar__toolbar">
      <div className="v2-calendar__filters">
        <V2Select label="PROJECT" aria-label="Filter calendar by project" value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">All projects</option>{projects?.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</V2Select>
        <V2Select label="INTERN" aria-label="Filter calendar by intern" value={internId} onChange={(event) => setInternId(event.target.value)}><option value="">All interns</option>{interns?.map((intern) => <option key={intern.id} value={intern.id}>{intern.name}</option>)}</V2Select>
        <V2Select label="EVENT TYPE" aria-label="Filter calendar by event type" value={eventType} onChange={(event) => setEventType(event.target.value as "ALL" | "PROJECT" | "TASK")}><option value="ALL">All events</option><option value="PROJECT">Project events</option><option value="TASK">Task events</option></V2Select>
      </div>
      <div className="v2-calendar__month-controls"><V2Button type="button" variant="secondary" aria-label="Previous month" onClick={() => setCurrent((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}>←</V2Button><h2>{formatMonth(current)}</h2><V2Button type="button" variant="secondary" aria-label="Next month" onClick={() => setCurrent((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}>→</V2Button><V2Button type="button" variant="ghost" onClick={() => setCurrent(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Today</V2Button></div>
    </div>
    <div className="v2-calendar__month-summary"><span><small>THIS MONTH</small><strong>{monthEvents.length} events</strong></span><span><small>PROJECT DEADLINES</small><strong>{projectDeadlineCount}</strong></span><span><small>TASK DUE</small><strong>{taskDueCount}</strong></span></div>
    {events.length === 0 ? <V2Card><V2EmptyState title="No events" description="선택한 조건에 해당하는 Project 또는 Task 일정이 없습니다." /></V2Card> : <V2Card className="v2-calendar__surface">
      <div className="v2-calendar__weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
      <div className="v2-calendar__grid">{days.map((day) => {
        const value = toIsoDate(day); const dayEvents = eventsByDate.get(value) ?? []; const outside = day.getMonth() !== current.getMonth(); const today = value === toIsoDate(new Date());
        return <section className={`v2-calendar__day${outside ? " v2-calendar__day--outside" : ""}${today ? " v2-calendar__day--today" : ""}`} key={value}><button className="v2-calendar__date" type="button" aria-label={`${formatCalendarDate(value)} events`} onClick={() => setSelectedDate(value)}>{day.getDate()}</button><div className="v2-calendar__events">{dayEvents.slice(0, maxEventsPerDay).map((event) => <button type="button" className={`v2-calendar__event v2-calendar__event--${event.type.toLowerCase().replace("_", "-")}`} title={`${calendarEventLabels[event.type]}: ${event.title}`} key={event.id} onClick={() => setSelectedDate(value)}><i /><span>{event.title}</span></button>)}{dayEvents.length > maxEventsPerDay && <button type="button" className="v2-calendar__more" onClick={() => setSelectedDate(value)}>+{dayEvents.length - maxEventsPerDay} more</button>}</div></section>;
      })}</div>
    </V2Card>}
    <V2Modal open={Boolean(selectedDate)} title={selectedDate ? formatCalendarDate(selectedDate) : "Calendar events"} onClose={() => setSelectedDate(null)}>
      {selectedEvents.length === 0 ? <V2EmptyState title="No events" description="이 날짜에 등록된 Project 또는 Task 일정이 없습니다." /> : <div className="v2-calendar-detail">{(["PROJECT_START", "PROJECT_END", "TASK_START", "TASK_DUE"] as CalendarEventType[]).map((type) => {
        const items = selectedEvents.filter((event) => event.type === type); if (!items.length) return null;
        return <section key={type}><h3>{calendarEventLabels[type]}</h3>{items.map((event) => <CalendarDetailEvent event={event} key={event.id} />)}</section>;
      })}</div>}
    </V2Modal>
  </section>;
}

function CalendarDetailEvent({ event }: { event: CalendarEvent }) {
  const destination = event.taskId ? `/admin/tasks/${event.taskId}` : `/admin/projects/${event.projectId}`;
  return <Link to={destination} className="v2-calendar-detail__event"><V2Badge variant={eventVariant[event.type]}>{calendarEventLabels[event.type]}</V2Badge><div><strong>{event.title}</strong><small>{event.projectName}{event.taskId && event.assigneeNames.length ? ` · ${event.assigneeNames.join(", ")}` : ""}</small>{event.status && <V2Badge variant={taskVariant[event.status]}>{TASK_STATUS_LABELS[event.status]}</V2Badge>}</div><span>Open →</span></Link>;
}
