import { supabase } from "../supabase";
import type { DashboardWidgetKey, SearchScope } from "../types/domain";

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetKey[] = ["TOTAL_TASKS", "IN_PROGRESS", "COMPLETION_RATE", "DUE_SOON"];
const AVAILABLE_DASHBOARD_WIDGETS: DashboardWidgetKey[] = ["TOTAL_TASKS", "IN_PROGRESS", "COMPLETION_RATE", "DUE_SOON", "ACTIVE_PROJECTS", "ACTIVE_PROGRAMS", "ACTIVE_INTERNS", "OVERDUE_TASKS", "UNASSIGNED_TASKS", "REVIEW_TASKS", "PENDING_DELIVERABLES", "FINALIZED_REVIEWS"];
export const DEFAULT_SEARCH_SCOPES: SearchScope[] = ["PROJECTS", "TASKS", "DELIVERABLES"];
const AVAILABLE_SEARCH_SCOPES: SearchScope[] = ["PROJECTS", "WORKSTREAMS", "TASKS", "PROGRAMS", "INTERNS", "DELIVERABLES"];

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("로그인이 필요합니다.");
  return data.user.id;
}

export async function getDashboardWidgets(): Promise<DashboardWidgetKey[]> {
  const userId = await currentUserId();
  const { data, error } = await supabase.from("dashboard_preferences").select("widget_keys").eq("profile_id", userId).maybeSingle();
  if (error) throw new Error(`Dashboard 설정 조회 실패: ${error.message}`);
  const saved = (data?.widget_keys as DashboardWidgetKey[] | undefined) ?? DEFAULT_DASHBOARD_WIDGETS;
  const available = saved.filter((key) => AVAILABLE_DASHBOARD_WIDGETS.includes(key));
  return available.length > 0 ? available : DEFAULT_DASHBOARD_WIDGETS;
}

export async function saveDashboardWidgets(widgetKeys: DashboardWidgetKey[]): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase.from("dashboard_preferences").upsert({ profile_id: userId, widget_keys: widgetKeys }, { onConflict: "profile_id" });
  if (error) throw new Error(`Dashboard 설정 저장 실패: ${error.message}`);
}

export async function getSearchScopes(): Promise<SearchScope[]> {
  const userId = await currentUserId();
  const { data, error } = await supabase.from("search_preferences").select("scopes").eq("profile_id", userId).maybeSingle();
  if (error) throw new Error(`검색 설정 조회 실패: ${error.message}`);
  const saved = (data?.scopes as SearchScope[] | undefined) ?? DEFAULT_SEARCH_SCOPES;
  const available = saved.filter((scope) => AVAILABLE_SEARCH_SCOPES.includes(scope));
  return available.length > 0 ? available : DEFAULT_SEARCH_SCOPES;
}

export async function saveSearchScopes(scopes: SearchScope[]): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase.from("search_preferences").upsert({ profile_id: userId, scopes }, { onConflict: "profile_id" });
  if (error) throw new Error(`검색 설정 저장 실패: ${error.message}`);
}
