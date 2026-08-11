import { useEffect, useState, type DragEvent } from "react";
import { downloadPlanImportTemplate, importPlan, parsePlanImportFile } from "../services/planImportService";
import type { PlanImportData } from "../types/domain";

export default function PlanImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void | Promise<void> }) {
  const [data, setData] = useState<PlanImportData | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [loading, onClose]);

  const choose = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setData(null); setFileName(file.name); setErrors(["Excel .xlsx 파일만 업로드할 수 있습니다."]); return;
    }
    try {
      setLoading(true); setMessage(""); setErrors([]); setFileName(file.name);
      const parsed = await parsePlanImportFile(file);
      setData(parsed.data); setErrors(parsed.errors);
    } catch (caught) {
      setData(null); setErrors([caught instanceof Error ? caught.message : "Excel 파일을 읽지 못했습니다."]);
    } finally { setLoading(false); }
  };
  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); setDragging(false);
    if (!loading) void choose(event.dataTransfer.files[0]);
  };
  const submit = async () => {
    if (!data || errors.length) return;
    try {
      setLoading(true); setMessage("");
      const result = await importPlan(data);
      setMessage(`Project ${result.projectCount}개, Project Area ${result.workstreamCount}개, Work Package ${result.taskCount}개를 등록했습니다.`);
      setData(null); setFileName(""); await onImported();
    } catch (caught) {
      setErrors([caught instanceof Error ? caught.message : "계획을 등록하지 못했습니다."]);
    } finally { setLoading(false); }
  };

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onClose(); }}>
    <section className="plan-import-modal" role="dialog" aria-modal="true" aria-labelledby="plan-import-title">
      <header className="plan-import-modal-header"><div><p className="eyebrow">PROJECTS</p><h2 id="plan-import-title">Plan Import</h2><p>Excel 계획을 검증한 뒤 Project와 업무 구조를 한 번에 등록합니다.</p></div><button className="modal-close-button" aria-label="Plan Import 닫기" disabled={loading} onClick={onClose}>×</button></header>
      <div className="plan-import-modal-body">
        <section className="import-guide"><div className="import-guide-heading"><h3>등록 순서</h3><button className="secondary-button" onClick={() => void downloadPlanImportTemplate()}>Excel 양식 다운로드</button></div><ol><li><strong>양식 다운로드</strong> 후 Projects, Workstreams, Tasks 시트를 작성합니다.</li><li><strong>파일 선택</strong> 버튼을 누르거나 아래 영역에 파일을 끌어다 놓습니다.</li><li><strong>검증 결과</strong>에서 Project, Project Area, Work Package와 담당자를 확인합니다.</li><li>오류가 없다면 <strong>전체 계획 등록</strong>을 눌러 저장합니다.</li></ol><p>기존 Project는 수정하지 않습니다. 담당자는 Interns에 등록된 활동 중인 이름과 정확히 같아야 합니다.</p></section>
        <div className={`import-dropzone ${dragging ? "dragging" : ""} ${loading ? "disabled" : ""}`} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={drop}>
          <span className="import-drop-icon">↓</span><strong>{loading ? "파일 확인 중..." : "Excel 파일을 여기에 끌어다 놓으세요"}</strong><p>또는</p><label className="import-file-button">파일 선택<input aria-label="Excel 파일 선택" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={loading} onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ""; }} /></label><small>{fileName || ".xlsx 파일 1개"}</small>
        </div>
        {message && <div className="notice-message">{message}</div>}
        {errors.length > 0 && <section className="import-errors"><strong>등록 전 수정이 필요합니다.</strong><ul>{errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul></section>}
        {data && <section className="import-preview"><div className="import-counts"><article><span>Projects</span><strong>{data.projects.length}</strong></article><article><span>Project Areas</span><strong>{data.workstreams.length}</strong></article><article><span>Work Packages</span><strong>{data.tasks.length}</strong></article></div><div className="import-preview-table"><div className="import-preview-row import-preview-header"><span>Project</span><span>Project Area</span><span>Work Package</span><span>담당자</span></div>{data.tasks.slice(0, 12).map((task, index) => <div className="import-preview-row" key={`${task.projectCode}-${task.taskTitle}-${index}`}><span>{task.projectCode}</span><span>{task.workstreamName}</span><strong>{task.taskTitle}</strong><span>{task.assigneeNames.join(", ") || "미배정"}</span></div>)}</div>{data.tasks.length > 12 && <p className="import-more">외 {data.tasks.length - 12}개 Work Package</p>}<div className="plan-import-actions"><button className="secondary-button" disabled={loading} onClick={onClose}>취소</button><button className="primary-button" disabled={loading || errors.length > 0} onClick={() => void submit()}>{loading ? "등록 중..." : "전체 계획 등록"}</button></div></section>}
      </div>
    </section>
  </div>;
}
