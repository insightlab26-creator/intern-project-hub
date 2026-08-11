import { render,screen,waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach,describe,expect,it,vi } from "vitest";
import DashboardPage from "./DashboardPage";
import { dashboardSummary } from "../test/fixtures";
import { getDashboardSummary } from "../services/dashboardService";
import { getDashboardWidgets,saveDashboardWidgets } from "../services/preferenceService";

vi.mock("../services/dashboardService",()=>({getDashboardSummary:vi.fn()}));
vi.mock("../services/preferenceService",()=>({DEFAULT_DASHBOARD_WIDGETS:["TOTAL_TASKS","IN_PROGRESS","COMPLETION_RATE","DUE_SOON"],getDashboardWidgets:vi.fn(),saveDashboardWidgets:vi.fn()}));
const profile={id:"admin-1",email:"admin@example.com",display_name:"관리자",global_role:"ADMIN" as const,status:"ACTIVE" as const};
describe("DashboardPage",()=>{beforeEach(()=>{vi.mocked(getDashboardSummary).mockResolvedValue(dashboardSummary);vi.mocked(getDashboardWidgets).mockResolvedValue(["TOTAL_TASKS","COMPLETION_RATE"]);vi.mocked(saveDashboardWidgets).mockResolvedValue()});it("저장된 지표만 표시하고 새 지표 구성을 저장한다",async()=>{const user=userEvent.setup();render(<MemoryRouter><DashboardPage profile={profile}/></MemoryRouter>);expect(await screen.findByText("3건")).toBeInTheDocument();expect(screen.getAllByText("33%").length).toBeGreaterThan(0);expect(screen.queryByText("활성 Project")).not.toBeInTheDocument();await user.click(screen.getByRole("button",{name:"지표 설정"}));await user.click(screen.getByRole("checkbox",{name:"활성 Project"}));await user.click(screen.getByRole("button",{name:"설정 저장"}));await waitFor(()=>expect(saveDashboardWidgets).toHaveBeenCalledWith(["TOTAL_TASKS","COMPLETION_RATE","ACTIVE_PROJECTS"]));});});
