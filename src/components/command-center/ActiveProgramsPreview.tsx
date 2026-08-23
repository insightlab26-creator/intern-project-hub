import { Link } from "react-router-dom";
import { V2Badge } from "../ui/V2Badge";
import { V2Card } from "../ui/V2Card";
import { V2EmptyState } from "../ui/V2EmptyState";
import { PanelHeader } from "./ProjectPortfolioPreview";
import type { Program } from "../../types/domain";

export default function ActiveProgramsPreview({ programs, activeEnrollments, enrollmentError }: { programs: Program[]; activeEnrollments: Map<string, number> | null; enrollmentError: string }) { return <V2Card className="v2-command-panel v2-command-widget"><PanelHeader title="Active Programs" to="/v2/admin/programs" />{programs.length === 0 ? <V2EmptyState title="No active programs" description="현재 운영 중인 프로그램이 없습니다." /> : <div className="v2-command-widget__list">{programs.slice(0, 3).map((program) => <Link to={`/v2/admin/programs/${program.id}`} className="v2-command-widget__row" key={program.id}><div><strong>{program.name}</strong><span>{program.startDate ?? "—"} — {program.endDate ?? "—"}</span></div><V2Badge variant="success">ACTIVE</V2Badge><small>{activeEnrollments ? `${activeEnrollments.get(program.id) ?? 0} active enrollments` : enrollmentError ? "Enrollment unavailable" : "Loading…"}</small></Link>)}</div>}</V2Card>; }
