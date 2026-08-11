import ExcelJS from "exceljs";
import { readFile } from "node:fs/promises";

const sourceUrl = new URL("../sample-data/plan-import/sample-project-plan.json", import.meta.url);
const outputUrl = new URL("../sample-data/plan-import/sample-project-plan.xlsx", import.meta.url);
const data = JSON.parse(await readFile(sourceUrl, "utf8"));
const workbook = new ExcelJS.Workbook();
workbook.creator = "Intern Project Hub";

const sheets = [
  ["Projects", ["project_code","project_name","description","status","start_date","target_end_date"], data.projects],
  ["Workstreams", ["project_code","workstream_name","description","status","sort_order"], data.workstreams],
  ["Tasks", ["project_code","workstream_name","task_title","description","status","priority","parent_task_title","assignees","start_date","due_date"], data.tasks],
];
for (const [name, headers, rows] of sheets) {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(headers.map((header) => row[header] ?? "")));
  sheet.columns = headers.map((header) => ({ width: ["description","task_title","project_name"].includes(header) ? 42 : 23 }));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + headers.length)}1` };
}
const guide = workbook.addWorksheet("Guide");
guide.addRows([
  ["항목","설명"],
  ["적용 전","prerequisites.sql로 샘플 Intern 4명을 먼저 등록"],
  ["status","각 시트의 허용 상태 영문값 사용"],
  ["assignees","샘플 Intern 이름을 쉼표로 구분"],
  ["parent_task_title","같은 Project와 Workstream의 상위 Task 제목"],
  ["주의","full-sample-dataset.sql과 이 Excel은 둘 중 하나만 적용"],
]);
guide.columns = [{ width: 24 }, { width: 80 }];
guide.getRow(1).font = { bold: true };
await workbook.xlsx.writeFile(outputUrl.pathname);
