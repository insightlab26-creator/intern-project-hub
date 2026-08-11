import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PlanImportModal from "./PlanImportModal";
import { importPlan, parsePlanImportFile } from "../services/planImportService";

vi.mock("../services/planImportService", () => ({ downloadPlanImportTemplate: vi.fn(), parsePlanImportFile: vi.fn(), importPlan: vi.fn() }));
const data = { projects: [{ projectCode: "P-1", projectName: "영상 AI", description: "", status: "ACTIVE" as const, startDate: null, targetEndDate: null }], workstreams: [{ projectCode: "P-1", workstreamName: "기획", description: "", status: "ACTIVE" as const, sortOrder: 1 }], tasks: [{ projectCode: "P-1", workstreamName: "기획", taskTitle: "기술 조사", description: "", status: "TODO" as const, priority: "HIGH" as const, parentTaskTitle: null, assigneeNames: ["김도윤"], startDate: null, dueDate: null }] };

describe("PlanImportModal", () => {
  it("선택한 파일을 미리 본 뒤 전체 계획을 등록한다", async () => {
    const user = userEvent.setup(); const imported = vi.fn();
    vi.mocked(parsePlanImportFile).mockResolvedValue({ data, errors: [] });
    vi.mocked(importPlan).mockResolvedValue({ projectCount: 1, workstreamCount: 1, taskCount: 1, assigneeCount: 1 });
    render(<PlanImportModal onClose={vi.fn()} onImported={imported} />);
    await user.upload(screen.getByLabelText("Excel 파일 선택"), new File(["xlsx"], "plan.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    expect(await screen.findByText("기술 조사")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "전체 계획 등록" }));
    await waitFor(() => expect(importPlan).toHaveBeenCalledWith(data));
    expect(imported).toHaveBeenCalled();
  });

  it("끌어다 놓은 파일도 검증한다", async () => {
    vi.mocked(parsePlanImportFile).mockResolvedValue({ data, errors: [] });
    render(<PlanImportModal onClose={vi.fn()} onImported={vi.fn()} />);
    const file = new File(["xlsx"], "drop-plan.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    fireEvent.drop(screen.getByText("Excel 파일을 여기에 끌어다 놓으세요").closest(".import-dropzone")!, { dataTransfer: { files: [file] } });
    expect(await screen.findByText("drop-plan.xlsx")).toBeInTheDocument();
    expect(parsePlanImportFile).toHaveBeenCalledWith(file);
  });

  it("검증 오류가 있으면 등록 버튼을 비활성화한다", async () => {
    const user = userEvent.setup();
    vi.mocked(parsePlanImportFile).mockResolvedValue({ data, errors: ["담당자를 찾을 수 없습니다."] });
    render(<PlanImportModal onClose={vi.fn()} onImported={vi.fn()} />);
    await user.upload(screen.getByLabelText("Excel 파일 선택"), new File(["x"], "bad.xlsx"));
    expect(await screen.findByText("담당자를 찾을 수 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "전체 계획 등록" })).toBeDisabled();
  });
});
