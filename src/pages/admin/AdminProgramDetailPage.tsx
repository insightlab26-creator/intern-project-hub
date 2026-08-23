import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ProgramFormModal from "../../components/programs/ProgramFormModal";
import ProgramDetailHeader from "../../components/programs/detail/ProgramDetailHeader";
import ProgramDetailTabs from "../../components/programs/detail/ProgramDetailTabs";
import ProgramOverviewTab from "../../components/programs/detail/ProgramOverviewTab";
import ProgramSummaryMetrics from "../../components/programs/detail/ProgramSummaryMetrics";
import ProgramParticipantsTab from "../../components/programs/detail/ProgramParticipantsTab";
import { programDetailTabs, type ProgramDetailTab } from "../../components/programs/detail/programDetailTabs";
import { V2Button } from "../../components/ui/V2Button";
import { V2Card } from "../../components/ui/V2Card";
import { V2EmptyState } from "../../components/ui/V2EmptyState";
import { getInterns } from "../../services/internService";
import { getProgram, getProgramEnrollments, getProgramProjects, saveProgram, saveProgramEnrollment } from "../../services/programService";
import { getProjects } from "../../services/projectService";
import type { EnrollmentStatus, Intern, Program, ProgramEnrollment, ProgramInput, ProgramProject, Project } from "../../types/domain";

const validTabs = new Set<ProgramDetailTab>(programDetailTabs.map((tab) => tab.id));
const errorMessage = (caught: unknown, fallback: string) => caught instanceof Error ? caught.message : fallback;

export default function AdminProgramDetailPage() {
  const { programId = "" } = useParams(); const [params, setParams] = useSearchParams(); const [program, setProgram] = useState<Program | null>(null); const [interns, setInterns] = useState<Intern[]>([]); const [projects, setProjects] = useState<Project[]>([]); const [enrollments, setEnrollments] = useState<ProgramEnrollment[]>([]); const [links, setLinks] = useState<ProgramProject[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const [enrollmentSaving, setEnrollmentSaving] = useState(false); const [formError, setFormError] = useState("");
  const activeTab = validTabs.has(params.get("tab") as ProgramDetailTab) ? params.get("tab") as ProgramDetailTab : "overview";
  const load = useCallback(async () => { if (!programId) { setError("Program not found."); setLoading(false); return; } try { setLoading(true); setError(""); const [programItem, internItems, projectItems, enrollmentItems, linkItems] = await Promise.all([getProgram(programId), getInterns(), getProjects(), getProgramEnrollments(programId), getProgramProjects(programId)]); setProgram(programItem); setInterns(internItems); setProjects(projectItems); setEnrollments(enrollmentItems); setLinks(linkItems); } catch (caught) { setError(errorMessage(caught, "Program not found or unavailable.")); } finally { setLoading(false); } }, [programId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const relations = useMemo(() => ({ enrollments, projects: links }), [enrollments, links]);
  const save = async (input: ProgramInput, id?: string) => { if (!id) return; try { setSaving(true); setFormError(""); setProgram(await saveProgram(input, id)); setEditing(false); } catch (caught) { setFormError(errorMessage(caught, "Program을 저장하지 못했습니다.")); throw caught; } finally { setSaving(false); } };
  const saveEnrollment = async (internId: string, status: EnrollmentStatus, startDate: string | null, endDate: string | null, id?: string) => { if (!programId) return; try { setEnrollmentSaving(true); await saveProgramEnrollment(programId, internId, status, startDate, endDate, id); setEnrollments(await getProgramEnrollments(programId)); } finally { setEnrollmentSaving(false); } };
  if (loading) return <V2Card><V2EmptyState title="Loading program" description="프로그램 운영 정보를 불러오고 있습니다." /></V2Card>;
  if (error || !program) return <V2Card><V2EmptyState title="Program not found" description={error || "요청한 Program을 찾을 수 없습니다."} action={<V2Button type="button" onClick={() => void load()}>Try again</V2Button>} /></V2Card>;
  const placeholder = <V2Card><V2EmptyState title={`${programDetailTabs.find((tab) => tab.id === activeTab)?.label} is coming next`} description={activeTab === "projects" ? "Program-Project relationship management will appear here." : "Program evaluations will appear here."} /></V2Card>;
  return <><ProgramDetailHeader program={program} onEdit={() => { setFormError(""); setEditing(true); }} /><ProgramSummaryMetrics relations={relations} /><ProgramDetailTabs activeTab={activeTab} onChange={(tab) => setParams({ tab })} />{activeTab === "overview" ? <ProgramOverviewTab program={program} enrollments={enrollments} links={links} interns={interns} projects={projects} /> : activeTab === "interns" ? <ProgramParticipantsTab enrollments={enrollments} interns={interns} saving={enrollmentSaving} onSave={saveEnrollment} /> : placeholder}{editing && <ProgramFormModal program={program} saving={saving} error={formError} onClose={() => setEditing(false)} onSave={save} />}</>;
}
