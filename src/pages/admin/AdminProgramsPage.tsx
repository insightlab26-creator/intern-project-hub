import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProgramFormModal from "../../components/programs/ProgramFormModal";
import ProgramsSummary from "../../components/programs/ProgramsSummary";
import ProgramsTable from "../../components/programs/ProgramsTable";
import { getProgramRelationMetrics, type ProgramRelations } from "../../components/programs/programRelations";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { V2Input } from "../../components/ui/V2Input";
import { V2PageHeader } from "../../components/ui/V2PageHeader";
import { V2Select } from "../../components/ui/V2Select";
import { getProgramEnrollments, getProgramProjects, getPrograms, saveProgram } from "../../services/programService";
import type { Program, ProgramInput, ProgramStatus } from "../../types/domain";

const errorMessage = (caught: unknown, fallback: string) => caught instanceof Error ? caught.message : fallback;

export default function AdminProgramsPage() {
  const navigate = useNavigate(); const [programs, setPrograms] = useState<Program[]>([]); const [relationsByProgram, setRelationsByProgram] = useState<Map<string, ProgramRelations>>(new Map()); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [query, setQuery] = useState(""); const [status, setStatus] = useState<"ALL" | ProgramStatus>("ALL"); const [editingProgram, setEditingProgram] = useState<Program | undefined>(); const [formOpen, setFormOpen] = useState(false); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState("");
  const load = useCallback(async () => { try { setLoading(true); setError(""); const items = await getPrograms(); setPrograms(items); const relationRows = await Promise.all(items.map(async (program) => { const [enrollmentResult, projectResult] = await Promise.allSettled([getProgramEnrollments(program.id), getProgramProjects(program.id)]); const errors = [enrollmentResult, projectResult].filter((result): result is PromiseRejectedResult => result.status === "rejected").map((result) => errorMessage(result.reason, "Program 관계를 불러오지 못했습니다.")); return [program.id, { enrollments: enrollmentResult.status === "fulfilled" ? enrollmentResult.value : null, projects: projectResult.status === "fulfilled" ? projectResult.value : null, error: errors.join(" ") || undefined }] as const; })); setRelationsByProgram(new Map(relationRows)); } catch (caught) { setError(errorMessage(caught, "프로그램을 불러오지 못했습니다.")); } finally { setLoading(false); } }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const summary = useMemo(() => ({ total: programs.length, active: programs.filter((program) => program.status === "ACTIVE").length, planning: programs.filter((program) => program.status === "PLANNING").length, completed: programs.filter((program) => program.status === "COMPLETED").length, activeEnrollments: [...relationsByProgram.values()].reduce((total, relations) => total + getProgramRelationMetrics(relations).activeEnrollments, 0) }), [programs, relationsByProgram]);
  const visiblePrograms = useMemo(() => { const needle = query.trim().toLocaleLowerCase("ko-KR"); return programs.filter((program) => (!needle || `${program.name} ${program.code} ${program.description}`.toLocaleLowerCase("ko-KR").includes(needle)) && (status === "ALL" || program.status === status)); }, [programs, query, status]);
  const openCreate = () => { setEditingProgram(undefined); setFormError(""); setFormOpen(true); }; const openEdit = (program: Program) => { setEditingProgram(program); setFormError(""); setFormOpen(true); };
  const save = async (input: ProgramInput, id?: string) => { try { setSaving(true); setFormError(""); const saved = await saveProgram(input, id); setPrograms((current) => id ? current.map((program) => program.id === saved.id ? saved : program) : [saved, ...current]); if (!id) setRelationsByProgram((current) => new Map(current).set(saved.id, { enrollments: [], projects: [] })); setFormOpen(false); } catch (caught) { setFormError(errorMessage(caught, "Program을 저장하지 못했습니다.")); throw caught; } finally { setSaving(false); } };
  if (loading) return <V2Card><V2EmptyState title="Loading programs" description="프로그램 운영 현황을 불러오고 있습니다." /></V2Card>;
  if (error) return <V2Card><V2EmptyState title="Unable to load programs" description={error} action={<V2Button type="button" onClick={() => void load()}>Try again</V2Button>} /></V2Card>;
  return <section className="v2-programs"><V2PageHeader title="Programs" description="인턴 프로그램별 운영 기간, 참여 인턴, 연결 프로젝트를 관리합니다." actions={<V2Button type="button" onClick={openCreate}>+ New Program</V2Button>} /><ProgramsSummary {...summary} /><div className="v2-programs__filters"><V2Input aria-label="Search programs" placeholder="Search name, code, or description…" value={query} onChange={(event) => setQuery(event.target.value)} /><V2Select aria-label="Filter programs by status" value={status} onChange={(event) => setStatus(event.target.value as "ALL" | ProgramStatus)}><option value="ALL">All statuses</option><option value="PLANNING">Planning</option><option value="ACTIVE">Active</option><option value="COMPLETED">Completed</option><option value="ARCHIVED">Archived</option></V2Select></div>{programs.length === 0 ? <V2Card><V2EmptyState title="No programs yet" description="새 인턴 프로그램을 만들어 운영 관계를 관리하세요." action={<V2Button type="button" onClick={openCreate}>+ New Program</V2Button>} /></V2Card> : <ProgramsTable programs={visiblePrograms} relationsByProgram={relationsByProgram} onView={(id) => navigate(`/admin/programs/${id}`)} onEdit={openEdit} />}{formOpen && <ProgramFormModal program={editingProgram} saving={saving} error={formError} onClose={() => setFormOpen(false)} onSave={save} />}</section>;
}
