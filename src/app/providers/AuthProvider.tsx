import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getCurrentSession, getUserProfile, signIn, signOut, type UserProfile } from "../../services/authService";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const session = await getCurrentSession();
        if (!session) return;
        const nextProfile = await getUserProfile(session.user.id);
        if (nextProfile.status === "ACTIVE" && isMounted) setProfile(nextProfile);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const signOutCurrentUser = useCallback(async () => {
    await signOut();
    setProfile(null);
  }, []);

  const signInCurrentUser = useCallback(async (email: string, password: string) => {
    const session = await signIn(email, password);
    const nextProfile = await getUserProfile(session.user.id);
    if (nextProfile.status !== "ACTIVE") {
      await signOut();
      throw new Error("비활성화된 계정입니다.");
    }
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  const value = useMemo(() => ({ profile, isLoading, signInCurrentUser, signOutCurrentUser }), [profile, isLoading, signInCurrentUser, signOutCurrentUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
