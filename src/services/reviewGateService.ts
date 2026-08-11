import { supabase } from "../supabase";
import type { ReviewGate, ReviewGateResult, ReviewGateTarget } from "../types/domain";

type Row = { id:string;target_type:ReviewGateTarget;project_id:string|null;deliverable_id:string|null;result:ReviewGateResult;comments:string;drop_reason:string;reviewed_at:string;reviewed_by:string };
const structuredPrefix = "__IPH_REVIEW_V1__";

function parseComments(value: string) {
  if (!value.startsWith(structuredPrefix)) return { comments: value, nextAction: "", sourceUrl: "" };
  try {
    const parsed = JSON.parse(value.slice(structuredPrefix.length)) as { summary?: unknown; nextAction?: unknown; sourceUrl?: unknown };
    return { comments: String(parsed.summary ?? ""), nextAction: String(parsed.nextAction ?? ""), sourceUrl: String(parsed.sourceUrl ?? "") };
  } catch { return { comments: value, nextAction: "", sourceUrl: "" }; }
}

const map = (row: Row): ReviewGate => ({ id:row.id,targetType:row.target_type,projectId:row.project_id,deliverableId:row.deliverable_id,result:row.result,...parseComments(row.comments),dropReason:row.drop_reason,reviewedAt:row.reviewed_at,reviewedBy:row.reviewed_by });

export async function getReviewGates(targetType:ReviewGateTarget,targetId:string){const column=targetType==="PROJECT"?"project_id":"deliverable_id";const{data,error}=await supabase.from("review_gates").select("id,target_type,project_id,deliverable_id,result,comments,drop_reason,reviewed_at,reviewed_by").eq(column,targetId).order("reviewed_at",{ascending:false});if(error)throw new Error(`Review Gate 조회 실패: ${error.message}`);return((data??[])as Row[]).map(map)}

export async function createReviewGate(targetType:ReviewGateTarget,targetId:string,result:ReviewGateResult,summary:string,nextAction:string,sourceUrl:string,dropReason:string){const{data:user,error:userError}=await supabase.auth.getUser();if(userError||!user.user)throw new Error("로그인 사용자를 확인할 수 없습니다.");const comments=structuredPrefix+JSON.stringify({summary:summary.trim(),nextAction:nextAction.trim(),sourceUrl:sourceUrl.trim()});const{error}=await supabase.from("review_gates").insert({target_type:targetType,project_id:targetType==="PROJECT"?targetId:null,deliverable_id:targetType==="DELIVERABLE"?targetId:null,result,comments,drop_reason:dropReason.trim(),reviewed_by:user.user.id});if(error)throw new Error(`Review Gate 저장 실패: ${error.message}`)}
