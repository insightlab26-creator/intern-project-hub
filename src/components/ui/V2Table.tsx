import type { ReactNode } from "react";
import { translateUiText, useLocale } from "../../i18n/internLocale";

export type V2TableColumn = { key: string; label: string; className?: string };
export type V2TableRow = { id: string; cells: Record<string, ReactNode> };

export function V2Table({ columns, rows, emptyMessage = "표시할 데이터가 없습니다." }: { columns: V2TableColumn[]; rows: V2TableRow[]; emptyMessage?: string }) {
  const { t } = useLocale();
  return <div className="v2-table-wrap"><table className="v2-table"><thead><tr>{columns.map((column) => <th className={column.className} key={column.key}>{translateUiText(column.label, t)}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td className="v2-table__empty" colSpan={columns.length}>{translateUiText(emptyMessage, t)}</td></tr> : rows.map((row) => <tr key={row.id}>{columns.map((column) => <td className={column.className} key={column.key}>{row.cells[column.key]}</td>)}</tr>)}</tbody></table></div>;
}
