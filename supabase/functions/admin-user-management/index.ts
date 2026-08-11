import { createClient } from "https://esm.sh/@supabase/supabase-js@2.111.0";

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Response | Promise<Response>): void };

type AppRole = "ADMIN" | "INTERN" | "VIEWER";
type UserStatus = "ACTIVE" | "INACTIVE";
type RequestBody = {
  action?: "invite" | "password-reset" | "set-status";
  email?: string;
  displayName?: string;
  role?: AppRole;
  redirectTo?: string;
  userId?: string;
  status?: UserStatus;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const allowedRoles: AppRole[] = ["ADMIN", "INTERN", "VIEWER"];

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "허용되지 않은 요청입니다." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = request.headers.get("Authorization");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "서버 환경 설정이 누락되었습니다." }, 500);
    if (!authorization?.startsWith("Bearer ")) return json({ error: "로그인이 필요합니다." }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = authorization.slice(7);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "유효하지 않은 로그인입니다." }, 401);

    const actorId = userData.user.id;
    const { data: actor } = await admin.from("profiles").select("global_role,status").eq("id", actorId).single();
    if (!actor || actor.global_role !== "ADMIN" || actor.status !== "ACTIVE") return json({ error: "활성 관리자만 계정을 관리할 수 있습니다." }, 403);

    const body = await request.json() as RequestBody;
    if (body.action === "invite") {
      const email = body.email?.trim().toLowerCase();
      const displayName = body.displayName?.trim();
      const role = body.role;
      if (!email || !displayName || !role || !allowedRoles.includes(role)) return json({ error: "이메일, 표시 이름과 역할을 확인해주세요." }, 400);
      if (body.redirectTo) new URL(body.redirectTo);
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { display_name: displayName }, redirectTo: body.redirectTo });
      if (error || !data.user) return json({ error: error?.message ?? "초대 계정을 만들지 못했습니다." }, 400);
      const { error: profileError } = await admin.from("profiles").update({ display_name: displayName, global_role: role, status: "ACTIVE" }).eq("id", data.user.id);
      if (profileError) {
        await admin.auth.admin.deleteUser(data.user.id);
        return json({ error: "프로필 생성에 실패해 초대를 취소했습니다." }, 500);
      }
      await admin.from("audit_logs").insert({ entity_type: "auth_user", entity_id: data.user.id, action: "INVITE", changed_fields: ["email", "display_name", "global_role"], actor_id: actorId });
      return json({ success: true });
    }

    if (body.action === "password-reset") {
      if (!body.userId) return json({ error: "대상 사용자가 필요합니다." }, 400);
      if (body.redirectTo) new URL(body.redirectTo);
      const { data: target, error: targetError } = await admin.auth.admin.getUserById(body.userId);
      if (targetError || !target.user?.email) return json({ error: "대상 로그인 계정을 찾을 수 없습니다." }, 404);
      const { error } = await admin.auth.resetPasswordForEmail(target.user.email, { redirectTo: body.redirectTo });
      if (error) return json({ error: error.message }, 400);
      await admin.from("audit_logs").insert({ entity_type: "auth_user", entity_id: body.userId, action: "PASSWORD_RESET", changed_fields: ["password_reset_requested"], actor_id: actorId });
      return json({ success: true });
    }

    if (body.action === "set-status") {
      if (!body.userId || !body.status || !["ACTIVE", "INACTIVE"].includes(body.status)) return json({ error: "대상 사용자와 상태가 필요합니다." }, 400);
      if (body.userId === actorId) return json({ error: "현재 로그인한 관리자 계정은 직접 종료할 수 없습니다." }, 400);
      const { data: target } = await admin.from("profiles").select("global_role,status").eq("id", body.userId).single();
      if (!target) return json({ error: "대상 사용자 프로필을 찾을 수 없습니다." }, 404);
      if (target.global_role === "ADMIN" && target.status === "ACTIVE" && body.status === "INACTIVE") {
        const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("global_role", "ADMIN").eq("status", "ACTIVE");
        if ((count ?? 0) <= 1) return json({ error: "마지막 활성 관리자 계정은 종료할 수 없습니다." }, 400);
      }
      const banDuration = body.status === "INACTIVE" ? "876000h" : "none";
      const { error: authError } = await admin.auth.admin.updateUserById(body.userId, { ban_duration: banDuration });
      if (authError) return json({ error: authError.message }, 400);
      const { error: profileError } = await admin.from("profiles").update({ status: body.status }).eq("id", body.userId);
      if (profileError) {
        await admin.auth.admin.updateUserById(body.userId, { ban_duration: target.status === "ACTIVE" ? "none" : "876000h" });
        return json({ error: "프로필 상태 변경에 실패해 Auth 상태를 복구했습니다." }, 500);
      }
      await admin.from("audit_logs").insert({ entity_type: "auth_user", entity_id: body.userId, action: body.status === "ACTIVE" ? "ACTIVATE" : "DEACTIVATE", changed_fields: ["auth_ban", "status"], actor_id: actorId });
      return json({ success: true });
    }

    return json({ error: "지원하지 않는 계정 관리 작업입니다." }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "계정 관리 처리 중 오류가 발생했습니다." }, 500);
  }
});
