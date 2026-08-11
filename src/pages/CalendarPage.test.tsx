import { render,screen,waitFor,within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import CalendarPage from "./CalendarPage";
import { getProjects } from "../services/projectService";
import { getAllTasks } from "../services/taskService";
import { getInterns } from "../services/internService";
import { intern,project,task } from "../test/fixtures";

vi.mock("../services/projectService",()=>({getProjects:vi.fn()}));vi.mock("../services/taskService",()=>({getAllTasks:vi.fn()}));vi.mock("../services/internService",()=>({getInterns:vi.fn()}));
describe("CalendarPage",()=>{beforeEach(()=>{vi.useFakeTimers({shouldAdvanceTime:true});vi.setSystemTime(new Date("2026-08-05T12:00:00Z"));vi.mocked(getProjects).mockResolvedValue([project]);vi.mocked(getInterns).mockResolvedValue([intern,{...intern,id:"intern-2",name:"이서연"}]);vi.mocked(getAllTasks).mockResolvedValue([task,{...task,id:"task-2",title:"화면 설계",assigneeInternIds:["intern-2"],startDate:"2026-08-04",dueDate:"2026-08-12"}])});afterEach(()=>vi.useRealTimers());it("팀원 필터를 달력과 월간 목록에 함께 적용한다",async()=>{const user=userEvent.setup({advanceTimers:vi.advanceTimersByTime});render(<MemoryRouter><CalendarPage/></MemoryRouter>);await waitFor(()=>expect(screen.getAllByText("기술 조사 시작").length).toBeGreaterThan(0));expect(screen.getAllByText("화면 설계 시작").length).toBeGreaterThan(0);await user.selectOptions(screen.getByLabelText("팀원"),"intern-1");expect(screen.getAllByText("기술 조사 시작").length).toBeGreaterThan(0);expect(screen.queryByText("화면 설계 시작")).not.toBeInTheDocument();});it("날짜 숫자를 누르면 해당 날짜의 일정 팝업을 연다",async()=>{const user=userEvent.setup({advanceTimers:vi.advanceTimersByTime});render(<MemoryRouter><CalendarPage/></MemoryRouter>);await waitFor(()=>expect(screen.getAllByText("기술 조사 시작").length).toBeGreaterThan(0));await user.click(screen.getByRole("button",{name:"2026년 8월 3일 월요일 일정 보기"}));const dialog=screen.getByRole("dialog");expect(dialog).toBeInTheDocument();expect(within(dialog).getByRole("heading",{name:"2026년 8월 3일 월요일"})).toBeInTheDocument();expect(within(dialog).getByRole("link",{name:/기술 조사 시작/})).toHaveAttribute("href",`/tasks/${task.id}`);});});
