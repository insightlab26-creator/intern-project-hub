import { supabase } from "../supabase";
import type { DocumentLink, DocumentLinkInput } from "../types/domain";

type StoredDocumentStatus = "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "CHANGES_REQUESTED" | "ARCHIVED";

type DocumentRow = {
  id: string;
  project_id: string;
  task_id: string | null;
  title: string;
  description: string;
  status: StoredDocumentStatus;
  current_version: number;
  created_at: string;
  updated_at: string;
};

type VersionRow = {
  deliverable_id: string;
  url: string;
  submitted_at: string;
  version_number: number;
};

type ResourceRow = {
  id: string; project_id: string; task_id: string | null; title: string; description: string;
  url: string; status: "ACTIVE" | "ARCHIVED"; created_at: string; updated_at: string;
};

export async function getDocuments(): Promise<DocumentLink[]> {
  const [documentsResult, versionsResult, resourcesResult] = await Promise.all([
    supabase.from("deliverables").select("id, project_id, task_id, title, description, status, current_version, created_at, updated_at").order("updated_at", { ascending: false }),
    supabase.from("deliverable_versions").select("deliverable_id, url, submitted_at, version_number").order("version_number", { ascending: false }),
    supabase.from("resources").select("id, project_id, task_id, title, description, url, status, created_at, updated_at").order("updated_at", { ascending: false }),
  ]);
  if (documentsResult.error) throw new Error(`문서 조회 실패: ${documentsResult.error.message}`);
  if (versionsResult.error) throw new Error(`문서 링크 조회 실패: ${versionsResult.error.message}`);
  if (resourcesResult.error) throw new Error(`기존 자료 링크 조회 실패: ${resourcesResult.error.message}`);

  const latestUrls = new Map<string, string>();
  ((versionsResult.data ?? []) as VersionRow[]).forEach((version) => {
    if (!latestUrls.has(version.deliverable_id)) latestUrls.set(version.deliverable_id, version.url);
  });

  const documents = ((documentsResult.data ?? []) as DocumentRow[]).map((row): DocumentLink => ({
    id: row.id,
    projectId: row.project_id,
    taskId: row.task_id,
    title: row.title,
    description: row.description,
    url: latestUrls.get(row.id) ?? "",
    archived: row.status === "ARCHIVED",
    source: "DOCUMENT",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
  const resources = ((resourcesResult.data ?? []) as ResourceRow[]).map((row): DocumentLink => ({
    id: row.id, projectId: row.project_id, taskId: row.task_id, title: row.title,
    description: row.description, url: row.url, archived: row.status === "ARCHIVED",
    source: "RESOURCE", createdAt: row.created_at, updatedAt: row.updated_at,
  }));
  return [...documents, ...resources].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveDocument(input: DocumentLinkInput, id?: string, previousUrl = ""): Promise<void> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("로그인이 필요합니다.");

  if (id && input.source === "RESOURCE") {
    const { error } = await supabase.from("resources").update({
      project_id: input.projectId, task_id: input.taskId, title: input.title.trim(),
      description: input.description.trim(), url: input.url.trim(),
      status: input.archived ? "ARCHIVED" : "ACTIVE", updated_by: authData.user.id,
    }).eq("id", id);
    if (error) throw new Error(`문서 수정 실패: ${error.message}`);
    return;
  }

  const urlChanged = input.url.trim() !== previousUrl;
  const values = {
    project_id: input.projectId,
    task_id: input.taskId,
    title: input.title.trim(),
    description: input.description.trim(),
    status: input.archived && !urlChanged ? "ARCHIVED" : "SUBMITTED",
    updated_by: authData.user.id,
  };
  const result = id
    ? await supabase.from("deliverables").update(values).eq("id", id).select("id").single()
    : await supabase.from("deliverables").insert({ ...values, status: "DRAFT", created_by: authData.user.id }).select("id").single();
  if (result.error) throw new Error(`문서 ${id ? "수정" : "등록"} 실패: ${result.error.message}`);

  const documentId = String(result.data.id);
  if (urlChanged) {
    const { error } = await supabase.rpc("submit_deliverable_version", {
      p_deliverable_id: documentId,
      p_url: input.url.trim(),
      p_notes: "",
    });
    if (error) throw new Error(`문서 링크 저장 실패: ${error.message}`);
  }
  if (input.archived && urlChanged) {
    const { error } = await supabase.from("deliverables").update({ status: "ARCHIVED", updated_by: authData.user.id }).eq("id", documentId);
    if (error) throw new Error(`문서 보관 처리 실패: ${error.message}`);
  }
}
