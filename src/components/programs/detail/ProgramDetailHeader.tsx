import { Link } from "react-router-dom";
import { PROGRAM_STATUS_LABELS } from "../../../constants/domainLabels";
import type { Program, ProgramStatus } from "../../../types/domain";
import { V2Badge } from "../../ui/V2Badge";
import { V2Button } from "../../ui/V2Button";

type Props = { program: Program; onEdit: () => void };
const statusVariant: Record<ProgramStatus, "neutral" | "success" | "info"> = { PLANNING: "neutral", ACTIVE: "success", COMPLETED: "info", ARCHIVED: "neutral" };
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`)) : "—";

export default function ProgramDetailHeader({ program, onEdit }: Props) {
  return <><nav className="v2-detail-breadcrumb" aria-label="Breadcrumb"><Link to="/admin/programs">Programs</Link><span>/</span><span>Program Detail</span></nav><header className="v2-detail-header"><div><div className="v2-detail-header__meta"><span>{program.code}</span><V2Badge variant={statusVariant[program.status]}>{PROGRAM_STATUS_LABELS[program.status]}</V2Badge></div><h1>{program.name}</h1><p>{program.description || "—"}</p><dl className="v2-detail-header__facts"><div><dt>Period</dt><dd>{formatDate(program.startDate)} — {formatDate(program.endDate)}</dd></div><div><dt>Status</dt><dd>{PROGRAM_STATUS_LABELS[program.status]}</dd></div></dl></div><div className="v2-detail-header__actions"><V2Button type="button" variant="secondary" onClick={onEdit}>Edit Program</V2Button></div></header></>;
}
