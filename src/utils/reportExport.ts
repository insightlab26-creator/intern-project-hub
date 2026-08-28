import { localDateInputValue } from "./localDate";

export type ExportColumn<Row> = { key: keyof Row; label: string };

function safeName(value: string) { return value.replace(/[^a-zA-Z0-9가-힣_-]+/g, "_").replace(/^_+|_+$/g, "") || "report"; }
function download(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); }
function cell(value: unknown) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }

export function reportFilename(base: string, extension: "csv" | "xlsx") { return `${safeName(base)}_${localDateInputValue()}.${extension}`; }

export function exportReportCsv<Row extends object>(filenameBase: string, columns: ExportColumn<Row>[], rows: Row[]) {
  const content = [columns.map((column) => cell(column.label)).join(","), ...rows.map((row) => columns.map((column) => cell(row[column.key])).join(","))].join("\r\n");
  download(new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" }), reportFilename(filenameBase, "csv"));
}

export async function exportReportExcel<Row extends object>(filenameBase: string, sheetName: string, columns: ExportColumn<Row>[], rows: Row[]) {
  const ExcelJS = await import("exceljs"); const workbook = new ExcelJS.Workbook(); const sheet = workbook.addWorksheet(sheetName.slice(0, 31));
  sheet.columns = columns.map((column) => ({ header: column.label, key: String(column.key), width: Math.min(40, Math.max(14, column.label.length + 4)) }));
  rows.forEach((row) => { const item: Record<string, unknown> = {}; columns.forEach((column) => { item[String(column.key)] = row[column.key] ?? ""; }); sheet.addRow(item); });
  sheet.getRow(1).font = { bold: true }; sheet.views = [{ state: "frozen", ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer(); download(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), reportFilename(filenameBase, "xlsx"));
}
