import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";

export type AppRole = "ADMIN" | "INTERN" | "VIEWER";
export type UserStatus = "ACTIVE" | "INACTIVE";

export type UserProfile = {
  id: string;
  email: string | null;
  display_name: string;
  global_role: AppRole;
  status: UserStatus;
};

/**
 * 이메일과 비밀번호로 로그인합니다.
 */
export async function signIn(
  email: string,
  password: string
): Promise<Session> {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session) {
    throw new Error("로그인 세션을 생성하지 못했습니다.");
  }

  return data.session;
}

/**
 * 현재 사용자를 로그아웃합니다.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * 브라우저에 저장된 현재 로그인 세션을 확인합니다.
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { data, error } =
    await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

/**
 * 로그인한 사용자의 앱 프로필과 권한을 조회합니다.
 */
export async function getUserProfile(
  userId: string
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
        id,
        email,
        display_name,
        global_role,
        status
      `
    )
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(
      `사용자 프로필 조회 실패: ${error.message}`
    );
  }

  return data as UserProfile;
}